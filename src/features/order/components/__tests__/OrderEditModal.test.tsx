import { fireEvent, render, screen } from '@testing-library/react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { OrderEditModal } from '../OrderEditModal';

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

function renderModal(record: InquiryRecord, onSave = jest.fn()) {
  const props = {
    isOpen: true,
    record,
    canViewFinancials: false,
    consigneeOptions: [],
    onClose: jest.fn(),
    onSave,
  };
  const view = render(<OrderEditModal {...props} />);
  return { ...view, onSave, props };
}

describe('OrderEditModal concurrent record refresh', () => {
  it('keeps typed form values and does not save untouched stale sub-status fields', () => {
    const initial = createRecord({ orderDeliveryStatus: '备货', orderSubStatus: 'cancelled' });
    const { rerender, onSave, props } = renderModal(initial);

    fireEvent.change(screen.getByLabelText('执行情况'), { target: { value: '等待船期确认' } });

    const refreshed = createRecord({
      orderDeliveryStatus: '后台更新的执行情况',
      orderSubStatus: 'followup',
      orderSubStatusRemark: '另一标签页更新',
      updatedAt: '2026-07-12T00:01:00.000Z',
    });
    rerender(<OrderEditModal {...props} record={refreshed} />);

    expect(screen.getByLabelText('执行情况')).toHaveValue('等待船期确认');
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch.orderDeliveryStatus).toBe('等待船期确认');
    expect(patch).not.toHaveProperty('orderSubStatus');
    expect(patch).not.toHaveProperty('orderSubStatusRemark');
  });

  it('saves a sub-status explicitly selected by the user after a refresh', () => {
    const { rerender, onSave, props } = renderModal(createRecord());

    fireEvent.click(screen.getByRole('button', { name: '辙销C' }));
    fireEvent.change(screen.getByPlaceholderText('简要说明当前情况，例如客户暂缓、等待确认、需善后处理'), {
      target: { value: '客户取消' },
    });

    rerender(
      <OrderEditModal
        {...props}
        record={createRecord({ orderSubStatus: 'followup', orderSubStatusRemark: '后台善后' })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch.orderSubStatus).toBe('cancelled');
    expect(patch.orderSubStatusRemark).toBe('客户取消');
  });
});
