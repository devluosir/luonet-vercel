import { DashboardModule, PermissionMap } from '../types';

/**
 * 根据权限过滤快速创建模块
 */
export const filterQuickCreateModules = (
  modules: DashboardModule[], 
  permissionMap: PermissionMap
): DashboardModule[] => {
  return modules.filter(module => {
    switch (module.id) {
      case 'quotation':
      case 'confirmation':
        return permissionMap.permissions.quotation;
      case 'packing':
        return permissionMap.permissions.packing;
      case 'invoice':
        return permissionMap.permissions.invoice;
      case 'purchase':
        return permissionMap.permissions.purchase;
      default:
        return true;
    }
  });
};

/**
 * 根据权限过滤工具模块
 */
export const filterToolModules = (
  modules: DashboardModule[], 
  permissionMap: PermissionMap
): DashboardModule[] => {
  return modules.filter(module => {
    switch (module.id) {
      case 'ai-email':
        return permissionMap.permissions['ai-email'];
      default:
        return true;
    }
  });
};

/**
 * 根据权限过滤管理中心模块
 */
export const filterToolsModules = (
  modules: DashboardModule[], 
  permissionMap: PermissionMap
): DashboardModule[] => {
  return modules.filter(module => {
    switch (module.id) {
      case 'history':
        return permissionMap.permissions.history;
      case 'customer':
        return permissionMap.permissions.customer;
      default:
        return true;
    }
  });
};
