// 模块颜色映射配置
export const moduleColorMap = {
  // 快速创建模块
  quotation: {
    bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-900/20 dark:to-blue-800/30 dark:hover:from-blue-800/30 dark:hover:to-blue-700/40',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },
  confirmation: {
    bgColor: 'bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 dark:from-emerald-900/20 dark:to-emerald-800/30 dark:hover:from-emerald-800/30 dark:hover:to-emerald-700/40',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },
  packing: {
    bgColor: 'bg-gradient-to-br from-cyan-50 to-cyan-100 hover:from-cyan-100 hover:to-cyan-200 dark:from-cyan-900/20 dark:to-cyan-800/30 dark:hover:from-cyan-800/30 dark:hover:to-cyan-700/40',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },
  invoice: {
    bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100 hover:from-violet-100 hover:to-violet-200 dark:from-violet-900/20 dark:to-violet-800/30 dark:hover:from-violet-800/30 dark:hover:to-violet-700/40',
    iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },
  purchase: {
    bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 dark:from-orange-900/20 dark:to-orange-800/30 dark:hover:from-orange-800/30 dark:hover:to-orange-700/40',
    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },

  // 工具模块
  'ai-email': {
    bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 dark:from-indigo-900/20 dark:to-indigo-800/30 dark:hover:from-indigo-800/30 dark:hover:to-indigo-700/40',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },

  // 管理中心模块
  history: {
    bgColor: 'bg-gradient-to-br from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 dark:from-rose-900/20 dark:to-rose-800/30 dark:hover:from-rose-800/30 dark:hover:to-rose-700/40',
    iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-700',
    textColor: 'text-gray-800 dark:text-gray-200',
  },
  customer: {
    bgColor: 'bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 hover:from-fuchsia-100 hover:to-fuchsia-200 dark:from-fuchsia-900/20 dark:to-fuchsia-800/30 dark:hover:from-fuchsia-800/30 dark:hover:to-fuchsia-700/40',
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
    bgColor: 'bg-gradient-to-br from-gray-50/80 to-gray-100/60 hover:from-gray-100/90 hover:to-gray-200/80 dark:from-gray-800/20 dark:to-gray-700/30 dark:hover:from-gray-700/40 dark:hover:to-gray-600/50',
    iconBg: 'bg-gradient-to-br from-gray-500 to-gray-600 dark:from-gray-600 dark:to-gray-700',
    textColor: 'text-gray-700 dark:text-gray-300',
  };
};
