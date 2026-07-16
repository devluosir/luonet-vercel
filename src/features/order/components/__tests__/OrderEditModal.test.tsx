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

function renderModal(record: InquiryRecord, onSave = jest.fn(), canViewFinancials = false) {
  const props = {
    isOpen: true,
    record,
    canViewFinancials,
    consigneeOptions: [],
    onClose: jest.fn(),
    onSave,
  };
  const view = render(<OrderEditModal {...props} />);
  return { ...view, onSave, props };
}

describe('OrderEditModal layout', () => {
  it('removes the customer inquiry number and keeps the remaining read-only fields in two columns', () => {
    const { container } = renderModal(createRecord());

    expect(screen.queryByText('客户询价编号')).not.toBeInTheDocument();
    const readOnlyList = container.querySelector('dl');
    expect(readOnlyList).toHaveClass('grid', 'sm:grid-cols-2');
    expect(
      Array.from(readOnlyList?.querySelectorAll(':scope > div > dt') ?? []).map((item) => item.textContent)
    ).toEqual(['订单编号', '询价编号', '联络人', '内容简述']);
  });

  it('uses 75/25 and 50/25/25 field proportions when financials are visible', () => {
    renderModal(createRecord(), jest.fn(), true);

    const customerOrderField = screen.getByText('客户订单号').parentElement;
    const customerOrderGrid = customerOrderField?.parentElement;
    expect(customerOrderGrid).toHaveClass('grid', 'sm:grid-cols-4');
    expect(customerOrderField).toHaveClass('sm:col-span-3');
    expect(screen.getByText('金额').parentElement?.parentElement).toHaveClass('sm:col-span-1');

    const executionField = screen.getByText('执行情况').parentElement;
    const executionGrid = executionField?.parentElement;
    expect(executionGrid).toHaveClass('grid', 'sm:grid-cols-4');
    expect(executionField).toHaveClass('sm:col-span-2');
    expect(screen.getByText('回款月份').parentElement?.parentElement).toHaveClass('sm:col-span-1');
    expect(screen.getByText('到账金额').parentElement?.parentElement).toHaveClass('sm:col-span-1');
  });

  it('keeps the customer order and execution spans without rendering financial fields', () => {
    renderModal(createRecord());

    const customerOrderField = screen.getByText('客户订单号').parentElement;
    const executionField = screen.getByText('执行情况').parentElement;
    expect(customerOrderField).toHaveClass('sm:col-span-3');
    expect(customerOrderField?.parentElement?.children).toHaveLength(1);
    expect(executionField).toHaveClass('sm:col-span-2');
    expect(executionField?.parentElement?.children).toHaveLength(1);
    expect(screen.queryByText('金额')).not.toBeInTheDocument();
    expect(screen.queryByText('回款月份')).not.toBeInTheDocument();
    expect(screen.queryByText('到账金额')).not.toBeInTheDocument();
  });
});

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

describe('OrderEditModal 善后完成 checkbox', () => {
  it('未选中善后S 时不显示"善后完成" checkbox', () => {
    renderModal(createRecord());
    expect(screen.queryByText('善后完成')).not.toBeInTheDocument();
  });

  it('选中善后S 后显示 checkbox，勾选并保存后 patch 带 orderFollowupCompleted: true', () => {
    const onSave = jest.fn();
    renderModal(createRecord(), onSave);

    fireEvent.click(screen.getByRole('button', { name: '善后S' }));
    expect(screen.getByText('善后完成')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /善后完成/ }));
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch.orderSubStatus).toBe('followup');
    expect(patch.orderFollowupCompleted).toBe(true);
  });

  it('已是善后完成的记录打开时 checkbox 默认勾选，取消勾选并保存后 patch 清空该字段', () => {
    const onSave = jest.fn();
    renderModal(createRecord({ orderSubStatus: 'followup', orderFollowupCompleted: true }), onSave);

    const checkbox = screen.getByRole('checkbox', { name: /善后完成/ }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch.orderFollowupCompleted).toBeUndefined();
  });

  it('切换到其它状态（辙销C）后不再显示 checkbox，且保存时不带 orderFollowupCompleted', () => {
    const onSave = jest.fn();
    renderModal(createRecord({ orderSubStatus: 'followup', orderFollowupCompleted: true }), onSave);

    fireEvent.click(screen.getByRole('button', { name: '辙销C' }));
    expect(screen.queryByText('善后完成')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch.orderSubStatus).toBe('cancelled');
    expect(patch.orderFollowupCompleted).toBeUndefined();
  });

  it('用户未触碰状态区时（subStatus 未 dirty），保存 patch 不带 orderFollowupCompleted，不会用旧值覆盖后台同步的最新完成状态', () => {
    const onSave = jest.fn();
    renderModal(createRecord({ orderSubStatus: 'followup', orderFollowupCompleted: false }), onSave);

    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch).not.toHaveProperty('orderSubStatus');
    expect(patch).not.toHaveProperty('orderFollowupCompleted');
  });
});

describe('OrderEditModal native date pickers', () => {
  it('clears date and month fields when the native picker emits an empty value', () => {
    const onSave = jest.fn();
    renderModal(
      createRecord({
        orderDeliveryDate: '[7.20]',
        orderConfirmDate: '[7.18]',
        orderPaymentDate: '8',
      }),
      onSave,
      true
    );

    screen.getAllByLabelText(/^选择.*日期$/).forEach((input) => {
      fireEvent.click(input);
      fireEvent.change(input, { target: { value: '' } });
    });
    const monthInput = screen.getByLabelText('选择回款月份');
    fireEvent.click(monthInput);
    fireEvent.change(monthInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch.orderDeliveryDate).toBeUndefined();
    expect(patch.orderConfirmDate).toBeUndefined();
    expect(patch.orderPaymentDate).toBeUndefined();
  });

  it('keeps converting non-empty native date and month values', () => {
    const onSave = jest.fn();
    renderModal(createRecord(), onSave, true);

    const [deliveryDateInput, confirmDateInput] = screen.getAllByLabelText(/^选择.*日期$/);
    fireEvent.change(deliveryDateInput, { target: { value: '2026-07-20' } });
    fireEvent.change(confirmDateInput, { target: { value: '2026-07-18' } });
    fireEvent.change(screen.getByLabelText('选择回款月份'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch.orderDeliveryDate).toBe('[7.20]');
    expect(patch.orderConfirmDate).toBe('[7.18]');
    expect(patch.orderPaymentDate).toBe('8');
  });
});
