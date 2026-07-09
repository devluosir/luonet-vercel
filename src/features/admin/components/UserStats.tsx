import { Users, UserCheck, UserX, Shield, User } from 'lucide-react';
import { User as UserType } from '../types';

interface UserStatsProps {
  users: UserType[];
}

export function UserStats({ users }: UserStatsProps) {
  // 计算统计数据
  const stats = {
    total: users.length,
    active: users.filter(u => u.status).length,
    inactive: users.filter(u => !u.status).length,
    admin: users.filter(u => u.isAdmin).length,
    user: users.filter(u => !u.isAdmin).length,
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-[#1c1c1e]">
      <div className="flex items-center gap-1.5 text-sm" title="用户总数">
        <div className="p-1 bg-blue-100 dark:bg-blue-900/20 rounded-full">
          <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
        </div>
        <span className="font-medium text-gray-700 dark:text-gray-300">{stats.total}</span>
      </div>

      <div className="h-4 w-px bg-gray-100 dark:bg-gray-800" />

      <div className="flex items-center gap-1.5 text-sm" title="已启用">
        <div className="p-1 bg-green-100 dark:bg-green-900/20 rounded-full">
          <UserCheck className="w-3 h-3 text-green-600 dark:text-green-400" />
        </div>
        <span className="font-medium text-gray-700 dark:text-gray-300">{stats.active}</span>
      </div>

      <div className="flex items-center gap-1.5 text-sm" title="已禁用">
        <div className="p-1 bg-red-100 dark:bg-red-900/20 rounded-full">
          <UserX className="w-3 h-3 text-red-600 dark:text-red-400" />
        </div>
        <span className="font-medium text-gray-700 dark:text-gray-300">{stats.inactive}</span>
      </div>

      <div className="h-4 w-px bg-gray-100 dark:bg-gray-800" />

      <div className="flex items-center gap-1.5 text-sm" title="管理员">
        <div className="p-1 bg-purple-100 dark:bg-purple-900/20 rounded-full">
          <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />
        </div>
        <span className="font-medium text-gray-700 dark:text-gray-300">{stats.admin}</span>
      </div>

      <div className="flex items-center gap-1.5 text-sm" title="普通用户">
        <div className="p-1 bg-gray-100 dark:bg-gray-900/20 rounded-full">
          <User className="w-3 h-3 text-gray-600 dark:text-gray-400" />
        </div>
        <span className="font-medium text-gray-700 dark:text-gray-300">{stats.user}</span>
      </div>
    </div>
  );
}
