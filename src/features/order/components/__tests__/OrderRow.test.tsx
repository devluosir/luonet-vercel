import { fireEvent, render, screen } from '@testing-library/react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { OrderRow } from '../OrderRow';

jest.mock('@/features/inquiry/utils/inquiryUtils', () => ({
  normalizeShortDateInput: (value: string) => `[${value}]`,
  stripDateBrackets: (value: string) => value.replace(/[[\]]/g, ''),
}));

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

function renderRow(record: InquiryRecord, onUpdate = jest.fn()) {
  render(
    <table>
      <tbody>
        <OrderRow
          record={record}
          bp="xl"
          canViewFinancials
          consigneeOptions={[]}
          onUpdate={onUpdate}
        />
      </tbody>
    </table>
  );
  return onUpdate;
}

describe('OrderRow 善后完成徽标与行背景', () => {
  it('善后S 未完成：订单编号旁显示 "S"，行背景为红色高亮', () => {
    const { container } = render(
      <table>
        <tbody>
          <OrderRow
            record={createRecord({ orderSubStatus: 'followup' })}
            bp="xl"
            canViewFinancials
            consigneeOptions={[]}
            onUpdate={jest.fn()}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.queryByText('-OK')).not.toBeInTheDocument();
    expect(container.querySelector('tr')).toHaveClass('bg-red-100');
  });

  it('善后S 已完成：订单编号旁显示 "S" + 绿色 "-OK"，行背景恢复正常（不再是红色）', () => {
    const { container } = render(
      <table>
        <tbody>
          <OrderRow
            record={createRecord({ orderSubStatus: 'followup', orderFollowupCompleted: true })}
            bp="xl"
            canViewFinancials
            consigneeOptions={[]}
            onUpdate={jest.fn()}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText('S')).toBeInTheDocument();
    const okBadge = screen.getByText('-OK');
    expect(okBadge).toHaveClass('text-green-500');
    const tr = container.querySelector('tr');
    expect(tr).not.toHaveClass('bg-red-100');
    expect(tr).not.toHaveClass('bg-gray-300');
    expect(tr).not.toHaveClass('bg-green-100');
  });
});

describe('OrderRow native date pickers', () => {
  it('passes undefined when row date and month pickers are cleared', () => {
    const onUpdate = renderRow(createRecord({
      orderDeliveryDate: '[7.20]',
      orderConfirmDate: '[7.18]',
      orderPaymentDate: '8',
    }));

    screen.getAllByLabelText('选择日期').forEach((input) => {
      fireEvent.click(input);
      fireEvent.change(input, { target: { value: '' } });
    });
    const monthInput = screen.getByLabelText('选择月份');
    fireEvent.click(monthInput);
    fireEvent.change(monthInput, { target: { value: '' } });

    expect(onUpdate).toHaveBeenNthCalledWith(1, { orderDeliveryDate: undefined });
    expect(onUpdate).toHaveBeenNthCalledWith(2, { orderConfirmDate: undefined });
    expect(onUpdate).toHaveBeenNthCalledWith(3, { orderPaymentDate: undefined });
  });

  it('keeps converting non-empty native date and month values', () => {
    const onUpdate = renderRow(createRecord());
    const [deliveryDateInput, confirmDateInput] = screen.getAllByLabelText('选择日期');

    fireEvent.change(deliveryDateInput, { target: { value: '2026-07-20' } });
    fireEvent.change(confirmDateInput, { target: { value: '2026-07-18' } });
    fireEvent.change(screen.getByLabelText('选择月份'), { target: { value: '2026-08' } });

    expect(onUpdate).toHaveBeenNthCalledWith(1, { orderDeliveryDate: '[7.20]' });
    expect(onUpdate).toHaveBeenNthCalledWith(2, { orderConfirmDate: '[7.18]' });
    expect(onUpdate).toHaveBeenNthCalledWith(3, { orderPaymentDate: '8' });
  });
});
