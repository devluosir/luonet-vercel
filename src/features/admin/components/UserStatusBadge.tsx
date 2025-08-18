import { memo } from 'react';

interface UserStatusBadgeProps {
  isAdmin: boolean;
  isActive: boolean;
}

export const UserStatusBadge = memo(function UserStatusBadge({
  isAdmin,
  isActive
}: UserStatusBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isAdmin 
          ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
      }`}>
        {isAdmin ? '管理员' : '普通用户'}
      </span>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
          : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
      }`}>
        {isActive ? '活跃' : '非活跃'}
      </span>
    </div>
  );
});
