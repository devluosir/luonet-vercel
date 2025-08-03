'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX, 
  Shield, 
  User,
  Mail,
  Clock
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { Footer } from '@/components/Footer';
import { API_ENDPOINTS, apiRequestWithError } from '@/lib/api-config';

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
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [user, setUser] = useState<any>(null);

  // 管理员权限检查 - 使用localStorage，与dashboard保持一致
  const hasAdminPermission = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isAdmin') === 'true';
    }
    return false;
  }, []);

  // 初始化
  useEffect(() => {
    setMounted(true);
  }, []);

  // 初始化用户信息
  useEffect(() => {
    setMounted(true);
    
    // 从localStorage恢复用户信息，与dashboard保持一致
    if (typeof window !== 'undefined') {
      const username = localStorage.getItem('username');
      const userId = localStorage.getItem('userId');
      const isAdmin = localStorage.getItem('isAdmin') === 'true';
      
      if (username) {
        setUser({
          id: userId || '1',
          username: username,
          email: null,
          status: true,
          isAdmin: isAdmin,
          permissions: []
        });
        console.log('从localStorage恢复用户信息:', { username, isAdmin, userId });
      } else {
        console.log('没有用户信息，重定向到登录页');
        router.push('/');
        return;
      }
    }
  }, [router]);

  // 权限检查和数据加载
  useEffect(() => {
    if (!mounted || !user) return;

    const checkPermissionsAndLoad = async () => {
      try {
        // 检查用户是否登录
        if (!user) {
          console.log('没有用户信息，重定向到登录页');
          router.push('/');
          return;
        }
        
        // 检查管理员权限
        if (!hasAdminPermission) {
          console.log('用户不是管理员，拒绝访问');
          setPermissionChecked(true);
          setError('权限不足，需要管理员权限');
          return;
        }
        
        console.log('管理员权限检查通过:', { 
          user: user.username, 
          isAdmin: hasAdminPermission 
        });

        // 标记权限检查完成
        setPermissionChecked(true);

        // 加载用户列表
        try {
          setLoading(true);
          setError(null);
          console.log('开始加载用户列表，API地址:', API_ENDPOINTS.USERS.LIST);
          
          const data = await apiRequestWithError(API_ENDPOINTS.USERS.LIST);
          console.log('用户列表API响应:', data);
          
          if (data.users && Array.isArray(data.users)) {
            setUsers(data.users);
            setFilteredUsers(data.users);
            console.log('成功加载用户列表，用户数量:', data.users.length);
          } else {
            console.error('用户列表API返回数据格式错误:', data);
            setError('加载用户列表失败');
          }
        } catch (error) {
          console.error('加载用户列表失败:', error);
          setError('加载用户列表失败');
        } finally {
          setLoading(false);
        }
      } catch (error) {
        console.error('权限检查失败:', error);
        setError('权限检查失败');
        setLoading(false);
      }
    };

    checkPermissionsAndLoad();
  }, [mounted, user, hasAdminPermission, router]);

  // 过滤用户
  useEffect(() => {
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

    // 移除角色过滤，因为中间件已经处理了权限检查
    // if (roleFilter !== 'all') {
    //   filtered = filtered.filter(user => 
    //     roleFilter === 'admin' ? user.isAdmin : !user.isAdmin
    //   );
    // }

    setFilteredUsers(filtered);
  }, [users, searchTerm, statusFilter]);



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

  // 计算统计数据
  const stats = {
    total: users.length,
    active: users.filter(u => u.status).length,
    inactive: users.filter(u => !u.status).length,
    admin: users.filter(u => u.isAdmin).length,
    user: users.filter(u => !u.isAdmin).length,
  };

  // 避免闪烁的加载状态 - 优化版本
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

  // 未登录状态 - 直接返回null，让重定向逻辑处理
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
              setError(null);
              // 重新加载用户数据
              window.location.reload();
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
          username={'Admin'}
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
                
                {/* 统计信息小图标 */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                      <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">{stats.total}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm">
                    <div className="p-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                      <UserCheck className="w-3 h-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">{stats.active}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm">
                    <div className="p-1 bg-red-100 dark:bg-red-900/20 rounded-full">
                      <UserX className="w-3 h-3 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">{stats.inactive}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm">
                    <div className="p-1 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                      <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">{stats.admin}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm">
                    <div className="p-1 bg-gray-100 dark:bg-gray-900/20 rounded-full">
                      <User className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">{stats.user}</span>
                  </div>
                </div>
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

          {/* 搜索和筛选 - 更紧凑 */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-800 mb-4">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* 搜索框 */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索用户名或邮箱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* 筛选器 */}
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">所有状态</option>
                  <option value="active">活跃用户</option>
                  <option value="inactive">非活跃用户</option>
                </select>

                <select
                  value="all"
                  onChange={(e) => {}}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">所有角色</option>
                  <option value="admin">管理员</option>
                  <option value="user">普通用户</option>
                </select>
              </div>
            </div>
          </div>

          {/* 用户卡片网格 - 更紧凑 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white dark:bg-[#1c1c1e] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 
                         hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="p-4">
                  {/* 用户头像、基本信息和编辑按钮 */}
                  <div className="flex items-center mb-3">
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
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {user.username}
                        </h3>
                        {user.isAdmin && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full flex-shrink-0">
                            管理员
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email || '未设置邮箱'}
                      </p>
                    </div>
                    {/* 编辑按钮放在右侧 */}
                    <button
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                      className="ml-2 p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 
                               hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                      title="编辑用户"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 注册时间和最后登录时间在同一行 */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 mb-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">注册:</span>
                      <span className="text-xs text-gray-900 dark:text-white">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">登录:</span>
                      <span className="text-xs text-gray-900 dark:text-white">
                        {user.lastLoginAt ? (
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-gray-400" />
                            {new Date(user.lastLoginAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="italic text-gray-400">未登录</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 空状态 - 更紧凑 */}
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-[#1c1c1e] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <div className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm || statusFilter !== 'all' ? '没有找到匹配的用户' : '暂无用户'}
              </div>
              <div className="text-gray-500 dark:text-gray-400 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? '请尝试调整搜索条件或筛选器' 
                  : '点击添加用户按钮创建第一个用户'
                }
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                添加用户
              </button>
            </div>
          )}

          {/* 加载状态 - 更紧凑 */}
          {loading && (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
              <div className="text-sm text-gray-600 dark:text-gray-400">加载用户数据中...</div>
            </div>
          )}
        </div>

        <CreateUserModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            // 重新加载用户数据
            window.location.reload();
          }}
        />
      </div>
      <Footer />
    </div>
  );
}