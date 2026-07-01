export type ModuleCategory = 'document' | 'registration' | 'management' | 'tool';

export interface AdvancedFeatureDef {
  /** 完整 moduleId，格式为 `${parentModuleId}.${featureKey}` */
  moduleId: string;
  label: string;
  icon: string;
}

export interface PermissionModuleDef {
  moduleId: string;
  label: string;
  icon: string;
  category: ModuleCategory;
  /** 依赖本模块开启后才能授予的二级“高级功能”开关 */
  advancedFeatures?: AdvancedFeatureDef[];
}

/** 权限模块唯一注册表：新增或下线模块只改这一处 */
export const PERMISSION_MODULES: PermissionModuleDef[] = [
  { moduleId: 'quotation', label: '报价单 / 销售确认', icon: '📋', category: 'document' },
  { moduleId: 'packing', label: '箱单发票', icon: '📦', category: 'document' },
  { moduleId: 'invoice', label: '财务发票', icon: '🧾', category: 'document' },
  { moduleId: 'purchase', label: '采购订单', icon: '🛒', category: 'document' },
  {
    moduleId: 'inquiry',
    label: '询报价登记表 / 订单状态表',
    icon: '🔍',
    category: 'registration',
    advancedFeatures: [
      { moduleId: 'inquiry.batchEdit', label: '批量编辑 / 导入导出', icon: '✏️' },
      { moduleId: 'order.financials', label: '订单金额 / 回款 / 到账金额', icon: '💰' },
    ],
  },
  { moduleId: 'history', label: '单据历史', icon: '📚', category: 'management' },
  { moduleId: 'customer', label: '客户管理', icon: '👥', category: 'management' },
  { moduleId: 'ai-email', label: 'AI 邮件', icon: '🤖', category: 'tool' },
  { moduleId: 'clock', label: '世界时钟', icon: '🕐', category: 'tool' },
  { moduleId: 'holidays', label: '全球假日', icon: '📅', category: 'tool' },
  { moduleId: 'rmb', label: 'RMB 大写', icon: '💴', category: 'tool' },
];

export function getAllPermissionModules(): string[] {
  return PERMISSION_MODULES.flatMap((module) => [
    module.moduleId,
    ...(module.advancedFeatures?.map((feature) => feature.moduleId) ?? []),
  ]);
}
