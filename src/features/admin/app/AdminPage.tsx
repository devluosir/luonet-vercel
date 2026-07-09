'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { AppLayout } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
import { useUsers } from '../hooks/useUsers';
import { UserList } from '../components/UserList';
import { UserStats } from '../components/UserStats';
import { CreateUserModal } from '../components/CreateUserModal';
import { UserDetailModal } from '../components/UserDetailModal';
import { Button } from '@/components/ui/Button';
import type { User } from '../types';

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { user, handleLogout } = useAppUser();
  const { users, loading, error, fetchUsers, updateUserPermissions, deleteUser, clearError } = useUsers();

  const [ready, setReady] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const isAdmin = session?.user?.isAdmin === true;

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.push('/'); return; }
    setReady(true);
    if (session?.user?.isAdmin) void fetchUsers();
  }, [status, session, router, fetchUsers]);

  const handleSave = useCallback(
    async (userId: string, permissions: User['permissions'], isAdm: boolean, isAct: boolean) => {
      await updateUserPermissions(userId, permissions, isAdm, isAct);
    },
    [updateUserPermissions]
  );

  const handleDelete = useCallback(
    async (targetUser: User) => {
      if (targetUser.id === session?.user?.id) {
        throw new Error('不能删除当前登录用户');
      }

      await deleteUser(targetUser.id);
      setSelectedUser(null);
    },
    [deleteUser, session?.user?.id]
  );

  // ── 加载 / 鉴权 早返回 ──────────────────────────────
  if (status === 'loading' || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
          <div className="mb-4 text-5xl">🚫</div>
          <h1 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">权限不足</h1>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">您没有管理员权限</p>
          <Button
            onClick={() => router.push('/dashboard')}
          >
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: '首页', path: '/dashboard' },
        { label: '用户管理' },
      ]}
      user={user}
      onLogout={handleLogout}
    >
      <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">

        {/* ── 页头 ── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">用户管理</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              管理团队成员账号、模块权限与登录状态
            </p>
          </div>
          <div className="flex items-center gap-4">
            {!loading && <UserStats users={users} />}
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
            >
              <UserPlus className="h-4 w-4" />
              添加用户
            </Button>
          </div>
        </div>

        {/* ── 错误提示 ── */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
            <span>{error}</span>
            <button
              onClick={() => { clearError(); void fetchUsers(); }}
              className="ml-4 font-medium underline hover:no-underline"
            >
              重试
            </button>
          </div>
        )}

        {/* ── 用户列表 ── */}
        <UserList
          users={users}
          loading={loading}
          onCreateUser={() => setShowCreateModal(true)}
          onEditUser={setSelectedUser}
        />
      </div>

      {/* ── 弹窗 ── */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => void fetchUsers()}
      />
      <UserDetailModal
        user={selectedUser}
        isOpen={selectedUser !== null}
        onClose={() => setSelectedUser(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        currentUserId={session?.user?.id}
      />
    </AppLayout>
  );
}
