import { memo } from 'react';

interface UserStatusBadgeProps {
  isAdmin: boolean;
  isActive: boolean;
  onToggleAdmin: () => void;
  onToggleActive: () => void;
  disabled?: boolean;
}

export const UserStatusBadge = memo(function UserStatusBadge({
  isAdmin,
  isActive,
  onToggleAdmin,
  onToggleActive,
  disabled = false
}: UserStatusBadgeProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {/* 用户类型 */}
      <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm">👤</span>
          <div className="text-left">
            <div className="font-medium text-gray-900 dark:text-white text-sm">用户类型</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {isAdmin ? '管理员' : '普通用户'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleAdmin}
          disabled={disabled}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 ${
            isAdmin 
              ? 'bg-blue-600' 
              : 'bg-gray-200 dark:bg-gray-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={`${isAdmin ? '关闭' : '开启'}管理员权限`}
        >
          <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            isAdmin ? 'translate-x-5' : 'translate-x-1'
          }`} />
        </button>
      </div>
      
      {/* 账户状态 */}
      <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm">🔒</span>
          <div className="text-left">
            <div className="font-medium text-gray-900 dark:text-white text-sm">账户状态</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {isActive ? '启用' : '禁用'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleActive}
          disabled={disabled}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 ${
            isActive 
              ? 'bg-green-600' 
              : 'bg-gray-200 dark:bg-gray-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={`${isActive ? '禁用' : '启用'}账户`}
        >
          <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            isActive ? 'translate-x-5' : 'translate-x-1'
          }`} />
        </button>
      </div>
    </div>
  );
});
