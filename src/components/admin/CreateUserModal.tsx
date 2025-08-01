import { useState } from 'react';
import { 
  X, 
  User, 
  Lock, 
  Mail, 
  Shield, 
  UserPlus, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { API_ENDPOINTS, apiRequestWithError } from '@/lib/api-config';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    isAdmin: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiRequestWithError(API_ENDPOINTS.USERS.CREATE, {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      onSuccess();
      onClose();
      setFormData({
        username: '',
        password: '',
        email: '',
        isAdmin: false,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error instanceof Error ? error.message : '创建用户失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError(null);
      setFormData({
        username: '',
        password: '',
        email: '',
        isAdmin: false,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl w-full max-w-md mx-4 relative border border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
        {/* 渐变头部 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">添加新用户</h2>
                <p className="text-blue-100 text-sm mt-0.5">创建用户账户和设置权限</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200 disabled:opacity-50"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 错误提示 */}
          {error && (
            <div className="flex items-start space-x-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 p-4 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">创建失败</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* 用户名字段 */}
          <div className="space-y-2">
            <label htmlFor="username" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <User className="w-4 h-4 mr-2 text-gray-500" />
              用户名 <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="username"
                required
                placeholder="请输入用户名"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 
                         rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                         focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400
                         transition-all duration-200"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={loading}
              />
              <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* 密码字段 */}
          <div className="space-y-2">
            <label htmlFor="password" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <Lock className="w-4 h-4 mr-2 text-gray-500" />
              密码 <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                required
                placeholder="请输入密码"
                className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 
                         rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                         focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400
                         transition-all duration-200"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
              />
              <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 邮箱字段 */}
          <div className="space-y-2">
            <label htmlFor="email" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <Mail className="w-4 h-4 mr-2 text-gray-500" />
              邮箱地址
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                placeholder="请输入邮箱地址（可选）"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 
                         rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                         focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400
                         transition-all duration-200"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
              />
              <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* 管理员权限开关 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2c2c2e] rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">管理员权限</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">拥有系统管理权限</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="isAdmin"
                className="sr-only peer"
                checked={formData.isAdmin}
                onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                disabled={loading}
              />
              <div className={`w-11 h-6 rounded-full peer transition-all duration-200 ${
                formData.isAdmin 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600' 
                  : 'bg-gray-200 dark:bg-gray-700'
              } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300/50 dark:peer-focus:ring-orange-800/50`}>
                <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 transition-transform duration-200 shadow-sm ${
                  formData.isAdmin ? 'translate-x-5' : 'translate-x-0'
                }`}></div>
              </div>
            </label>
          </div>

          {/* 按钮组 */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 
                       bg-gray-100 dark:bg-gray-800 rounded-lg
                       hover:bg-gray-200 dark:hover:bg-gray-700 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !formData.username.trim() || !formData.password.trim()}
              className="px-6 py-2.5 text-sm font-medium text-white 
                       bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg
                       hover:from-blue-700 hover:to-purple-700 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                       transition-all duration-200 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>创建中...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>创建用户</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 