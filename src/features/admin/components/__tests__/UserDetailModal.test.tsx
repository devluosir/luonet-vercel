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
    expect(screen.getByRole('button', { name: '管理员' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '账户' })).toBeEnabled();

    const historyOff = await screen.findByRole('button', { name: '开启单据历史权限' });
    expect(historyOff).toBeDisabled();
    expect(screen.getByRole('button', { name: '开启采购订单表金额权限' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '开启外贸报价合同权限' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '关闭单据历史权限' })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: '关闭外贸报价合同权限' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '开启单据历史权限' })).toBeDisabled();
    });
  });

  it('keeps the current user admin and account toggles disabled in the compact header', () => {
    render(
      <UserDetailModal
        user={user}
        isOpen
        onClose={jest.fn()}
        onSave={jest.fn()}
        onDelete={jest.fn()}
        currentUserId={user.id}
      />
    );

    expect(screen.getByRole('button', {
      name: '不能修改自己的管理员身份，请让其他管理员操作',
    })).toBeDisabled();
    expect(screen.getByRole('button', { name: '不能禁用当前登录用户' })).toBeDisabled();
    expect(screen.queryByText('账户设置')).not.toBeInTheDocument();
    expect(screen.queryByText('管理员身份只控制后台管理入口，业务模块仍按以下开关授权'))
      .not.toBeInTheDocument();
  });
});
