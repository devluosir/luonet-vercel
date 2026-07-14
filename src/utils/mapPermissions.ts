import type { Permission, PermissionMap } from '@/types/permissions';
import type { DocumentType } from '@/utils/dashboardUtils';

// 创建权限映射Map
export const createPermissionMap = (permissions: Permission[]): Map<string, boolean> => {
  const permissionMap = new Map<string, boolean>();
  
  permissions.forEach(permission => {
    permissionMap.set(permission.moduleId, permission.canAccess);
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
        confirmation: false,
        domesticQuotation: false,
        packing: false,
        invoice: false,
        purchase: false,
        history: false,
        customer: false,
        purchaseSupplier: false,
        'ai-email': false,
        impa: false,
        inquiry: false,
        purchaseRegistration: false,
        clock: false,
        holidays: false,
        rmb: false,
      },
      documentTypePermissions: {
        quotation: false,
        confirmation: false,
        'domestic-quotation': false,
        'domestic-contract': false,
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
    confirmation: permissionMap.get('quotation') === true, // 销售确认也属于报价模块
    domesticQuotation: permissionMap.get('domesticQuotation') === true,
    packing: permissionMap.get('packing') === true,
    invoice: permissionMap.get('invoice') === true,
    purchase: permissionMap.get('purchase') === true,
    history: permissionMap.get('history') === true,
    customer: permissionMap.get('customer') === true,
    purchaseSupplier: permissionMap.get('purchaseSupplier') === true,
    'ai-email': permissionMap.get('ai-email') === true,
    impa: permissionMap.get('impa') === true,
    inquiry: permissionMap.get('inquiry') === true,
    purchaseRegistration: permissionMap.get('purchaseRegistration') === true,
    clock: permissionMap.get('clock') === true,
    holidays: permissionMap.get('holidays') === true,
    rmb: permissionMap.get('rmb') === true,
  };

  const documentTypePermissions = {
    quotation: permissionMap.get('quotation') === true,
    confirmation: permissionMap.get('quotation') === true, // 销售确认也属于报价模块
    'domestic-quotation': permissionMap.get('domesticQuotation') === true,
    'domestic-contract': permissionMap.get('domesticQuotation') === true,
    packing: permissionMap.get('packing') === true,
    invoice: permissionMap.get('invoice') === true,
    purchase: permissionMap.get('purchase') === true
  };

  // 构建可访问的文档类型列表
  const accessibleDocumentTypes = Object.entries(documentTypePermissions)
    .filter(([_, hasAccess]) => hasAccess)
    .map(([type, _]) => type as DocumentType);

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
    case 'domestic-quotation':
    case 'domestic-contract':
      return permissionMap.get('domesticQuotation') === true;
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
