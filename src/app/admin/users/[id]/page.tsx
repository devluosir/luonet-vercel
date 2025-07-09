'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  ShieldCheck, 
  Settings, 
  Trash2, 
  Save, 
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Archive,
  ShoppingCart,
  Receipt,
  BarChart3,
  Users,
  Database,
  Zap,
  TrendingUp
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

// 定义所有可用的模块，包含图标
const MODULES = [
  { 
    id: 'history', 
    name: '单据管理中心', 
    description: '统一管理报价单、发票、采购订单历史',
    icon: Archive,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/20'
  },
  { 
    id: 'quotation', 
    name: '报价及确认', 
    description: '生成报价单和销售确认单',
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20'
  },
  { 
    id: 'purchase', 
    name: '采购订单', 
    description: '生成给供应商的采购订单',
    icon: ShoppingCart,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20'
  },
  { 
    id: 'packing', 
    name: '箱单发票', 
    description: '生成和管理箱单发票',
    icon: Archive,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-900/20'
  },
  { 
    id: 'invoice', 
    name: '发票结算', 
    description: '生成和管理发票',
    icon: Receipt,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20'
  },
  { 
    id: 'ai-email', 
    name: 'AI邮件助手', 
    description: '智能生成商务邮件',
    icon: Mail,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20'
  },
  { 
    id: 'date-tools', 
    name: '日期计算', 
    description: '计算日期和天数',
    icon: Calendar,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20'
  },
  { 
    id: 'feature4', 
    name: '客户管理', 
    description: '客户信息管理系统',
    icon: Users,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-900/20'
  },
  { 
    id: 'feature5', 
    name: '库存管理', 
    description: '产品库存跟踪',
    icon: Database,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/20'
  },
  { 
    id: 'feature6', 
    name: '自动化工具', 
    description: '工作流程自动化',
    icon: Zap,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/20'
  },
  { 
    id: 'feature7', 
    name: '时间管理', 
    description: '项目时间跟踪',
    icon: Clock,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/20'
  },
  { 
    id: 'feature8', 
    name: '销售预测', 
    description: '销售趋势分析',
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/20'
  },
  { 
    id: 'feature3', 
    name: '数据分析', 
    description: '业务数据分析和报表',
    icon: BarChart3,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/20'
  },
  { 
    id: 'feature9', 
    name: '系统设置', 
    description: '应用配置管理',
    icon: Settings,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20'
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!params?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/users/${params.id}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || '获取用户信息失败');
        }
        const data = await response.json();
        setUser(data);
        // 初始化权限状态
        const initialPermissions = new Map();
        data.permissions.forEach((permission: Permission) => {
          initialPermissions.set(permission.moduleId, permission.canAccess);
        });
        setPendingPermissions(initialPermissions);
      } catch (error) {
        console.error('Error fetching user:', error);
        setError(error instanceof Error ? error.message : '获取用户信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [params?.id]);

  const handleTogglePermission = (moduleId: string, currentAccess: boolean) => {
    const newPermissions = new Map(pendingPermissions);
    newPermissions.set(moduleId, !currentAccess);
    setPendingPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleSavePermissions = async () => {
    if (!user || !hasChanges) return;
    try {
      setSaving(true);
      
      // 构建权限数据
      const updatedPermissions = MODULES.map(module => ({
        moduleId: module.id,
        canAccess: pendingPermissions.get(module.id) ?? false
      }));

      console.log('Sending permissions:', updatedPermissions); // 调试日志

      const response = await fetch(`/api/admin/users/${user.id}/permissions/batch`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions: updatedPermissions })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新模块权限失败');
      }

      const data = await response.json();
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
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = '删除用户失败';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      router.push('/admin');
      alert('用户已成功删除');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error instanceof Error ? error.message : '删除用户失败');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
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

  if (!session?.user?.isAdmin) {
    return null;
  }

  const enabledModulesCount = Array.from(pendingPermissions.values()).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200/50 dark:border-gray-800/50">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">确认删除用户</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">此操作不可恢复</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              确定要删除用户 <span className="font-medium text-gray-900 dark:text-white">{user?.username}</span> 吗？
              删除后所有相关数据将永久丢失。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                         bg-gray-100 dark:bg-gray-800 rounded-lg 
                         hover:bg-gray-200 dark:hover:bg-gray-700 
                         transition-colors duration-200"
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white 
                         bg-gradient-to-r from-red-600 to-red-700 rounded-lg 
                         hover:from-red-700 hover:to-red-800 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
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
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <User className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
                  编辑用户
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  管理用户信息和功能权限
                </p>
              </div>
            </div>
          </div>
        </div>

        {user && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 用户信息卡片 */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* 用户头像和基本信息 */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-center">
                  <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold relative ${
                    user.isAdmin 
                      ? 'bg-white/20 backdrop-blur-sm ring-4 ring-white/30' 
                      : 'bg-white/10 backdrop-blur-sm'
                  }`}>
                    {user.username.charAt(0).toUpperCase()}
                    {/* 状态指示器 */}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-white ${
                      user.status ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{user.username}</h3>
                  <div className="flex items-center justify-center space-x-2">
                    {user.isAdmin && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                        <Shield className="w-3 h-3 mr-1" />
                        管理员
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                      user.status 
                        ? 'bg-green-500/20 text-green-100' 
                        : 'bg-red-500/20 text-red-100'
                    }`}>
                      {user.status ? '启用' : '禁用'}
                    </span>
                  </div>
                </div>

                {/* 详细信息 */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400 mr-3" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">邮箱地址</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.email || '未设置'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <Clock className="w-5 h-5 text-gray-400 mr-3" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">最后登录</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '从未登录'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">创建时间</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(user.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 危险操作 */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting}
                      className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-red-600 
                               bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50
                               hover:bg-red-100 dark:hover:bg-red-900/30 
                               disabled:opacity-50 disabled:cursor-not-allowed
                               transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isDeleting ? '删除中...' : '删除用户'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 权限管理卡片 */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <Settings className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                        功能权限管理
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        已启用 <span className="font-medium text-blue-600 dark:text-blue-400">{enabledModulesCount}</span> / {MODULES.length} 个功能模块
                      </p>
                    </div>
                    <button
                      onClick={handleSavePermissions}
                      disabled={!hasChanges || saving}
                      className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        hasChanges && !saving
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? '保存中...' : '保存更改'}
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {MODULES.map((module) => {
                      const hasAccess = pendingPermissions.get(module.id) ?? false;
                      const Icon = module.icon;
                      return (
                        <div
                          key={module.id}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                            hasAccess 
                              ? 'border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10' 
                              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/20 hover:border-gray-300 dark:hover:border-gray-700'
                          }`}
                          onClick={() => handleTogglePermission(module.id, hasAccess)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className={`p-2 rounded-lg flex-shrink-0 ${module.bgColor}`}>
                                <Icon className={`w-4 h-4 ${module.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                  {module.name}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                  {module.description}
                                </p>
                              </div>
                            </div>
                            
                            {/* 切换开关 */}
                            <div className="ml-4 flex-shrink-0">
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
                                <div className={`w-11 h-6 rounded-full peer transition-all duration-200 ${
                                  hasAccess 
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                                    : 'bg-gray-200 dark:bg-gray-700'
                                } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50 dark:peer-focus:ring-blue-800/50`}>
                                  <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 transition-transform duration-200 ${
                                    hasAccess ? 'translate-x-5' : 'translate-x-0'
                                  } shadow-sm`}></div>
                                </div>
                              </label>
                            </div>
                          </div>

                          {/* 状态指示器 */}
                          <div className={`absolute top-2 right-2 w-3 h-3 rounded-full transition-all duration-200 ${
                            hasAccess 
                              ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 