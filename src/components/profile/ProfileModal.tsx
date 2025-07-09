import { useState } from 'react';
import { 
  X, 
  Mail, 
  FileText, 
  Receipt, 
  Calendar, 
  ShoppingCart, 
  Settings, 
  BarChart3, 
  Users, 
  Database, 
  Zap,
  Clock,
  TrendingUp,
  Archive,
  CheckCircle,
  User,
  Key,
  Shield
} from 'lucide-react';

interface Permission {
  id: string;
  moduleId: string;
  canAccess: boolean;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    username: string;
    email: string | null;
    permissions: Permission[];
  };
}

export function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('新密码和确认密码不匹配');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '修改密码失败');
      }

      // 成功后重置表单和状态
      setShowChangePassword(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      alert('密码修改成功');
    } catch (error) {
      console.error('Error changing password:', error);
      setError(error instanceof Error ? error.message : '修改密码失败');
    } finally {
      setLoading(false);
    }
  };

  // 与工具页面保持完全一致的模块定义
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
      id: 'purchase', 
      name: '采购订单', 
      icon: ShoppingCart,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20'
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
      name: '发票结算', 
      icon: Receipt,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
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
      id: 'feature4', 
      name: '客户管理', 
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-100 dark:bg-violet-900/20'
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
      bgColor: 'bg-gray-100 dark:bg-gray-900/20'
    },
  ];

  const availableModules = MODULES.filter(module => 
    user.permissions.some(p => p.moduleId === module.id && p.canAccess)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-gray-200/50 dark:border-gray-800/50">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">个人资料</h2>
                <p className="text-blue-100 text-sm">账户信息与权限管理</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="p-8">
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 p-4 rounded-xl text-sm flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-800/50 flex items-center justify-center flex-shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 基本信息 */}
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200/50 dark:border-gray-800/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    基本信息
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">用户名</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{user.username}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">邮箱</span>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{user.email || '未设置'}</span>
                    </div>
                  </div>
                </div>

                {/* 密码修改 */}
                {!showChangePassword ? (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200/50 dark:border-gray-800/50">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Key className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                      安全设置
                    </h3>
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 
                               text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 
                               shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      修改密码
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200/50 dark:border-gray-800/50">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Key className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                      修改密码
                    </h3>
                    
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          当前密码
                        </label>
                        <input
                          type="password"
                          required
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                                   rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                                   text-gray-900 dark:text-white transition-all duration-200"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({
                            ...passwordForm,
                            currentPassword: e.target.value
                          })}
                          placeholder="请输入当前密码"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          新密码
                        </label>
                        <input
                          type="password"
                          required
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                                   rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                                   text-gray-900 dark:text-white transition-all duration-200"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value
                          })}
                          placeholder="请输入新密码"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          确认新密码
                        </label>
                        <input
                          type="password"
                          required
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                                   rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                                   text-gray-900 dark:text-white transition-all duration-200"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value
                          })}
                          placeholder="请再次输入新密码"
                        />
                      </div>

                      <div className="flex space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowChangePassword(false);
                            setError(null);
                            setPasswordForm({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: '',
                            });
                          }}
                          className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 
                                   bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 
                                   transition-colors duration-200"
                        >
                          取消
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-blue-600 
                                   rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed 
                                   transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          {loading ? '保存中...' : '保存密码'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* 已开通功能 */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200/50 dark:border-gray-800/50">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                  已开通功能
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                    {availableModules.length}
                  </span>
                </h3>
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {availableModules.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无可用功能</p>
                      <p className="text-xs mt-1">请联系管理员分配权限</p>
                    </div>
                  ) : (
                    availableModules.map(module => {
                      const Icon = module.icon;
                      return (
                        <div
                          key={module.id}
                          className="flex items-center p-3 bg-white dark:bg-gray-800/50 rounded-lg 
                                   hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors duration-200 
                                   border border-gray-100 dark:border-gray-700/50 group"
                        >
                          <div className={`p-2 rounded-lg ${module.bgColor} flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                            <Icon className={`w-4 h-4 ${module.color}`} />
                          </div>
                          <div className="ml-3 flex-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {module.name}
                            </span>
                          </div>
                          <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* 底部操作栏 */}
            {!showChangePassword && (
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 
                           bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 
                           transition-colors duration-200"
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 