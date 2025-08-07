// 模块颜色映射配置 - 专属色系设计（高饱和度版本）

// 类型定义
interface ModuleColorConfig {
  bgColor: string;
  textColor: string;
}

export const moduleColorMap: { [key: string]: ModuleColorConfig } = {
  quotation: {
    bgColor:
      'bg-gradient-to-tr from-blue-300/80 to-blue-500/80 dark:from-blue-600/80 dark:to-blue-800/80',
    textColor: 'text-gray-800 dark:text-white',
  },
  confirmation: {
    bgColor:
      'bg-gradient-to-tr from-emerald-300/80 to-emerald-500/80 dark:from-emerald-600/80 dark:to-emerald-800/80',
    textColor: 'text-gray-800 dark:text-white',
  },
  packing: {
    bgColor:
      'bg-gradient-to-tr from-cyan-300/80 to-cyan-500/80 dark:from-cyan-600/80 dark:to-cyan-800/80',
    textColor: 'text-gray-800 dark:text-white',
  },
  invoice: {
    bgColor:
      'bg-gradient-to-tr from-violet-300/80 to-violet-500/80 dark:from-violet-600/80 dark:to-violet-800/80',
    textColor: 'text-gray-800 dark:text-white',
  },
  purchase: {
    bgColor:
      'bg-gradient-to-tr from-orange-300/80 to-orange-500/80 dark:from-orange-600/80 dark:to-orange-800/80',
    textColor: 'text-gray-800 dark:text-white',
  },
  'ai-email': {
    bgColor:
      'bg-gradient-to-tr from-indigo-300/80 to-indigo-500/80 dark:from-indigo-600/80 dark:to-indigo-800/80',
    textColor: 'text-gray-800 dark:text-white',
  },
  history: {
    bgColor:
      'bg-gradient-to-tr from-pink-300/80 to-pink-500/80 dark:from-pink-600/80 dark:to-pink-800/80',
    textColor: 'text-gray-800 dark:text-white',
  },
  customer: {
    bgColor:
      'bg-gradient-to-tr from-fuchsia-300/80 to-fuchsia-500/80 dark:from-fuchsia-600/80 dark:to-fuchsia-800/80',
    textColor: 'text-gray-800 dark:text-white',
  },
};

// 类型定义
export type ModuleId = keyof typeof moduleColorMap;
export type ModuleColors = typeof moduleColorMap[ModuleId];

// 获取模块颜色的工具函数
export const getModuleColors = (moduleId: string): ModuleColors => {
  return moduleColorMap[moduleId as ModuleId] || {
    bgColor: 'bg-gradient-to-tr from-gray-300/80 to-gray-500/80 dark:from-gray-600/80 dark:to-gray-800/80',
    textColor: 'text-gray-800 dark:text-white',
  };
};
