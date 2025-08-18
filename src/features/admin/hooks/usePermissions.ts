import { useState, useCallback, useMemo } from 'react';
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
  const [originalPermissions, setOriginalPermissions] = useState<Permission[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [originalIsAdmin, setOriginalIsAdmin] = useState(false);
  const [originalIsActive, setOriginalIsActive] = useState(false);

  // 初始化权限数据
  const initializePermissions = useCallback((userPermissions: Permission[], userIsAdmin: boolean, userIsActive: boolean) => {
    const perms = userPermissions || [];
    setPermissions(perms);
    setOriginalPermissions(perms);
    setIsAdmin(userIsAdmin);
    setOriginalIsAdmin(userIsAdmin);
    setIsActive(userIsActive);
    setOriginalIsActive(userIsActive);
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

  // 切换管理员状态
  const toggleAdmin = useCallback(() => {
    setIsAdmin(prev => !prev);
  }, []);

  // 切换活跃状态
  const toggleActive = useCallback(() => {
    setIsActive(prev => !prev);
  }, []);

  // 重置权限
  const resetPermissions = useCallback(() => {
    setPermissions(originalPermissions);
    setIsAdmin(originalIsAdmin);
    setIsActive(originalIsActive);
  }, [originalPermissions, originalIsAdmin, originalIsActive]);

  // 检查权限是否已更改
  const hasChanges = useMemo(() => {
    if (permissions.length !== originalPermissions.length) return true;
    
    const permissionChanged = permissions.some(perm => {
      const original = originalPermissions.find(p => p.moduleId === perm.moduleId);
      return !original || original.canAccess !== perm.canAccess;
    });

    const adminChanged = isAdmin !== originalIsAdmin;
    const activeChanged = isActive !== originalIsActive;

    return permissionChanged || adminChanged || activeChanged;
  }, [permissions, originalPermissions, isAdmin, originalIsAdmin, isActive, originalIsActive]);

  return {
    permissions,
    isAdmin,
    isActive,
    initializePermissions,
    togglePermission,
    toggleAdmin,
    toggleActive,
    resetPermissions,
    hasChanges
  };
}
