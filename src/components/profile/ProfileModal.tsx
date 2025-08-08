import { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  User,
  Shield,
  Edit,
  Eye,
  EyeOff,
  Palette
} from 'lucide-react';
import { API_ENDPOINTS, apiRequestWithError } from '@/lib/api-config';
import { useThemeSettings, ButtonTheme } from '@/hooks/useThemeSettings';

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

  const { settings, setButtonTheme } = useThemeSettings();

  const fetchUserInfo = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      
      const userInfo = await apiRequestWithError(API_ENDPOINTS.USERS.GET(userId), {
        method: 'GET',
      });
      setCurrentUser(userInfo);
    } catch (error) {
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

  const getLocalEmail = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userEmail');
    }
    return null;
  };

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

  // ESC 键关闭弹窗
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

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
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('无法获取用户ID');
        return;
      }
      
      await apiRequestWithError(API_ENDPOINTS.USERS.UPDATE(userId), {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

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
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('无法获取用户ID');
        return;
      }
      
      await apiRequestWithError(API_ENDPOINTS.USERS.UPDATE(userId), {
        method: 'PUT',
        body: JSON.stringify({ email: emailValue }),
      });

      setEditingEmail(false);
      setEmailValue('');
      alert('邮箱更新成功');
      if (typeof window !== 'undefined') {
        localStorage.setItem('userEmail', emailValue);
      }
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
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">个人资料</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 p-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* 用户信息 */}
          <div className="space-y-4">
            {/* 用户名 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">用户名</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{currentUser.username}</span>
            </div>
            
            {/* 邮箱 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">邮箱</span>
              </div>
              
              {editingEmail ? (
                <div className="flex items-center space-x-1">
                  <input
                    type="email"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                    placeholder="邮箱"
                  />
                  <button
                    onClick={handleSaveEmail}
                    disabled={loading}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    保存
                  </button>
                  <button
                    onClick={handleCancelEmail}
                    className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {currentUser.email || '未设置'}
                  </span>
                  <button
                    onClick={handleEditEmail}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* 主题设置 */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <div className="flex items-center space-x-2 mb-3">
                <Palette className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">按钮主题</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setButtonTheme('colorful')}
                  className={`px-3 py-2 text-xs rounded border transition-colors ${
                    settings.buttonTheme === 'colorful'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  彩色渐变
                </button>
                
                <button
                  onClick={() => setButtonTheme('classic')}
                  className={`px-3 py-2 text-xs rounded border transition-colors ${
                    settings.buttonTheme === 'classic'
                      ? 'bg-gray-600 text-white border-gray-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  经典白色
                </button>
              </div>
            </div>

            {/* 密码修改 */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">密码</span>
                </div>
                <button
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {showChangePassword ? '取消' : '修改'}
                </button>
              </div>
              
              {showChangePassword && (
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <div className="relative">
                      <input
                        type={showPassword.current ? "text" : "password"}
                        required
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8"
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
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                      >
                        {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        type={showPassword.new ? "text" : "password"}
                        required
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8"
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
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                      >
                        {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        type={showPassword.confirm ? "text" : "password"}
                        required
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value
                        })}
                        placeholder="确认新密码"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                      >
                        {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-2">
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
                      className="flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? '保存中...' : '保存'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 