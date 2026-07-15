jest.mock('nanoid', () => ({ nanoid: () => 'mock-id' }));

import { fireEvent, render, screen } from '@testing-library/react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { OrderRow } from '../OrderRow';

function createRecord(overrides: Partial<InquiryRecord> = {}): InquiryRecord {
  return {
    id: 'order-1',
    inquiryDate: '2026-07-12',
    inquiryNo: 'RFQ-001',
    inquirer: '测试客户',
    customerNo: 'RFQ-CUSTOMER-001',
    description: '测试订单',
    orderNo: 'PO-001',
    supplierStatuses: [],
    quotedStatuses: [],
    createdAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z',
    ...overrides,
  };
}

function renderRow(
  item: InquiryRecord,
  options: { canBatchEdit?: boolean; selected?: boolean } = {}
) {
  const onOpenEdit = jest.fn();
  const onToggleSelect = jest.fn();
  const view = render(
    <table>
      <tbody>
        <OrderRow
          record={item}
          bp="xl"
          canViewFinancials
          onOpenEdit={onOpenEdit}
          canBatchEdit={options.canBatchEdit}
          selected={options.selected}
          onToggleSelect={onToggleSelect}
        />
      </tbody>
    </table>
  );
  return { ...view, onOpenEdit, onToggleSelect };
}

describe('OrderRow 整行弹窗编辑', () => {
  it('任意业务单元格点击只触发一次 onOpenEdit，且不渲染行内编辑控件', () => {
    const item = createRecord({
      orderDeliveryDate: '[7.20]',
      orderConfirmDate: '[7.18]',
      orderCustomerNo: 'PO-CUSTOMER-001',
      orderDeliveryStatus: '交货',
      orderDeliveryConsignee: '上海仓',
      orderAmount: '$1234.5',
      orderPaymentDate: '8',
      orderReceivedAmount: '$500',
    });
    const { container, onOpenEdit } = renderRow(item);
    const cells = container.querySelectorAll('td');

    [cells[1], cells[4], cells[6], cells[8]].forEach((cell) => fireEvent.click(cell));

    expect(onOpenEdit).toHaveBeenCalledTimes(4);
    expect(onOpenEdit).toHaveBeenLastCalledWith(item);
    expect(screen.queryByLabelText('选择日期')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('选择月份')).not.toBeInTheDocument();
    expect(container.querySelector('input[type="text"], input[type="number"], select')).not.toBeInTheDocument();
  });

  it('保留日期、客户订单号、执行情况、金额和回款月份的只读格式', () => {
    renderRow(createRecord({
      orderDeliveryDate: '[7.20]',
      orderConfirmDate: '[7.18]',
      orderCustomerNo: 'PO-CUSTOMER-001',
      orderDeliveryStatus: '交货',
      orderDeliveryConsignee: '上海仓',
      orderAmount: '$1234.5',
      orderPaymentDate: '8',
      orderReceivedAmount: '$500',
    }));

    expect(screen.getByText('7.20')).toBeInTheDocument();
    expect(screen.getByText('7.18')).toBeInTheDocument();
    expect(screen.getByText('PO-CUSTOMER-001')).toBeInTheDocument();
    expect(screen.getByText('交货')).toBeInTheDocument();
    expect(screen.getByText('上海仓')).toBeInTheDocument();
    expect(screen.getByText('$1,234.50')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
  });

  it('批量选择 checkbox 阻止行点击，只执行选择回调', () => {
    const item = createRecord();
    const { onOpenEdit, onToggleSelect } = renderRow(item, { canBatchEdit: true });

    fireEvent.click(screen.getByRole('checkbox', { name: '选择 PO-001' }));

    expect(onToggleSelect).toHaveBeenCalledWith(item.id);
    expect(onOpenEdit).not.toHaveBeenCalled();
  });
});

describe('OrderRow 善后完成徽标与行背景', () => {
  it('善后S 未完成：订单编号旁显示 S，行背景为红色高亮', () => {
    const { container } = renderRow(createRecord({ orderSubStatus: 'followup' }));
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.queryByText('-OK')).not.toBeInTheDocument();
    expect(container.querySelector('tr')).toHaveClass('bg-red-100');
  });

  it('善后S 已完成：显示 S-OK，行背景恢复正常', () => {
    const { container } = renderRow(createRecord({ orderSubStatus: 'followup', orderFollowupCompleted: true }));
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('-OK')).toHaveClass('text-green-500');
    const row = container.querySelector('tr');
    expect(row).not.toHaveClass('bg-red-100');
    expect(row).not.toHaveClass('bg-gray-300');
    expect(row).not.toHaveClass('bg-green-100');
  });
});
