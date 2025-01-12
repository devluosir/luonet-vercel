import { useState } from 'react';
import { X } from 'lucide-react';

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

  // 获取已开通的模块列表
  const availableModules = [
    { id: 'ai-email', name: 'AI邮件助手' },
    { id: 'quotation', name: '报价及确认' },
    { id: 'invoice', name: '发票助手' },
  ].filter(module => 
    user.permissions.some(p => p.moduleId === module.id && p.canAccess)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">个人资料</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-500 dark:text-red-200 p-4 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                用户名
              </label>
              <div className="mt-1 text-sm text-gray-900 dark:text-white">
                {user.username}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                邮箱
              </label>
              <div className="mt-1 text-sm text-gray-900 dark:text-white">
                {user.email || '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                已开通功能
              </label>
              <div className="mt-1 space-y-1">
                {availableModules.map(module => (
                  <div
                    key={module.id}
                    className="text-sm text-gray-900 dark:text-white flex items-center"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    {module.name}
                  </div>
                ))}
              </div>
            </div>

            {showChangePassword ? (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    当前密码
                  </label>
                  <input
                    type="password"
                    required
                    className="appearance-none block w-full px-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-base"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({
                      ...passwordForm,
                      currentPassword: e.target.value
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    新密码
                  </label>
                  <input
                    type="password"
                    required
                    className="appearance-none block w-full px-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-base"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    确认新密码
                  </label>
                  <input
                    type="password"
                    required
                    className="appearance-none block w-full px-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-base"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value
                    })}
                  />
                </div>

                <div className="mt-6 flex justify-end space-x-3">
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
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                           hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 
                           hover:bg-blue-700 rounded-md shadow-sm focus:outline-none 
                           focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                           disabled:opacity-50 transition-colors"
                  >
                    {loading ? '保存中...' : '保存'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 
                         dark:hover:text-blue-300 transition-colors"
                >
                  修改密码
                </button>
              </div>
            )}
            
            {!showChangePassword && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                         hover:text-gray-900 dark:hover:text-white transition-colors"
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