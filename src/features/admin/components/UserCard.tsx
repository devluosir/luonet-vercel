'use client';

import { Clock, ChevronRight } from 'lucide-react';
import type { User } from '../types';

function fmtDate(iso: string | null): string {
  if (!iso) return '从未登录';
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  });
}

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  const initial = user.username.charAt(0).toUpperCase();
  const enabledModules = user.permissions.filter((p) => p.canAccess).length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(user)}
      onKeyDown={(e) => e.key === 'Enter' && onEdit(user)}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
    >
      {/* Avatar + 在线点 */}
      <div className="relative shrink-0">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${
          user.isAdmin
            ? 'bg-blue-500'
            : 'bg-gray-400 dark:bg-gray-500'
        }`}>
          {initial}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#1c1c1e] ${
          user.status ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
        }`} />
      </div>

      {/* 用户名 + 邮箱 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {user.username}
          </span>
          {user.isAdmin && (
            <span className="shrink-0 rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
              管理员
            </span>
          )}
          {!user.status && (
            <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-500 dark:bg-red-900/20 dark:text-red-400">
              已禁用
            </span>
          )}
        </div>
        <p className="truncate text-xs text-gray-400 dark:text-gray-500">
          {user.email || '—'}
        </p>
      </div>

      {/* 权限数量 */}
      <div className="hidden shrink-0 text-right sm:block">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {user.isAdmin ? '全部权限' : `${enabledModules} 个模块`}
        </span>
      </div>

      {/* 最后登录 */}
      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <Clock className="h-3 w-3 text-gray-300 dark:text-gray-600" />
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {fmtDate(user.lastLoginAt)}
        </span>
      </div>

      {/* 进入箭头 */}
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
    </div>
  );
}
