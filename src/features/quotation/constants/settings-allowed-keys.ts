/**
 * SettingsPanel 允许修改的字段白名单
 * 严格控制 UI 可以写入的 store 字段，防止意外的大补丁更新
 */

export const SETTINGS_ALLOWED_KEYS = new Set([
  // 显示控制开关
  'showRemarks',
  'showDescription', 
  'showBank',
  'showStamp',
  'showPaymentTerms',
  'showInvoiceReminder',
  
  // 模板配置
  'templateConfig', // 包含 headerType, stampType 等
  
  // 基础字段
  'currency',
  'from',
  
  // 自定义单位
  'customUnits',
  
  // 支付条款
  'additionalPaymentTerms',
  'showMainPaymentTerm',
  'paymentDate',
]);

/**
 * 检查字段是否在允许的设置字段列表中
 * @param key 字段名
 * @returns 是否允许
 */
export const isAllowedSettingsKey = (key: string): boolean => {
  return SETTINGS_ALLOWED_KEYS.has(key);
};

/**
 * 过滤出允许的设置字段
 * @param patch 待过滤的补丁对象
 * @returns 过滤后的对象
 */
export const filterAllowedKeys = (patch: Record<string, any>): Record<string, any> => {
  return Object.fromEntries(
    Object.entries(patch).filter(([key]) => isAllowedSettingsKey(key))
  );
};
