jest.mock('nanoid', () => ({ nanoid: () => 'mock-id' }));

jest.mock('@/features/inquiry/services/inquiry.service', () => ({
  inquiryService: {
    getAll: () => [],
    save: jest.fn(),
    update: (records: unknown[]) => records,
    patchInD1: jest.fn(),
    updateInD1: jest.fn(),
    syncToD1: jest.fn(),
  },
}));

jest.mock('@/features/purchase-supplier/components/PurchaseSupplierPicker', () => ({
  PurchaseSupplierPicker: ({
    value,
    onChange,
    onEnter,
  }: {
    value: string;
    onChange: (selection: { id?: string; name: string }) => void;
    onEnter?: () => void;
  }) => (
    <div>
      <input
        aria-label="新增供应商"
        value={value}
        onChange={(event) => onChange({ name: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onEnter?.();
        }}
      />
      <button type="button" onClick={() => onChange({ id: 'master-2', name: '主数据供应商' })}>
        添加主数据供应商
      </button>
    </div>
  ),
}));

import { act, fireEvent, render, screen } from '@testing-library/react';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import type { InquiryRecord } from '@/features/inquiry/types';
import { PurchaseOrderEditModal } from '../PurchaseOrderEditModal';

function record(overrides: Partial<InquiryRecord> = {}): InquiryRecord {
  return {
    id: 'r1',
    inquiryDate: '2026-07-15',
    inquiryNo: 'C260715F',
    inquirer: '张三',
    customerNo: 'RFQ-1',
    description: '测试采购订单',
    orderNo: 'FL2601',
    purchaseOrderNo: 'PROC-1',
    purchaseOrderSupplier: '旧供应商',
    purchaseOrderSupplierId: 'legacy-id',
    supplierStatuses: [],
    quotedStatuses: [],
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('PurchaseOrderEditModal', () => {
  it('只读信息按两组三列排序，移除客户询价编号，订单状态标记独立展示', () => {
    const item = record({
      orderCustomerNo: 'PO-CUSTOMER-1',
      orderConfirmDate: '[7.16]',
      orderSubStatus: 'followup',
      orderSubStatusRemark: '等待补件',
    });
    act(() => useInquiryStore.setState({ records: [item] }));
    render(
      <PurchaseOrderEditModal
        isOpen
        recordId={item.id}
        canViewFinancials
        consigneeOptions={[]}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    expect(screen.queryByText('客户询价编号')).not.toBeInTheDocument();

    const firstInfoRow = screen.getByText('订单编号').parentElement?.parentElement;
    const secondInfoRow = screen.getByText('内容描述').parentElement?.parentElement;
    expect(firstInfoRow).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-3');
    expect(secondInfoRow).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-3');
    expect(Array.from(firstInfoRow?.children ?? []).map((item) => item.querySelector('dt')?.textContent)).toEqual([
      '订单编号',
      '询价编号',
      '联络人',
    ]);
    expect(Array.from(secondInfoRow?.children ?? []).map((item) => item.querySelector('dt')?.textContent)).toEqual([
      '内容描述',
      '客户订单号',
      '确认日期',
    ]);

    const statusItem = screen.getByText('订单状态标记').parentElement;
    expect(statusItem?.parentElement?.tagName).toBe('DL');
    expect(screen.getByText('善后S')).toHaveClass('text-red-500');
    expect(screen.getByText('等待补件')).toBeInTheDocument();
  });

  it('交货日期、采购金额、执行情况按三列顺序排列', () => {
    const item = record();
    act(() => useInquiryStore.setState({ records: [item] }));
    render(
      <PurchaseOrderEditModal
        isOpen
        recordId={item.id}
        canViewFinancials
        consigneeOptions={[]}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    const editableGrid = screen.getByText('执行情况').parentElement?.parentElement;
    expect(editableGrid).toHaveClass('grid', 'grid-cols-2', 'sm:grid-cols-12');
    expect(Array.from(editableGrid?.children ?? []).map((item) => item.querySelector('label')?.textContent)).toEqual([
      '交货日期',
      '采购金额',
      '执行情况',
    ]);
    expect(editableGrid?.children[0]).toHaveClass('sm:col-span-3');
    expect(editableGrid?.children[1]).toHaveClass('sm:col-span-3');
    expect(editableGrid?.children[2]).toHaveClass('col-span-2', 'sm:col-span-6');
  });

  it('无财务权限时三列容器仅渲染交货日期和执行情况', () => {
    const item = record();
    act(() => useInquiryStore.setState({ records: [item] }));
    render(
      <PurchaseOrderEditModal
        isOpen
        recordId={item.id}
        canViewFinancials={false}
        consigneeOptions={[]}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    const editableGrid = screen.getByText('执行情况').parentElement?.parentElement;
    expect(editableGrid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-12');
    expect(Array.from(editableGrid?.children ?? []).map((item) => item.querySelector('label')?.textContent)).toEqual([
      '交货日期',
      '执行情况',
    ]);
    expect(editableGrid?.children[0]).toHaveClass('sm:col-span-4');
    expect(editableGrid?.children[1]).toHaveClass('sm:col-span-8');
    expect(screen.queryByText('采购金额')).not.toBeInTheDocument();
  });

  it('旧供应商可显示，并能连续加入主数据与自由供应商后原子保存', () => {
    const item = record();
    const onSave = jest.fn();
    act(() => useInquiryStore.setState({ records: [item] }));
    render(
      <PurchaseOrderEditModal
        isOpen
        recordId={item.id}
        canViewFinancials={false}
        consigneeOptions={[]}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );

    expect(screen.getByText('旧供应商')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '添加主数据供应商' }));
    fireEvent.change(screen.getByRole('textbox', { name: '新增供应商' }), {
      target: { value: '自由供应商' },
    });
    fireEvent.keyDown(screen.getByRole('textbox', { name: '新增供应商' }), { key: 'Enter' });

    expect(screen.getByText('主数据供应商')).toBeInTheDocument();
    expect(screen.getByText('自由供应商')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '新增供应商' })).toHaveValue('');

    fireEvent.change(screen.getByPlaceholderText('采购单号'), { target: { value: 'PROC-2' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    expect(onSave).toHaveBeenCalledWith(item.id, {
      purchaseOrderNo: 'PROC-2',
      purchaseOrderSuppliers: [
        { id: 'legacy-id', name: '旧供应商' },
        { id: 'master-2', name: '主数据供应商' },
        { name: '自由供应商' },
      ],
      purchaseOrderSupplier: '旧供应商',
      purchaseOrderSupplierId: 'legacy-id',
    });
  });

  it('可单独移除供应商且同名供应商不会重复添加', () => {
    const item = record({
      purchaseOrderSuppliers: [{ id: 'master-2', name: '主数据供应商' }],
    });
    const onSave = jest.fn();
    act(() => useInquiryStore.setState({ records: [item] }));
    render(
      <PurchaseOrderEditModal
        isOpen
        recordId={item.id}
        canViewFinancials={false}
        consigneeOptions={[]}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '添加主数据供应商' }));
    expect(screen.getAllByText('主数据供应商')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '移除供应商主数据供应商' }));
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    expect(onSave).toHaveBeenCalledWith(item.id, {
      purchaseOrderSuppliers: [],
      purchaseOrderSupplier: undefined,
      purchaseOrderSupplierId: undefined,
    });
  });
});
