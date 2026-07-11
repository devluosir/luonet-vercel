import { useState, useCallback, useMemo } from 'react';
import {
  DOCUMENT_TYPE_MODULE_IDS,
  PERMISSION_MODULES,
  getAllPermissionModules,
} from '@/constants/permissionModules';
import { Permission } from '../types';

export const MODULE_PERMISSIONS = PERMISSION_MODULES.map(({ moduleId, label, icon }) => ({
  id: moduleId,
  name: label,
  icon,
}));

function normalizePermissions(userPermissions: Permission[]): Permission[] {
  return getAllPermissionModules().map((moduleId) => {
    const existing = userPermissions.find((permission) => permission.moduleId === moduleId);

    return {
      id: existing?.id ?? '',
      moduleId,
      canAccess: existing?.canAccess ?? false,
    };
  });
}

/** 根据单据类权限重新计算 history：任一开启则开启，否则关闭。 */
export function deriveHistoryPermission(perms: Permission[]): Permission[] {
  const hasAnyDocumentPermission = DOCUMENT_TYPE_MODULE_IDS.some(
    (moduleId) => perms.find((permission) => permission.moduleId === moduleId)?.canAccess === true
  );
  const existing = perms.find((permission) => permission.moduleId === 'history');
  const historyEntry: Permission = {
    id: existing?.id ?? '',
    moduleId: 'history',
    canAccess: hasAnyDocumentPermission,
  };

  return existing
    ? perms.map((permission) => permission.moduleId === 'history' ? historyEntry : permission)
    : [...perms, historyEntry];
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<Permission[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [originalIsAdmin, setOriginalIsAdmin] = useState(false);
  const [originalIsActive, setOriginalIsActive] = useState(false);

  // 初始化权限数据
  const initializePermissions = useCallback((userPermissions: Permission[], userIsAdmin: boolean, userIsActive: boolean) => {
    const perms = deriveHistoryPermission(normalizePermissions(userPermissions || []));
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
      if (moduleId === 'history') return prev;

      const existing = prev.find(p => p.moduleId === moduleId);
      let next = existing
        ? prev.map(p =>
          p.moduleId === moduleId
            ? { ...p, canAccess: !p.canAccess }
            : p
        )
        : [...prev, { id: '', moduleId, canAccess: true }];

      const parentModule = PERMISSION_MODULES.find(
        (module) => module.moduleId === moduleId && module.advancedFeatures?.length
      );
      const turnedOff = existing?.canAccess === true;
      if (parentModule && turnedOff) {
        const childIds = parentModule.advancedFeatures?.map((feature) => feature.moduleId) ?? [];
        next = next.map((permission) =>
          childIds.includes(permission.moduleId)
            ? { ...permission, canAccess: false }
            : permission
        );
      }

      if ((DOCUMENT_TYPE_MODULE_IDS as readonly string[]).includes(moduleId)) {
        next = deriveHistoryPermission(next);
      }

      return next;
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
