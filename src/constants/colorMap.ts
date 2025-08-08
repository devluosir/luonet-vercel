// 模块颜色映射配置 - 支持多主题

import { ButtonTheme } from '@/hooks/useThemeSettings';

// 类型定义
interface ModuleColorConfig {
  // 彩色主题配置
  colorful: {
    bgFrom: string;
    bgTo: string;
    hoverFrom: string;
    hoverTo: string;
    textColor: string;
    iconBg: string;
    darkBgFrom: string;
    darkBgTo: string;
    darkHoverFrom: string;
    darkHoverTo: string;
    // 徽章颜色
    badgeBg: string;
    badgeText: string;
  };
  // 经典白色主题配置
  classic: {
    bgColor: string;
    hoverBgColor: string;
    textColor: string;
    iconBg: string;
    hoverIconBg: string;
    // 徽章颜色
    badgeBg: string;
    badgeText: string;
  };
}

export const moduleColorMap: { [key: string]: ModuleColorConfig } = {
  quotation: {
    colorful: {
      bgFrom: 'from-blue-100',
      bgTo: 'to-blue-200',
      hoverFrom: 'hover:from-blue-200',
      hoverTo: 'hover:to-blue-300',
      textColor: 'text-neutral-800 dark:text-white',
      iconBg: 'bg-white/30 backdrop-blur-sm',
      darkBgFrom: 'dark:from-blue-300/70',
      darkBgTo: 'dark:to-blue-500/70',
      darkHoverFrom: 'dark:hover:from-blue-400/80',
      darkHoverTo: 'dark:hover:to-blue-600/80',
      badgeBg: 'bg-blue-600 dark:bg-blue-500',
      badgeText: 'text-white',
    },
    classic: {
      bgColor: 'bg-white/30 dark:bg-gray-800/30',
      hoverBgColor: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-white/20 backdrop-blur-sm',
      hoverIconBg: 'group-hover:bg-blue-100/50 dark:group-hover:bg-blue-900/30',
      badgeBg: 'bg-gray-800/80 dark:bg-gray-700/80',
      badgeText: 'text-white',
    },
  },
  confirmation: {
    colorful: {
      bgFrom: 'from-emerald-100',
      bgTo: 'to-emerald-200',
      hoverFrom: 'hover:from-emerald-200',
      hoverTo: 'hover:to-emerald-300',
      textColor: 'text-neutral-800 dark:text-white',
      iconBg: 'bg-white/30 backdrop-blur-sm',
      darkBgFrom: 'dark:from-emerald-300/70',
      darkBgTo: 'dark:to-emerald-500/70',
      darkHoverFrom: 'dark:hover:from-emerald-400/80',
      darkHoverTo: 'dark:hover:to-emerald-600/80',
      badgeBg: 'bg-emerald-600 dark:bg-emerald-500',
      badgeText: 'text-white',
    },
    classic: {
      bgColor: 'bg-white/30 dark:bg-gray-800/30',
      hoverBgColor: 'hover:bg-green-50 dark:hover:bg-green-900/20',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-white/20 backdrop-blur-sm',
      hoverIconBg: 'group-hover:bg-green-100/50 dark:group-hover:bg-green-900/30',
      badgeBg: 'bg-gray-800/80 dark:bg-gray-700/80',
      badgeText: 'text-white',
    },
  },
  packing: {
    colorful: {
      bgFrom: 'from-cyan-100',
      bgTo: 'to-cyan-200',
      hoverFrom: 'hover:from-cyan-200',
      hoverTo: 'hover:to-cyan-300',
      textColor: 'text-neutral-800 dark:text-white',
      iconBg: 'bg-white/30 backdrop-blur-sm',
      darkBgFrom: 'dark:from-cyan-300/70',
      darkBgTo: 'dark:to-cyan-500/70',
      darkHoverFrom: 'dark:hover:from-cyan-400/80',
      darkHoverTo: 'dark:hover:to-cyan-600/80',
      badgeBg: 'bg-cyan-600 dark:bg-cyan-500',
      badgeText: 'text-white',
    },
    classic: {
      bgColor: 'bg-white/30 dark:bg-gray-800/30',
      hoverBgColor: 'hover:bg-teal-50 dark:hover:bg-teal-900/20',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-white/20 backdrop-blur-sm',
      hoverIconBg: 'group-hover:bg-teal-100/50 dark:group-hover:bg-teal-900/30',
      badgeBg: 'bg-gray-800/80 dark:bg-gray-700/80',
      badgeText: 'text-white',
    },
  },
  invoice: {
    colorful: {
      bgFrom: 'from-violet-100',
      bgTo: 'to-violet-200',
      hoverFrom: 'hover:from-violet-200',
      hoverTo: 'hover:to-violet-300',
      textColor: 'text-neutral-800 dark:text-white',
      iconBg: 'bg-white/30 backdrop-blur-sm',
      darkBgFrom: 'dark:from-violet-300/70',
      darkBgTo: 'dark:to-violet-500/70',
      darkHoverFrom: 'dark:hover:from-violet-400/80',
      darkHoverTo: 'dark:hover:to-violet-600/80',
      badgeBg: 'bg-violet-600 dark:bg-violet-500',
      badgeText: 'text-white',
    },
    classic: {
      bgColor: 'bg-white/30 dark:bg-gray-800/30',
      hoverBgColor: 'hover:bg-purple-50 dark:hover:bg-purple-900/20',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-white/20 backdrop-blur-sm',
      hoverIconBg: 'group-hover:bg-purple-100/50 dark:group-hover:bg-purple-900/30',
      badgeBg: 'bg-gray-800/80 dark:bg-gray-700/80',
      badgeText: 'text-white',
    },
  },
  purchase: {
    colorful: {
      bgFrom: 'from-orange-100',
      bgTo: 'to-orange-200',
      hoverFrom: 'hover:from-orange-200',
      hoverTo: 'hover:to-orange-300',
      textColor: 'text-neutral-800 dark:text-white',
      iconBg: 'bg-white/30 backdrop-blur-sm',
      darkBgFrom: 'dark:from-orange-300/70',
      darkBgTo: 'dark:to-orange-500/70',
      darkHoverFrom: 'dark:hover:from-orange-400/80',
      darkHoverTo: 'dark:hover:to-orange-600/80',
      badgeBg: 'bg-orange-600 dark:bg-orange-500',
      badgeText: 'text-white',
    },
    classic: {
      bgColor: 'bg-white/30 dark:bg-gray-800/30',
      hoverBgColor: 'hover:bg-orange-50 dark:hover:bg-orange-900/20',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-white/20 backdrop-blur-sm',
      hoverIconBg: 'group-hover:bg-orange-100/50 dark:group-hover:bg-orange-900/30',
      badgeBg: 'bg-gray-800/80 dark:bg-gray-700/80',
      badgeText: 'text-white',
    },
  },
  'ai-email': {
    colorful: {
      bgFrom: 'from-indigo-100',
      bgTo: 'to-indigo-200',
      hoverFrom: 'hover:from-indigo-200',
      hoverTo: 'hover:to-indigo-300',
      textColor: 'text-neutral-800 dark:text-white',
      iconBg: 'bg-white/30 backdrop-blur-sm',
      darkBgFrom: 'dark:from-indigo-300/70',
      darkBgTo: 'dark:to-indigo-500/70',
      darkHoverFrom: 'dark:hover:from-indigo-400/80',
      darkHoverTo: 'dark:hover:to-indigo-600/80',
      badgeBg: 'bg-indigo-600 dark:bg-indigo-500',
      badgeText: 'text-white',
    },
    classic: {
      bgColor: 'bg-white/30 dark:bg-gray-800/30',
      hoverBgColor: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-white/20 backdrop-blur-sm',
      hoverIconBg: 'group-hover:bg-indigo-100/50 dark:group-hover:bg-indigo-900/30',
      badgeBg: 'bg-gray-800/80 dark:bg-gray-700/80',
      badgeText: 'text-white',
    },
  },
  history: {
    colorful: {
      bgFrom: 'from-pink-100',
      bgTo: 'to-pink-200',
      hoverFrom: 'hover:from-pink-200',
      hoverTo: 'hover:to-pink-300',
      textColor: 'text-neutral-800 dark:text-white',
      iconBg: 'bg-white/30 backdrop-blur-sm',
      darkBgFrom: 'dark:from-pink-300/70',
      darkBgTo: 'dark:to-pink-500/70',
      darkHoverFrom: 'dark:hover:from-pink-400/80',
      darkHoverTo: 'dark:hover:to-pink-600/80',
      badgeBg: 'bg-pink-600 dark:bg-pink-500',
      badgeText: 'text-white',
    },
    classic: {
      bgColor: 'bg-white/30 dark:bg-gray-800/30',
      hoverBgColor: 'hover:bg-pink-50 dark:hover:bg-pink-900/20',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-white/20 backdrop-blur-sm',
      hoverIconBg: 'group-hover:bg-pink-100/50 dark:group-hover:bg-pink-900/30',
      badgeBg: 'bg-gray-800/80 dark:bg-gray-700/80',
      badgeText: 'text-white',
    },
  },
  customer: {
    colorful: {
      bgFrom: 'from-fuchsia-100',
      bgTo: 'to-fuchsia-200',
      hoverFrom: 'hover:from-fuchsia-200',
      hoverTo: 'hover:to-fuchsia-300',
      textColor: 'text-neutral-800 dark:text-white',
      iconBg: 'bg-white/30 backdrop-blur-sm',
      darkBgFrom: 'dark:from-fuchsia-300/70',
      darkBgTo: 'dark:to-fuchsia-500/70',
      darkHoverFrom: 'dark:hover:from-fuchsia-400/80',
      darkHoverTo: 'dark:hover:to-fuchsia-600/80',
      badgeBg: 'bg-fuchsia-600 dark:bg-fuchsia-500',
      badgeText: 'text-white',
    },
    classic: {
      bgColor: 'bg-white/30 dark:bg-gray-800/30',
      hoverBgColor: 'hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-white/20 backdrop-blur-sm',
      hoverIconBg: 'group-hover:bg-fuchsia-100/50 dark:group-hover:bg-fuchsia-900/30',
      badgeBg: 'bg-gray-800/80 dark:bg-gray-700/80',
      badgeText: 'text-white',
    },
  },
};

// 类型定义
export type ModuleId = keyof typeof moduleColorMap;
export type ModuleColors = typeof moduleColorMap[ModuleId];

// 获取模块颜色的工具函数
export const getModuleColors = (moduleId: string, theme: ButtonTheme = 'colorful') => {
  const moduleConfig = moduleColorMap[moduleId as ModuleId];
  
  if (!moduleConfig) {
    // 默认配置
    return {
      colorful: {
        bgFrom: 'from-gray-100',
        bgTo: 'to-gray-200',
        hoverFrom: 'hover:from-gray-200',
        hoverTo: 'hover:to-gray-300',
        textColor: 'text-neutral-800 dark:text-white',
        iconBg: 'bg-white/30 backdrop-blur-sm',
        darkBgFrom: 'dark:from-gray-300/70',
        darkBgTo: 'dark:to-gray-500/70',
        darkHoverFrom: 'dark:hover:from-gray-400/80',
        darkHoverTo: 'dark:hover:to-gray-600/80',
        badgeBg: 'bg-gray-600 dark:bg-gray-500',
        badgeText: 'text-white',
      },
      classic: {
        bgColor: 'bg-white/30 dark:bg-gray-800/30',
        hoverBgColor: 'hover:bg-gray-50 dark:hover:bg-gray-900/20',
        textColor: 'text-gray-800 dark:text-white',
        iconBg: 'bg-white/20 backdrop-blur-sm',
        hoverIconBg: 'group-hover:bg-gray-100/50 dark:group-hover:bg-gray-900/30',
        badgeBg: 'bg-gray-800/80 dark:bg-gray-700/80',
        badgeText: 'text-white',
      },
    }[theme];
  }
  
  return moduleConfig[theme];
};
