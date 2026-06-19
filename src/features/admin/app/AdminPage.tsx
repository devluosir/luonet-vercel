'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { AppLayout } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
import { useUsers } from '../hooks/useUsers';
import { UserStats } from '../components/UserStats';
import { UserList } from '../components/UserList';
import { CreateUserModal } from '../components/CreateUserModal';
import { UserDetailModal } from '../components/UserDetailModal';
import { User } from '../types';
import { D1MigrationPanel } from '../components/D1MigrationPanel';

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { user, handleLogout } = useAppUser();
  const { users, loading, error, fetchUsers, updateUserPermissions, clearError } = useUsers();

  const [permissionChecked, setPermissionChecked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const hasAdminPermission = useMemo(() => {
    return session?.user?.isAdmin === true;
  }, [session]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const checkPermissionsAndLoad = useCallback(async () => {
    try {
      if (status === 'loading') return;

      if (status === 'unauthenticated' || !session) {
        router.push('/');
        return;
      }

      if (!hasAdminPermission) {
        setPermissionChecked(true);
        return;
      }

      setPermissionChecked(true);
      await fetchUsers();
    } catch (error) {
      console.error('权限检查失败:', error);
    }
  }, [session, status, hasAdminPermission, router, fetchUsers]);

  useEffect(() => {
    if (!mounted) return;
    checkPermissionsAndLoad();
  }, [mounted, session, status, hasAdminPermission, router, checkPermissionsAndLoad]);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const handleSavePermissions = async (userId: string, permissions: any[], isAdmin: boolean, isActive: boolean) => {
    await updateUserPermissions(userId, permissions, isAdmin, isActive);
  };

  // ── 早返回（AppLayout 外部）──
  if (!mounted || loading || !permissionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <div className="text-lg">加载中...</div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  if (permissionChecked && !hasAdminPermission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
          <div className="mb-4 text-6xl text-red-600 dark:text-red-400">🚫</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">权限不足</h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">您没有管理员权限，无法访问此页面</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            返回仪表板
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="mb-2 text-lg font-medium text-red-600 dark:text-red-400">加载失败</div>
          <div className="text-gray-600 dark:text-gray-400">{error}</div>
          <button
            onClick={() => { clearError(); checkPermissionsAndLoad(); }}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // ── 主界面 ──
  return (
    <AppLayout
      breadcrumbs={[
        { label: '首页', path: '/dashboard' },
        { label: '管理后台' },
      ]}
      user={user}
      onLogout={handleLogout}
    >
      <div className="w-full max-w-none px-3 py-6 sm:px-4 lg:px-6">
        {/* 标题行 */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-4">
              <h1 className="flex items-center text-2xl font-bold text-gray-900 dark:text-white">
                <Users className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
                用户管理
              </h1>
              <UserStats users={users} />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">管理系统用户账户和权限</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            添加用户
          </button>
        </div>

        {/* 用户列表 */}
        <UserList
          users={users}
          loading={loading}
          onCreateUser={() => setShowCreateModal(true)}
          onEditUser={handleEditUser}
        />

        {/* D1 数据迁移 */}
        <D1MigrationPanel />
      </div>

      {/* 弹窗 */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchUsers()}
      />
      <UserDetailModal
        user={selectedUser}
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedUser(null); }}
        onSave={handleSavePermissions}
      />
    </AppLayout>
  );
}
