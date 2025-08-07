import { Permission } from '@/types/permissions';

interface PermissionMap {
  permissions: {
    quotation: boolean;
    packing: boolean;
    invoice: boolean;
    purchase: boolean;
    history: boolean;
    customer: boolean;
    'ai-email': boolean;
  };
  documentTypePermissions: {
    quotation: boolean;
    confirmation: boolean;
    packing: boolean;
    invoice: boolean;
    purchase: boolean;
  };
  accessibleDocumentTypes: string[];
}

// 使用 Map 加速权限判断
export const createPermissionMap = (permissions: Permission[]): Map<string, boolean> => {
  const permissionMap = new Map<string, boolean>();
  permissions.forEach(perm => {
    if (perm.canAccess) {
      permissionMap.set(perm.moduleId, true);
    }
  });
  return permissionMap;
};

// 构建权限映射
export const buildPermissionMap = (
  userPermissions?: Permission[],
  sessionPermissions?: Permission[],
  cachedPermissions?: Permission[]
): PermissionMap => {
  // 优先级1: 用户权限（最新）
  let permissions = userPermissions || [];
  
  // 优先级2: Session权限数据（备用）
  if (permissions.length === 0) {
    permissions = sessionPermissions || [];
  }
  
  // 优先级3: 本地缓存权限（快速）
  if (permissions.length === 0) {
    permissions = cachedPermissions || [];
  }
  
  // 如果权限数据为空，返回默认权限映射
  if (!permissions || permissions.length === 0) {
    return {
      permissions: {
        quotation: false,
        packing: false,
        invoice: false,
        purchase: false,
        history: false,
        customer: false,
        'ai-email': false
      },
      documentTypePermissions: {
        quotation: false,
        confirmation: false,
        packing: false,
        invoice: false,
        purchase: false
      },
      accessibleDocumentTypes: []
    };
  }

  // 使用 Map 加速权限判断
  const permissionMap = createPermissionMap(permissions);

  // 构建权限映射
  const permissionsResult = {
    quotation: permissionMap.get('quotation') === true,
    packing: permissionMap.get('packing') === true,
    invoice: permissionMap.get('invoice') === true,
    purchase: permissionMap.get('purchase') === true,
    history: permissionMap.get('history') === true,
    customer: permissionMap.get('customer') === true,
    'ai-email': permissionMap.get('ai-email') === true
  };

  const documentTypePermissions = {
    quotation: permissionMap.get('quotation') === true,
    confirmation: permissionMap.get('quotation') === true, // 销售确认也属于报价模块
    packing: permissionMap.get('packing') === true,
    invoice: permissionMap.get('invoice') === true,
    purchase: permissionMap.get('purchase') === true
  };

  // 构建可访问的文档类型列表
  const accessibleDocumentTypes = Object.entries(documentTypePermissions)
    .filter(([_, hasAccess]) => hasAccess)
    .map(([type, _]) => type);

  return {
    permissions: permissionsResult,
    documentTypePermissions,
    accessibleDocumentTypes
  };
};

// 检查用户是否有特定模块权限
export const hasModulePermission = (
  moduleId: string,
  permissions: Permission[]
): boolean => {
  const permissionMap = createPermissionMap(permissions);
  return permissionMap.get(moduleId) === true;
};

// 检查用户是否有特定文档类型权限
export const hasDocumentTypePermission = (
  documentType: string,
  permissions: Permission[]
): boolean => {
  const permissionMap = createPermissionMap(permissions);
  
  switch (documentType) {
    case 'quotation':
    case 'confirmation':
      return permissionMap.get('quotation') === true;
    case 'packing':
      return permissionMap.get('packing') === true;
    case 'invoice':
      return permissionMap.get('invoice') === true;
    case 'purchase':
      return permissionMap.get('purchase') === true;
    default:
      return false;
  }
}; 