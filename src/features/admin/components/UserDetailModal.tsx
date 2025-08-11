import { useEffect, useState } from 'react';
import { X, User, Mail, Shield, Save, RotateCcw } from 'lucide-react';
import { User as UserType, Permission } from '../types';
import { usePermissions, MODULE_PERMISSIONS } from '../hooks/usePermissions';

interface UserDetailModalProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, permissions: Permission[]) => Promise<void>;
}

export function UserDetailModal({ user, isOpen, onClose, onSave }: UserDetailModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { permissions, initializePermissions, togglePermission, hasChanges, resetPermissions } = usePermissions();

  // 初始化权限数据
  useEffect(() => {
    if (user && isOpen) {
      initializePermissions(user.permissions || []);
    }
  }, [user, isOpen, initializePermissions]);

  // 保存权限
  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await onSave(user.id, permissions);
      onClose();
    } catch (error) {
      setError('保存失败，请重试');
      console.error('保存权限失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    if (user) {
      resetPermissions();
      initializePermissions(user.permissions || []);
    }
    onClose();
  };

  if (!isOpen || !user) return null;

  const hasPermissionChanges = hasChanges(user.permissions || []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 relative border border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">用户权限设置</h2>
                <p className="text-blue-100 text-sm mt-0.5">管理 {user.username} 的模块访问权限</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200 disabled:opacity-50"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 错误提示 */}
          {error && (
            <div className="flex items-start space-x-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 p-4 rounded-xl">
              <div className="text-red-500 text-lg">⚠️</div>
              <div>
                <p className="font-medium text-sm">操作失败</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* 用户信息 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                user.isAdmin 
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                  : 'bg-gradient-to-br from-gray-500 to-gray-600'
              }`}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-lg text-gray-900 dark:text-white">{user.username}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{user.email || '未设置邮箱'}</div>
                <div className="flex items-center gap-2 mt-1">
                  {user.isAdmin && (
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full">
                      管理员
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.status 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  }`}>
                    {user.status ? '活跃' : '非活跃'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 权限开关 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">模块权限</h3>
              {hasPermissionChanges && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      resetPermissions();
                      initializePermissions(user.permissions || []);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重置
                  </button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MODULE_PERMISSIONS.map(module => {
                const permission = permissions.find(p => p.moduleId === module.id);
                const isEnabled = permission?.canAccess || false;
                
                return (
                  <div key={module.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{module.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{module.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">模块访问权限</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isEnabled}
                        onChange={() => togglePermission(module.id)}
                      />
                      <div className={`w-11 h-6 rounded-full peer transition-all duration-200 ${
                        isEnabled 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                          : 'bg-gray-200 dark:bg-gray-700'
                      } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50 dark:peer-focus:ring-blue-800/50`}>
                        <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 transition-transform duration-200 shadow-sm ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}></div>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 
                       bg-gray-100 dark:bg-gray-800 rounded-lg
                       hover:bg-gray-200 dark:hover:bg-gray-700 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasPermissionChanges}
              className="px-6 py-2.5 text-sm font-medium text-white 
                       bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg
                       hover:from-blue-700 hover:to-purple-700 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                       transition-all duration-200 flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>保存权限</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
