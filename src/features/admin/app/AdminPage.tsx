import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Footer } from '@/components/Footer';
import { useSession, signOut } from 'next-auth/react';
import { useUsers } from '../hooks/useUsers';
import { UserStats } from '../components/UserStats';
import { UserFilters } from '../components/UserFilters';
import { UserList } from '../components/UserList';
import { CreateUserModal } from '../components/CreateUserModal';
import { UserDetailModal } from '../components/UserDetailModal';
import { User } from '../types';

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { users, loading, error, fetchUsers, updateUserPermissions, clearError } = useUsers();
  
  // 本地状态
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 管理员权限检查
  const hasAdminPermission = useMemo(() => {
    return session?.user?.isAdmin === true;
  }, [session]);

  // 初始化
  useEffect(() => {
    setMounted(true);
  }, []);

  // 权限检查和数据加载
  const checkPermissionsAndLoad = useCallback(async () => {
    try {
      // 等待session加载完成
      if (status === 'loading') {
        console.log('Session正在加载中...');
        return;
      }

      // 检查用户是否登录
      if (status === 'unauthenticated' || !session) {
        console.log('用户未认证，重定向到登录页');
        router.push('/');
        return;
      }
      
      // 检查管理员权限
      if (!hasAdminPermission) {
        console.log('用户不是管理员，拒绝访问');
        setPermissionChecked(true);
        return;
      }
      
      console.log('管理员权限检查通过:', { 
        user: session.user?.username, 
        isAdmin: hasAdminPermission 
      });

      // 标记权限检查完成
      setPermissionChecked(true);

      // 加载用户列表
      await fetchUsers();
    } catch (error) {
      console.error('权限检查失败:', error);
    }
  }, [session, status, hasAdminPermission, router, fetchUsers]);

  // 权限检查和数据加载
  useEffect(() => {
    if (!mounted) return;
    checkPermissionsAndLoad();
  }, [mounted, session, status, hasAdminPermission, router, checkPermissionsAndLoad]);

  // 过滤用户
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // 状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => 
        statusFilter === 'active' ? user.status : !user.status
      );
    }

    return filtered;
  }, [users, searchTerm, statusFilter]);

  // 处理登出
  const handleLogout = async () => {
    try {
      await signOut({ redirect: true, callbackUrl: '/' });
    } catch (error) {
      console.error('Logout failed:', error);
      router.push('/');
    }
  };

  // 编辑用户
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  // 保存权限
  const handleSavePermissions = async (userId: string, permissions: any[]) => {
    await updateUserPermissions(userId, permissions);
  };

  // 避免闪烁的加载状态
  if (!mounted || loading || !permissionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">加载中...</div>
        </div>
      </div>
    );
  }

  // 未登录状态
  if (status === 'unauthenticated') {
    return null;
  }

  // 权限不足时显示错误信息
  if (permissionChecked && !hasAdminPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center p-8 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            权限不足
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            您没有管理员权限，无法访问此页面
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回仪表板
          </button>
        </div>
      </div>
    );
  }

  // 显示错误信息
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center p-8 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">加载失败</div>
          <div className="text-gray-600 dark:text-gray-400">{error}</div>
          <button 
            onClick={() => {
              clearError();
              checkPermissionsAndLoad();
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-black">
      <div className="flex-1">
        <AdminHeader 
          username={session?.user?.username || '用户'}
          email={session?.user?.email || null}
          onLogout={handleLogout}
        />

        <div className="w-full max-w-none px-3 sm:px-4 lg:px-6 py-6">
          {/* 标题、统计信息和添加按钮 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Users className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
                  用户管理
                </h1>
                
                {/* 统计信息 */}
                <UserStats users={users} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                管理系统用户账户和权限
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white 
                       bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg 
                       hover:from-blue-700 hover:to-purple-700 
                       shadow-md hover:shadow-lg transform hover:-translate-y-0.5
                       transition-all duration-200"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              添加用户
            </button>
          </div>

          {/* 搜索和筛选 */}
          <UserFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />

          {/* 用户列表 */}
          <UserList
            users={users}
            filteredUsers={filteredUsers}
            loading={loading}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            onCreateUser={() => setShowCreateModal(true)}
            onEditUser={handleEditUser}
          />
        </div>

        {/* 弹窗 */}
        <CreateUserModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchUsers();
          }}
        />
        
        <UserDetailModal
          user={selectedUser}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
          onSave={handleSavePermissions}
        />
      </div>
      <Footer />
    </div>
  );
}
