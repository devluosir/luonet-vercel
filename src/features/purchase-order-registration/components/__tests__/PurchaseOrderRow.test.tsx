jest.mock('nanoid', () => ({ nanoid: () => 'mock-id' }));

import { fireEvent, render, screen } from '@testing-library/react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { PurchaseOrderRow } from '../PurchaseOrderRow';

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
    purchaseOrderSuppliers: [
      { id: 'supplier-1', name: '供应商一' },
      { name: '供应商二' },
    ],
    supplierStatuses: [],
    quotedStatuses: [],
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
    ...overrides,
  };
}

function renderRow(item: InquiryRecord, bp: 'sm' | 'lg' = 'lg', onOpenEdit = jest.fn()) {
  render(
    <table>
      <tbody>
        <PurchaseOrderRow
          record={item}
          bp={bp}
          canViewFinancials={false}
          consigneeOptions={[]}
          onUpdate={jest.fn()}
          onOpenEdit={onOpenEdit}
        />
      </tbody>
    </table>
  );
  return onOpenEdit;
}

describe('PurchaseOrderRow', () => {
  it('采购单号和全部供应商只读展示，点击均打开编辑弹窗', () => {
    const item = record();
    const onOpenEdit = renderRow(item);

    expect(screen.getByText('供应商一、供应商二')).toHaveAttribute('title', '供应商一、供应商二');
    expect(screen.queryByDisplayValue('PROC-1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('PROC-1'));
    fireEvent.keyDown(screen.getByText('供应商一、供应商二'), { key: 'Enter' });
    expect(onOpenEdit).toHaveBeenCalledTimes(2);
    expect(onOpenEdit).toHaveBeenLastCalledWith(item);
  });

  it('旧单值供应商仍可回退显示', () => {
    renderRow(record({
      purchaseOrderSuppliers: undefined,
      purchaseOrderSupplier: '旧供应商',
      purchaseOrderSupplierId: 'legacy-id',
    }));
    expect(screen.getByText('旧供应商')).toBeInTheDocument();
  });

  it('小屏继续隐藏采购单号列', () => {
    renderRow(record(), 'sm');
    expect(screen.queryByText('PROC-1')).not.toBeInTheDocument();
    expect(screen.getByText('供应商一、供应商二')).toBeInTheDocument();
  });
});
