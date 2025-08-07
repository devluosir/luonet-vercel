// 模块颜色映射配置
export const moduleColorMap = {
  // 快速创建模块
  quotation: {
    bgColor: 'bg-transparent hover:bg-blue-50/50 dark:bg-transparent dark:hover:bg-blue-900/10',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },
  confirmation: {
    bgColor: 'bg-transparent hover:bg-emerald-50/50 dark:bg-transparent dark:hover:bg-emerald-900/10',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },
  packing: {
    bgColor: 'bg-transparent hover:bg-cyan-50/50 dark:bg-transparent dark:hover:bg-cyan-900/10',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },
  invoice: {
    bgColor: 'bg-transparent hover:bg-violet-50/50 dark:bg-transparent dark:hover:bg-violet-900/10',
    iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },
  purchase: {
    bgColor: 'bg-transparent hover:bg-orange-50/50 dark:bg-transparent dark:hover:bg-orange-900/10',
    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },

  // 工具模块
  'ai-email': {
    bgColor: 'bg-transparent hover:bg-indigo-50/50 dark:bg-transparent dark:hover:bg-indigo-900/10',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },

  // 管理中心模块
  history: {
    bgColor: 'bg-transparent hover:bg-rose-50/50 dark:bg-transparent dark:hover:bg-rose-900/10',
    iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },
  customer: {
    bgColor: 'bg-transparent hover:bg-fuchsia-50/50 dark:bg-transparent dark:hover:bg-fuchsia-900/10',
    iconBg: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 dark:from-fuchsia-600 dark:to-fuchsia-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },
} as const;

// 类型定义
export type ModuleId = keyof typeof moduleColorMap;
export type ModuleColors = typeof moduleColorMap[ModuleId];

// 获取模块颜色的工具函数
export const getModuleColors = (moduleId: string): ModuleColors => {
  return moduleColorMap[moduleId as ModuleId] || {
    bgColor: 'bg-transparent hover:bg-gray-50/50 dark:bg-transparent dark:hover:bg-gray-900/10',
    iconBg: 'bg-gradient-to-br from-gray-500 to-gray-600 dark:from-gray-600 dark:to-gray-700',
    textColor: 'text-gray-700 dark:text-gray-300',
  };
};
