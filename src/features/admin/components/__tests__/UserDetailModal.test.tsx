import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserDetailModal } from '../UserDetailModal';
import type { User } from '../../types';

jest.mock('@/components/ui/ConfirmDialog', () => ({
  useConfirm: () => jest.fn(),
}));

const user: User = {
  id: 'user-1',
  username: 'permission-test',
  email: null,
  status: true,
  isAdmin: false,
  lastLoginAt: null,
  createdAt: '2026-07-11T00:00:00.000Z',
  permissions: [
    { id: 'history-1', moduleId: 'history', canAccess: true },
  ],
};

describe('UserDetailModal history permission', () => {
  it('shows history as a disabled derived permission and updates it with document permissions', async () => {
    render(
      <UserDetailModal
        user={user}
        isOpen
        onClose={jest.fn()}
        onSave={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('“单据历史”根据本组其它单据类权限自动开启/关闭，无需单独设置'))
      .toBeInTheDocument();

    const historyOff = await screen.findByRole('button', { name: '开启单据历史权限' });
    expect(historyOff).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '开启外贸报价合同权限' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '关闭单据历史权限' })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: '关闭外贸报价合同权限' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '开启单据历史权限' })).toBeDisabled();
    });
  });
});
