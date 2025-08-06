/**
 * 权限模块常量
 * 统一管理权限模块映射规则
 */

export const PERMISSION_MODULES = {
  QUOTATION: 'quotation',
  PACKING: 'packing',
  INVOICE: 'invoice',
  PURCHASE: 'purchase',
  CUSTOMER: 'customer',
  HISTORY: 'history',
  AI_EMAIL: 'ai-email',
  ADMIN: 'admin'
  // 已移除 DATE_TOOLS: 'date-tools'
} as const;

export const PATH_TO_MODULE_ID = {
  '/quotation': PERMISSION_MODULES.QUOTATION,
  '/packing': PERMISSION_MODULES.PACKING,
  '/invoice': PERMISSION_MODULES.INVOICE,
  '/purchase': PERMISSION_MODULES.PURCHASE,
  '/customer': PERMISSION_MODULES.CUSTOMER,
  '/history': PERMISSION_MODULES.HISTORY,
  '/mail': PERMISSION_MODULES.AI_EMAIL,
  '/admin': PERMISSION_MODULES.ADMIN
  // 已移除 '/date-tools': PERMISSION_MODULES.DATE_TOOLS
} as const;

/**
 * 从路径获取模块ID
 * @param pathname 路径名
 * @returns 模块ID或null
 */
export function getModuleIdFromPath(pathname: string): string | null {
  // 移除开头的斜杠和结尾的斜杠
  const path = pathname.replace(/^\/+|\/+$/g, '');
  
  // 如果是API路由，取第二段
  if (path.startsWith('api/')) {
    const parts = path.split('/');
    return parts[1] || null;
  }
  
  // 取第一段作为路径
  const pathSegment = path.split('/')[0] || null;
  
  // 如果有映射，返回映射的模块ID，否则返回原路径
  return pathSegment ? (PATH_TO_MODULE_ID[`/${pathSegment}` as keyof typeof PATH_TO_MODULE_ID] || pathSegment) : null;
}

/**
 * 检查路径是否需要权限验证
 * @param pathname 路径名
 * @returns 是否需要权限验证
 */
export function requiresPermissionCheck(pathname: string): boolean {
  const moduleId = getModuleIdFromPath(pathname);
  return moduleId !== null && moduleId !== 'admin'; // admin由中间件处理
}

/**
 * 获取所有权限模块列表
 * @returns 权限模块列表
 */
export function getAllPermissionModules(): string[] {
  return Object.values(PERMISSION_MODULES);
} 