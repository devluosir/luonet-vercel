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

function renderRow(
  item: InquiryRecord,
  options: { bp?: 'sm' | 'lg'; canViewFinancials?: boolean } = {}
) {
  const onOpenEdit = jest.fn();
  const view = render(
    <table>
      <tbody>
        <PurchaseOrderRow
          record={item}
          bp={options.bp ?? 'lg'}
          canViewFinancials={options.canViewFinancials ?? false}
          onOpenEdit={onOpenEdit}
        />
      </tbody>
    </table>
  );
  return { ...view, onOpenEdit };
}

describe('PurchaseOrderRow', () => {
  it('点击采购单号、供应商、金额、交货日期和执行情况都只打开一次编辑弹窗', () => {
    const item = record({
      purchaseOrderAmount: '€1234.5',
      orderDeliveryDate: '[7.20]',
      orderDeliveryStatus: '交货',
      orderDeliveryConsignee: '上海仓',
    });
    const { onOpenEdit } = renderRow(item, { canViewFinancials: true });

    ['PROC-1', '供应商一、供应商二', '€1,234.50', '7.20', '交货'].forEach((text) => {
      fireEvent.click(screen.getByText(text));
    });

    expect(onOpenEdit).toHaveBeenCalledTimes(5);
    expect(onOpenEdit).toHaveBeenLastCalledWith(item);
    expect(screen.queryByLabelText('选择日期')).not.toBeInTheDocument();
    expect(document.querySelector('input, select')).not.toBeInTheDocument();
  });

  it('采购单号和全部供应商保持只读展示', () => {
    renderRow(record());
    expect(screen.getByText('供应商一、供应商二')).toHaveAttribute('title', '供应商一、供应商二');
    expect(screen.queryByDisplayValue('PROC-1')).not.toBeInTheDocument();
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
    renderRow(record(), { bp: 'sm' });
    expect(screen.queryByText('PROC-1')).not.toBeInTheDocument();
    expect(screen.getByText('供应商一、供应商二')).toBeInTheDocument();
  });
});
