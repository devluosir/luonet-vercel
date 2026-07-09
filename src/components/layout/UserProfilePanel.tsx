'use client';

import { useState, type FormEvent } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { PermissionRefreshButton } from '@/components/PermissionRefreshButton';
import { ThemeCompactToggle } from '@/components/ThemeToggle';
import { apiRequestWithError, API_ENDPOINTS } from '@/lib/api-config';

export interface UserProfilePanelProps {
  user: {
    name: string;
    email?: string | null;
  };
  className?: string;
  /** 改密表单展开/收起时回调，供外层（如桌面端 hover 子菜单）判断是否要暂缓自动收起 */
  onChangePasswordToggle?: (open: boolean) => void;
  /**
   * compact：桌面端 hover 子菜单里的紧凑排版（默认）
   * sheet：移动端弹窗里的宽松排版（居中头像 + 大字号 + 独立改密按钮）
   */
  layout?: 'compact' | 'sheet';
}

/**
 * 用户资料 + 改密面板。
 * 从 AppUserMenu 提取而来，供桌面端下拉菜单与移动端"我"浮动菜单共用，
 * 避免两处各写一份改密逻辑。
 */
export function UserProfilePanel({
  user,
  className = '',
  onChangePasswordToggle,
  layout = 'compact',
}: UserProfilePanelProps) {
  const [showChangePassword, setShowChangePasswordState] = useState(false);
  const setShowChangePassword = (value: boolean) => {
    setShowChangePasswordState(value);
    onChangePasswordToggle?.(value);
  };
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('请完整填写所有字段');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('新密码与确认密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('新密码长度至少6位');
      return;
    }
    setPasswordLoading(true);
    try {
      await apiRequestWithError(API_ENDPOINTS.USERS.CHANGE_PASSWORD, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordSuccess('密码修改成功');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '修改密码失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  const isSheet = layout === 'sheet';
  const inputClassName = isSheet
    ? 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
    : 'w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white';

  return (
    <div className={`${isSheet ? 'space-y-4' : 'space-y-2.5'} ${className}`}>
      {isSheet ? (
        <div className="flex flex-col items-center gap-1 text-center">
          <Avatar name={user.name} size={56} />
          <span className="mt-1 max-w-full truncate text-base font-semibold leading-tight text-gray-900 dark:text-white">
            {user.name}
          </span>
          {user.email && (
            <span className="max-w-full truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
          )}
          <button
            type="button"
            onClick={() => {
              setShowChangePassword(!showChangePassword);
              setPasswordError(null);
              setPasswordSuccess(null);
            }}
            className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800/50"
          >
            {showChangePassword ? '收起改密' : '修改密码'}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="max-w-[9.5rem] truncate text-sm font-semibold leading-tight text-gray-900 dark:text-white">
              {user.name}
            </span>
            <button
              type="button"
              onClick={() => {
                setShowChangePassword(!showChangePassword);
                setPasswordError(null);
                setPasswordSuccess(null);
              }}
              className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showChangePassword ? '收起' : '修改密码'}
            </button>
          </div>
          {user.email && (
            <div className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
          )}
        </div>
      )}

      <div className={showChangePassword ? 'block' : 'hidden'}>
        <form onSubmit={handleChangePassword} className={isSheet ? 'space-y-2.5' : 'space-y-2'}>
          {passwordError && (
            <div className={isSheet ? 'text-xs text-red-600 dark:text-red-400' : 'text-[11px] text-red-600 dark:text-red-400'}>
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className={isSheet ? 'text-xs text-green-600 dark:text-green-400' : 'text-[11px] text-green-600 dark:text-green-400'}>
              {passwordSuccess}
            </div>
          )}
          <input
            type="password"
            placeholder="当前密码"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            className={inputClassName}
            autoComplete="current-password"
            required
          />
          <input
            type="password"
            placeholder="新密码（至少6位）"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            className={inputClassName}
            autoComplete="new-password"
            required
          />
          <input
            type="password"
            placeholder="确认新密码"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            className={inputClassName}
            autoComplete="new-password"
            required
          />
          <div className={`flex items-center gap-2 ${isSheet ? 'pt-1' : ''}`}>
            <button
              type="submit"
              disabled={passwordLoading}
              className={
                isSheet
                  ? `flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white ${
                      passwordLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    }`
                  : `rounded px-2.5 py-1 text-xs text-white ${
                      passwordLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    }`
              }
            >
              {passwordLoading ? '提交中...' : '保存'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowChangePassword(false);
                setPasswordError(null);
                setPasswordSuccess(null);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
              className={
                isSheet
                  ? 'flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50'
                  : 'rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50'
              }
            >
              取消
            </button>
          </div>
        </form>
      </div>

      <div className={`border-t border-gray-200 dark:border-gray-700 ${isSheet ? 'pt-3' : 'pt-1'}`}>
        <div className={`flex items-center justify-between text-gray-600 dark:text-gray-300 ${isSheet ? 'text-sm' : 'text-xs'}`}>
          <div className="flex items-center">
            <SlidersHorizontal className={isSheet ? 'mr-2 h-4 w-4' : 'mr-1.5 h-3.5 w-3.5'} />
            <span>账户工具</span>
          </div>
          <div className="flex items-center gap-1">
            <PermissionRefreshButton variant="icon" />
            <ThemeCompactToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
