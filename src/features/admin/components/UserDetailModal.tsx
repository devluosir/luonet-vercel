import { useEffect, useState } from 'react';
import { X, User, RotateCcw } from 'lucide-react';
import { User as UserType, Permission } from '../types';
import { usePermissions, MODULE_PERMISSIONS } from '../hooks/usePermissions';
import { PermissionToggle } from './PermissionToggle';
import { UserStatusBadge } from './UserStatusBadge';
import { ErrorMessage } from './ErrorMessage';
import { ActionButtons } from './ActionButtons';

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

  const hasPermissionChanges = hasChanges;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-xl w-full max-w-sm sm:max-w-lg mx-2 sm:mx-4 relative border border-gray-200/50 dark:border-gray-800/50">
        {/* 头部 */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white truncate">用户权限设置</h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{user.username}</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
          {/* 错误提示 */}
          <ErrorMessage message={error || ''} />

          {/* 用户状态 */}
          <UserStatusBadge isAdmin={user.isAdmin} isActive={user.status} />

          {/* 权限设置 */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white text-xs sm:text-base">模块权限</h3>
              {hasPermissionChanges && (
                <button
                  onClick={() => {
                    resetPermissions();
                    initializePermissions(user.permissions || []);
                  }}
                  className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">重置</span>
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2.5 sm:gap-2">
              {MODULE_PERMISSIONS.map(module => {
                const permission = permissions.find(p => p.moduleId === module.id);
                const isEnabled = permission?.canAccess || false;
                
                return (
                  <PermissionToggle
                    key={module.id}
                    moduleId={module.id}
                    name={module.name}
                    icon={module.icon}
                    isEnabled={isEnabled}
                    onToggle={togglePermission}
                  />
                );
              })}
            </div>
          </div>

          {/* 操作按钮 */}
          <ActionButtons
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
            hasChanges={hasPermissionChanges}
          />
        </div>
      </div>
    </div>
  );
}
