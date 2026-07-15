jest.mock('../../hooks/usePurchaseSupplierAccess', () => ({
  usePurchaseSupplierAccess: () => ({ canRead: true, userId: 'user-1' }),
}));

jest.mock('../../services/purchaseSupplierService', () => ({
  fetchPurchaseSuppliers: jest.fn().mockResolvedValue({
    items: [{ id: 'supplier-1', name: '供应商一', shortName: '供一' }],
  }),
  getPrimaryPurchaseSupplierContact: () => null,
}));

import { fireEvent, render, screen } from '@testing-library/react';
import { PurchaseSupplierPicker } from '../PurchaseSupplierPicker';

describe('PurchaseSupplierPicker', () => {
  it('默认选中后仍把供应商名称填回输入框', async () => {
    const onChange = jest.fn();
    render(<PurchaseSupplierPicker value="" onChange={onChange} />);

    fireEvent.focus(screen.getByRole('textbox'));
    fireEvent.click(await screen.findByRole('button', { name: /供一/ }));

    expect(screen.getByRole('textbox')).toHaveValue('供一');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'supplier-1', name: '供一' }));
  });

  it('clearOnSelect 会清空输入框，Enter 会提交自由文本', async () => {
    const onChange = jest.fn();
    const onEnter = jest.fn();
    render(
      <PurchaseSupplierPicker
        value=""
        onChange={onChange}
        clearOnSelect
        onEnter={onEnter}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.click(await screen.findByRole('button', { name: /供一/ }));
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value: '自由供应商' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onEnter).toHaveBeenCalledTimes(1);
  });
});
