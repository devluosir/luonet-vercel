import { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  User,
  Key,
  Shield,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';
import { API_ENDPOINTS, apiRequestWithError } from '@/lib/api-config';

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
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [currentUser, setCurrentUser] = useState(() => {
    // 如果传入的用户信息中没有邮箱，尝试从本地存储获取
    if (!user.email && typeof window !== 'undefined') {
      const localEmail = localStorage.getItem('userEmail');
      if (localEmail) {
        return {
          ...user,
          email: localEmail
        };
      }
    }
    
    return user;
  });

  // 获取最新的用户信息
  const fetchUserInfo = async () => {
    try {
      // 从localStorage获取当前用户ID
      const userId = localStorage.getItem('userId');
      if (!userId) {
        return;
      }
      
      // 使用与用户管理页面相同的API端点
      const userInfo = await apiRequestWithError(API_ENDPOINTS.USERS.GET(userId), {
        method: 'GET',
      });
      setCurrentUser(userInfo);
    } catch (error) {
      // 如果从服务器获取失败，尝试从本地存储读取邮箱信息
      if (typeof window !== 'undefined') {
        const localEmail = localStorage.getItem('userEmail');
        if (localEmail) {
          setCurrentUser(prev => ({
            ...prev,
            email: localEmail
          }));
        }
      }
    }
  };

  // 从本地存储获取邮箱信息的函数
  const getLocalEmail = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userEmail');
    }
    return null;
  };

  // 当模态框打开时，如果传入的用户信息中没有邮箱，尝试从本地存储获取
  useEffect(() => {
    if (isOpen && (!currentUser.email || currentUser.email === null || currentUser.email === '')) {
      const localEmail = getLocalEmail();
      if (localEmail) {
        setCurrentUser(prev => ({
          ...prev,
          email: localEmail
        }));
      }
    }
  }, [isOpen, currentUser.email]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('新密码和确认密码不匹配');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('新密码长度至少6位');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 从localStorage获取当前用户ID
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('无法获取用户ID');
        return;
      }
      
      // 使用与用户管理页面相同的API端点
      await apiRequestWithError(API_ENDPOINTS.USERS.UPDATE(userId), {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      // 成功后重置表单和状态
      setShowChangePassword(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPassword({ current: false, new: false, confirm: false });
      alert('密码修改成功');
    } catch (error) {
      setError(error instanceof Error ? error.message : '修改密码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmail = () => {
    setEditingEmail(true);
    setEmailValue(currentUser.email || '');
  };

  const handleSaveEmail = async () => {
    if (!emailValue.trim()) {
      setError('邮箱不能为空');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 从localStorage获取当前用户ID
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('无法获取用户ID');
        return;
      }
      
      // 使用与用户管理页面相同的API端点
      await apiRequestWithError(API_ENDPOINTS.USERS.UPDATE(userId), {
        method: 'PUT',
        body: JSON.stringify({ email: emailValue }),
      });

      setEditingEmail(false);
      setEmailValue('');
      alert('邮箱更新成功');
      // 更新本地存储中的邮箱信息
      if (typeof window !== 'undefined') {
        localStorage.setItem('userEmail', emailValue);
      }
      // 重新获取用户信息
      await fetchUserInfo();
    } catch (error) {
      setError(error instanceof Error ? error.message : '更新邮箱失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEmail = () => {
    setEditingEmail(false);
    setEmailValue('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-200/50 dark:border-gray-800/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-white" />
              <h2 className="text-lg font-semibold text-white">个人资料</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* 用户名 */}
            <div className="flex items-center space-x-3">
              <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">用户名</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{currentUser.username}</span>
            </div>
            
            {/* 邮箱 */}
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">邮箱</span>
              <div className="flex items-center space-x-2">
                {editingEmail ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="email"
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="输入邮箱地址"
                    />
                    <button
                      onClick={handleSaveEmail}
                      disabled={loading}
                      className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                    >
                      {loading ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={handleCancelEmail}
                      className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 dark:bg-gray-900/20 rounded border border-gray-200 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {currentUser.email || '未设置'}
                    </span>
                    <button
                      onClick={handleEditEmail}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 密码修改 */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">密码</span>
                <button
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {showChangePassword ? '收起' : '修改'}
                </button>
              </div>
              
              {showChangePassword && (
                <div className="ml-7 bg-gray-50 dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                  <form onSubmit={handleChangePassword} className="space-y-2">
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">当前密码</label>
                        <div className="relative">
                          <input
                            type={showPassword.current ? "text" : "password"}
                            required
                            className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                                     rounded text-xs placeholder-gray-400 dark:placeholder-gray-500 
                                     focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent 
                                     text-gray-900 dark:text-white transition-all duration-200 pr-6"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({
                              ...passwordForm,
                              currentPassword: e.target.value
                            })}
                            placeholder="当前密码"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showPassword.current ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">新密码</label>
                        <div className="relative">
                          <input
                            type={showPassword.new ? "text" : "password"}
                            required
                            className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                                     rounded text-xs placeholder-gray-400 dark:placeholder-gray-500 
                                     focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent 
                                     text-gray-900 dark:text-white transition-all duration-200 pr-6"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({
                              ...passwordForm,
                              newPassword: e.target.value
                            })}
                            placeholder="新密码"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showPassword.new ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">确认密码</label>
                        <div className="relative">
                          <input
                            type={showPassword.confirm ? "text" : "password"}
                            required
                            className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                                     rounded text-xs placeholder-gray-400 dark:placeholder-gray-500 
                                     focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent 
                                     text-gray-900 dark:text-white transition-all duration-200 pr-6"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({
                              ...passwordForm,
                              confirmPassword: e.target.value
                            })}
                            placeholder="确认密码"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showPassword.confirm ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-1">
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
                          setShowPassword({ current: false, new: false, confirm: false });
                        }}
                        className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 
                                 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 
                                 transition-colors duration-200"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-2 py-1.5 text-xs font-medium text-white bg-blue-600 
                                 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed 
                                 transition-all duration-200"
                      >
                        {loading ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 