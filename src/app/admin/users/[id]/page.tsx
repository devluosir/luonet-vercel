'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { API_ENDPOINTS, apiRequestWithError } from '@/lib/api-config';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Settings, 
  Trash2, 
  Save, 
  Clock,
  XCircle,
  Archive,
  FileText,
  ShoppingCart,
  Receipt,
  Users,
  Database,
  BarChart3,
  TrendingUp,
  Zap
} from 'lucide-react';

interface Permission {
  id: string;
  moduleId: string;
  canAccess: boolean;
}

interface User {
  id: string;
  username: string;
  email: string | null;
  status: boolean;
  isAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  permissions: Permission[];
}

// 简化的模块定义
const MODULES = [
  { 
    id: 'history', 
    name: '单据管理中心',
    icon: Archive,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/20'
  },
  { 
    id: 'quotation', 
    name: '报价及确认',
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20'
  },
  { 
    id: 'packing', 
    name: '箱单发票',
    icon: Archive,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-900/20'
  },
  { 
    id: 'invoice', 
    name: '财务发票',
    icon: Receipt,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20'
  },
  { 
    id: 'purchase', 
    name: '采购订单',
    icon: ShoppingCart,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20'
  },
  { 
    id: 'customer', 
    name: '客户管理',
    icon: Users,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-900/20'
  },
  { 
    id: 'ai-email', 
    name: 'AI邮件助手',
    icon: Mail,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20'
  },
  { 
    id: 'date-tools', 
    name: '日期计算',
    icon: Calendar,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20'
  },
  { 
    id: 'feature5', 
    name: '库存管理',
    icon: Database,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/20'
  },
  { 
    id: 'feature3', 
    name: '数据分析',
    icon: BarChart3,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/20'
  },
  { 
    id: 'feature8', 
    name: '销售预测',
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/20'
  },
  { 
    id: 'feature7', 
    name: '时间管理',
    icon: Clock,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/20'
  },
  { 
    id: 'feature6', 
    name: '自动化工具',
    icon: Zap,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/20'
  },
  { 
    id: 'feature9', 
    name: '系统设置',
    icon: Settings,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/20'
  },
];

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingPermissions, setPendingPermissions] = useState<Map<string, boolean>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [editingPassword, setEditingPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 计算已启用的模块数量
  const enabledModulesCount = Array.from(pendingPermissions.values()).filter(Boolean).length;

  // 初始化
  useEffect(() => {
    setMounted(true);
  }, []);

  // 点击外部区域关闭设置菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showSettings && !target.closest('.settings-container')) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  useEffect(() => {
    if (!mounted || !params?.id) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await apiRequestWithError(API_ENDPOINTS.USERS.GET(params.id as string));
        setUser(data);
        // 初始化权限状态
        const initialPermissions = new Map();
        if (data.permissions && data.permissions.length > 0) {
          data.permissions.forEach((permission: Permission) => {
            initialPermissions.set(permission.moduleId, permission.canAccess);
          });
        }
        setPendingPermissions(initialPermissions);
        setEmailValue(data.email || '');
      } catch (error) {
        console.error('Error fetching user:', error);
        setError(error instanceof Error ? error.message : '获取用户信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [mounted, params?.id]);

  const handleTogglePermission = (moduleId: string, currentAccess: boolean) => {
    const newPermissions = new Map(pendingPermissions);
    newPermissions.set(moduleId, !currentAccess);
    setPendingPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      await apiRequestWithError(API_ENDPOINTS.USERS.UPDATE(userId), {
        method: 'PUT',
        body: JSON.stringify({ isAdmin: !currentIsAdmin }),
      });

      // 重新获取用户信息
      const userData = await apiRequestWithError(API_ENDPOINTS.USERS.GET(userId));
      setUser(userData);
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert(error instanceof Error ? error.message : '更新管理员权限失败');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await apiRequestWithError(API_ENDPOINTS.USERS.UPDATE(userId), {
        method: 'PUT',
        body: JSON.stringify({ status: !currentStatus }),
      });

      // 重新获取用户信息
      const userData = await apiRequestWithError(API_ENDPOINTS.USERS.GET(userId));
      setUser(userData);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert(error instanceof Error ? error.message : '更新用户状态失败');
    }
  };

  const handleEditEmail = () => {
    setEditingEmail(true);
    setEmailValue(user?.email || '');
  };

  const handleSaveEmail = async () => {
    if (!user) return;
    
    try {
      console.log('Saving email:', emailValue); // 调试日志
      
      const userData = await apiRequestWithError(API_ENDPOINTS.USERS.UPDATE(user.id), {
        method: 'PUT',
        body: JSON.stringify({ email: emailValue }),
      });

      console.log('Updated user data:', userData); // 调试日志
      setUser(userData);
      
      setEditingEmail(false);
      setEmailValue('');
      alert('邮箱更新成功');
    } catch (error) {
      console.error('Error updating email:', error);
      alert(error instanceof Error ? error.message : '更新邮箱失败');
    }
  };

  const handleCancelEmail = () => {
    setEditingEmail(false);
    setEmailValue('');
  };

  const handleEditPassword = () => {
    setEditingPassword(true);
    setPasswordValue('');
  };

  const handleSavePassword = async () => {
    if (!user || !passwordValue.trim()) {
      alert('请输入密码');
      return;
    }
    
    try {
      await apiRequestWithError(API_ENDPOINTS.USERS.UPDATE(user.id), {
        method: 'PUT',
        body: JSON.stringify({ password: passwordValue }),
      });

      setEditingPassword(false);
      setPasswordValue('');
      alert('密码更新成功');
    } catch (error) {
      console.error('Error updating password:', error);
      alert(error instanceof Error ? error.message : '更新密码失败');
    }
  };

  const handleCancelPassword = () => {
    setEditingPassword(false);
    setPasswordValue('');
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setShowSettings(false); // 关闭设置菜单
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    await handleDeleteUser();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleSavePermissions = async () => {
    if (!user || !hasChanges) return;
    try {
      setSaving(true);
      
      const updatedPermissions = MODULES.map(module => ({
        moduleId: module.id,
        canAccess: pendingPermissions.get(module.id) ?? false
      }));

      const data = await apiRequestWithError(API_ENDPOINTS.USERS.BATCH_PERMISSIONS(user.id), {
        method: 'POST',
        body: JSON.stringify({ permissions: updatedPermissions })
      });
      setUser(data);
      setHasChanges(false);
      alert('权限更新成功');
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert(error instanceof Error ? error.message : '更新模块权限失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    
    try {
      setIsDeleting(true);
      await apiRequestWithError(API_ENDPOINTS.USERS.DELETE(user.id), {
        method: 'DELETE',
      });

      router.push('/admin');
      alert('用户已成功删除');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error instanceof Error ? error.message : '删除用户失败');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-600 dark:text-gray-400">加载用户信息...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center p-8 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">加载失败</div>
          <div className="text-gray-600 dark:text-gray-400 mb-4">{error}</div>
          <button 
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回用户列表
          </button>
        </div>
      </div>
    );
  }

  // 权限不足时直接返回null，避免闪烁
  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">确认删除</div>
              <div className="text-gray-600 dark:text-gray-400 mb-4">
                您确定要删除用户 &quot;{user?.username}&quot; 吗？此操作不可逆。
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  确认删除
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 - 只保留返回按钮 */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 
                         bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </button>
            </div>
        </div>

        {user && (
          <div className="space-y-6">
            {/* 用户基本信息 */}
              <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">用户信息</h2>
                  
                  {/* 设置按钮和展开功能 */}
                  <div className="flex items-center space-x-2 settings-container">
                    {/* 展开的设置选项 */}
                    {showSettings && (
                      <div className="flex items-center space-x-2 sm:space-x-3 animate-in slide-in-from-right-2 duration-200">
                        {/* 删除用户按钮 */}
                        <button
                          onClick={handleDeleteClick}
                          disabled={isDeleting}
                          className="flex items-center px-2 sm:px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="删除用户"
                        >
                          <Trash2 className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">删除用户</span>
                        </button>
                        
                        {/* 管理员权限开关 */}
                        <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 hidden sm:inline">管理员权限</span>
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 sm:hidden">管理员</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={user?.isAdmin || false}
                              onChange={() => user && handleToggleAdmin(user.id, user.isAdmin)}
                              className="sr-only peer"
                            />
                            <div className={`w-7 h-3.5 sm:w-8 sm:h-4 rounded-full peer transition-all duration-200 ${
                              user?.isAdmin 
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                                : 'bg-gray-200 dark:bg-gray-700'
                            } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300/50 dark:peer-focus:ring-blue-800/50`}>
                              <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 transition-transform duration-200 ${
                                user?.isAdmin ? 'translate-x-4' : 'translate-x-0'
                              } shadow-sm`}></div>
                            </div>
                          </label>
                        </div>
                        
                        {/* 账户状态开关 */}
                        <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/50">
                          <span className="text-xs font-medium text-green-600 dark:text-green-400 hidden sm:inline">账户状态</span>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400 sm:hidden">状态</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={user?.status || false}
                              onChange={() => user && handleToggleStatus(user.id, user.status)}
                              className="sr-only peer"
                            />
                            <div className={`w-7 h-3.5 sm:w-8 sm:h-4 rounded-full peer transition-all duration-200 ${
                              user?.status 
                                ? 'bg-green-500' 
                                : 'bg-gray-200 dark:bg-gray-700'
                            } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300/50 dark:peer-focus:ring-green-800/50`}>
                              <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 transition-transform duration-200 ${
                                user?.status ? 'translate-x-4' : 'translate-x-0'
                              } shadow-sm`}></div>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                    
                    {/* 设置按钮 */}
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {/* 用户头像和基本信息 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-xl relative ${
                      user?.isAdmin 
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                        : 'bg-gradient-to-br from-gray-500 to-gray-600'
                    }`}>
                      {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
                      <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 ${
                        user?.status ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                    <div className="ml-4">
                      <div className="text-xl font-semibold text-gray-900 dark:text-white">{user?.username}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user?.isAdmin ? '管理员' : '普通用户'} • {user?.status ? '已启用' : '已禁用'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>最后登录: {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '从未登录'}</span>
                  </div>
                </div>

                {/* 用户详细信息网格 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 邮箱地址 */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">邮箱地址</span>
                      </div>
                      {!editingEmail && (
                        <button 
                          onClick={handleEditEmail}
                          className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          编辑
                        </button>
                      )}
                    </div>
                    {editingEmail ? (
                      <div className="space-y-2">
                        <input
                          type="email"
                          value={emailValue}
                          onChange={(e) => setEmailValue(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="输入邮箱地址"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveEmail}
                            className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelEmail}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 dark:bg-gray-900/20 rounded border border-gray-200 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {user.email || '未设置'}
                      </div>
                    )}
                  </div>

                  {/* 密码修改 */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Shield className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">密码</span>
                      </div>
                      {!editingPassword && (
                        <button 
                          onClick={handleEditPassword}
                          className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          重置
                        </button>
                      )}
                    </div>
                    {editingPassword ? (
                      <div className="space-y-2">
                        <input
                          type="password"
                          value={passwordValue}
                          onChange={(e) => setPasswordValue(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="输入新密码"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSavePassword}
                            className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelPassword}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 dark:bg-gray-900/20 rounded border border-gray-200 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 dark:text-gray-300">••••••••</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 权限管理 */}
              <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center justify-between sm:justify-start">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                          <Settings className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                          功能权限管理
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                        已启用 {enabledModulesCount} / {MODULES.length} 个功能模块
                        </p>
                      </div>
                      {/* 小屏时保存按钮显示在标题右侧 */}
                      <button
                        onClick={handleSavePermissions}
                        disabled={!hasChanges || saving}
                        className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 sm:hidden ${
                          hasChanges && !saving
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {saving ? '保存中' : '保存'}
                      </button>
                    </div>
                    {/* 大屏时保存按钮显示在右侧 */}
                    <button
                      onClick={handleSavePermissions}
                      disabled={!hasChanges || saving}
                      className={`hidden sm:flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        hasChanges && !saving
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? '保存中...' : '保存更改'}
                    </button>
                  </div>
                </div>

                <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {MODULES.map((module) => {
                      const hasAccess = pendingPermissions.get(module.id) ?? false;
                      const IconComponent = module.icon;
                      return (
                        <div
                          key={module.id}
                        className={`p-4 rounded-lg border transition-all duration-200 ${
                            hasAccess 
                            ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20' 
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/20'
                          }`}
                        >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${module.bgColor}`}>
                              <IconComponent className={`w-4 h-4 ${module.color}`} />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {module.name}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasAccess}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleTogglePermission(module.id, hasAccess);
                              }}
                              disabled={saving}
                              className="sr-only peer"
                            />
                            <div className={`w-9 h-5 rounded-full peer transition-all duration-200 ${
                              hasAccess 
                                ? 'bg-blue-500' 
                                : 'bg-gray-200 dark:bg-gray-700'
                            } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50 dark:peer-focus:ring-blue-800/50 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed`}>
                              <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-4 w-4 transition-transform duration-200 ${
                                hasAccess ? 'translate-x-4' : 'translate-x-0'
                              } shadow-sm`}></div>
                            </div>
                          </label>
                        </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 