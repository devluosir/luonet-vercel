import { useState, useCallback } from 'react';
import { Permission } from '../types';

// 权限模块列表
export const MODULE_PERMISSIONS = [
  { id: 'quotation', name: '报价单', icon: '📋' },
  { id: 'packing', name: '装箱单', icon: '📦' },
  { id: 'invoice', name: '发票', icon: '🧾' },
  { id: 'purchase', name: '采购单', icon: '🛒' },
  { id: 'history', name: '历史记录', icon: '📚' },
  { id: 'customer', name: '客户管理', icon: '👥' },
  { id: 'ai-email', name: 'AI邮件', icon: '🤖' }
];

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // 初始化权限数据
  const initializePermissions = useCallback((userPermissions: Permission[]) => {
    setPermissions(userPermissions || []);
  }, []);

  // 切换权限开关
  const togglePermission = useCallback((moduleId: string) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.moduleId === moduleId);
      if (existing) {
        return prev.map(p => 
          p.moduleId === moduleId 
            ? { ...p, canAccess: !p.canAccess }
            : p
        );
      } else {
        return [...prev, { id: '', moduleId, canAccess: true }];
      }
    });
  }, []);

  // 重置权限
  const resetPermissions = useCallback(() => {
    setPermissions([]);
  }, []);

  // 检查权限是否已更改
  const hasChanges = useCallback((originalPermissions: Permission[]) => {
    if (permissions.length !== originalPermissions.length) return true;
    
    return permissions.some(perm => {
      const original = originalPermissions.find(p => p.moduleId === perm.moduleId);
      return !original || original.canAccess !== perm.canAccess;
    });
  }, [permissions]);

  return {
    permissions,
    initializePermissions,
    togglePermission,
    resetPermissions,
    hasChanges
  };
}
