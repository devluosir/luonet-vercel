'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { UserPlus, Users, Clock, Mail, User, Edit } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { usePermissionStore, validatePermissions } from '@/lib/permissions';

interface User {
  id: string;
  username: string;
  email: string | null;
  status: boolean;
  isAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // 使用权限store
  const { user: permissionUser, isAdmin } = usePermissionStore();

  // 初始化
  useEffect(() => {
    setMounted(true);
  }, []);

  // 权限检查和数据加载
  useEffect(() => {
    if (!mounted || status === 'loading') return;

    const checkPermissionsAndLoad = async () => {
      try {
        // 使用完整权限验证
        const hasAdminPermission = await validatePermissions.validateAdmin();
        if (!hasAdminPermission) {
          router.push('/dashboard');
          return;
        }

        // 加载用户列表
        await fetchUsers();
      } catch (error) {
        console.error('权限检查失败:', error);
        router.push('/dashboard');
      }
    };

    checkPermissionsAndLoad();
  }, [mounted, status, router]);

import { API_ENDPOINTS, apiRequestWithError } from '@/lib/api-config';

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequestWithError(API_ENDPOINTS.USERS.LIST);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      const response = await apiRequestWithError(API_ENDPOINTS.AUTH.SIGNOUT, {
        method: 'POST',
      });
      if (response) {
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };



  // 避免闪烁的加载状态
  if (!mounted || status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-600 dark:text-gray-400">加载中...</div>
        </div>
      </div>
    );
  }

  // 权限不足时直接返回null，避免闪烁
  if (!isAdmin()) {
    return null;
  }

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
            onClick={fetchUsers}
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
          username={session?.user?.name || 'Admin'}
          onLogout={handleLogout}
        />

        <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-8">
          {/* 标题和添加按钮 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Users className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
                用户管理
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                管理系统用户账户和权限
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center px-6 py-3 text-sm font-medium text-white 
                       bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl 
                       hover:from-blue-700 hover:to-purple-700 
                       shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                       transition-all duration-200"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              添加用户
            </button>
          </div>

          {/* 用户表格 */}
          <div className="bg-white dark:bg-[#1c1c1e] shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-[#2c2c2e]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      用户信息
                    </th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      邮箱
                    </th>
                    <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      最后登录
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-[#1c1c1e] divide-y divide-gray-200 dark:divide-gray-800">
                  {users.map((user, index) => (
                    <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-[#2c2c2e] transition-colors ${
                      index % 2 === 0 ? 'bg-white dark:bg-[#1c1c1e]' : 'bg-gray-50/50 dark:bg-[#1a1a1c]'
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm relative ${
                            user.isAdmin 
                              ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                              : 'bg-gradient-to-br from-gray-500 to-gray-600'
                          }`}>
                            {user.username.charAt(0).toUpperCase()}
                            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                              user.status ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.username}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              注册于 {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.email || '未设置'}
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.lastLoginAt ? (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            {new Date(user.lastLoginAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="italic">未登录</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 
                                   text-xs font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 
                                   transition-colors duration-200"
                        >
                          <Edit className="w-3 h-3 mr-1.5" />
                          编辑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 空状态 */}
            {users.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <div className="text-xl font-medium text-gray-900 dark:text-white mb-2">暂无用户</div>
                <div className="text-gray-500 dark:text-gray-400 mb-6">点击添加用户按钮创建第一个用户</div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  添加用户
                </button>
              </div>
            )}
          </div>
        </div>

        <CreateUserModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchUsers}
        />
      </div>
      <Footer />
    </div>
  );
}