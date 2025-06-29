import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '创建用户失败');
      }

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-lg shadow-xl w-full max-w-md mx-4 relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">添加用户</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/50 text-red-500 dark:text-red-200 p-4 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              用户名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="username"
              required
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 
                     shadow-sm focus:border-blue-500 focus:ring-blue-500 
                     dark:bg-[#2c2c2e] dark:text-white"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              密码 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="password"
              required
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 
                     shadow-sm focus:border-blue-500 focus:ring-blue-500 
                     dark:bg-[#2c2c2e] dark:text-white"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              邮箱
            </label>
            <input
              type="email"
              id="email"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 
                     shadow-sm focus:border-blue-500 focus:ring-blue-500 
                     dark:bg-[#2c2c2e] dark:text-white"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isAdmin"
              className="h-4 w-4 flex-shrink-0 appearance-none border-2 border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-[#2c2c2e] 
                checked:bg-blue-600 checked:border-blue-600 checked:dark:bg-blue-500 checked:dark:border-blue-500
                focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1
                relative before:content-[''] before:absolute before:top-0.5 before:left-1 before:w-1 before:h-2 
                before:border-r-2 before:border-b-2 before:border-white before:rotate-45 before:scale-0 
                checked:before:scale-100 before:transition-transform before:duration-200"
              style={{
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
              checked={formData.isAdmin}
              onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
            />
            <label htmlFor="isAdmin" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              管理员权限
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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
              {loading ? '创建中...' : '创建用户'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 