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
