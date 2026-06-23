'use client';

import { UserPlus } from 'lucide-react';
import { UserCard } from './UserCard';
import type { User } from '../types';

interface UserListProps {
  users: User[];
  loading: boolean;
  onCreateUser: () => void;
  onEditUser: (user: User) => void;
}

/** 骨架行 */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-40 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="hidden h-3 w-16 rounded bg-gray-100 dark:bg-gray-800 sm:block" />
      <div className="hidden h-3 w-20 rounded bg-gray-100 dark:bg-gray-800 md:block" />
      <div className="h-4 w-4 rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

export function UserList({ users, loading, onCreateUser, onEditUser }: UserListProps) {
  const container = 'overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#1c1c1e]';

  if (loading) {
    return (
      <div className={container}>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className={`${container} flex flex-col items-center justify-center py-16 text-center`}>
        <p className="text-sm font-medium text-gray-900 dark:text-white">暂无用户</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">点击&ldquo;添加用户&rdquo;创建第一个账户</p>
        <button
          onClick={onCreateUser}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          添加用户
        </button>
      </div>
    );
  }

  return (
    <div className={container}>
      {/* 列标题（中屏以上显示） */}
      <div className="hidden items-center gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-2 dark:border-gray-800 dark:bg-gray-900/40 sm:flex">
        <div className="w-9 shrink-0" />
        <span className="flex-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">用户</span>
        <span className="hidden w-20 shrink-0 text-right text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 sm:block">权限</span>
        <span className="hidden w-28 shrink-0 text-right text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 md:block">最后登录</span>
        <div className="w-4 shrink-0" />
      </div>

      {/* 用户行 */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {users.map((user) => (
          <UserCard key={user.id} user={user} onEdit={onEditUser} />
        ))}
      </div>
    </div>
  );
}
