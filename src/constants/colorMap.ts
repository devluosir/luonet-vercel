// 模块颜色映射配置 - 支持多主题

import { ButtonTheme } from '@/hooks/useThemeSettings';

// 类型定义
interface ThemeGradientConfig {
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
  badgeBg: string;
  badgeText: string;
  // 可选：图标悬停增强/纯色
  hoverIconBg?: string;
  // 可选：图标颜色（优先于 textColor 应用于图标）
  iconColor?: string;
}

interface ModuleColorConfig {
  colorful: ThemeGradientConfig;
  classic: ThemeGradientConfig;
}

export const moduleColorMap: { [key: string]: ModuleColorConfig } = {
  quotation: {
    colorful: {
      bgFrom: 'from-blue-100',
      bgTo: 'to-blue-200',
      hoverFrom: 'hover:from-blue-200',
      hoverTo: 'hover:to-blue-300',
      textColor: 'text-neutral-800 dark:text-white',
      iconBg: 'bg-transparent',
      iconColor: 'text-blue-600 dark:text-blue-500',
      darkBgFrom: 'dark:from-blue-300/70',
      darkBgTo: 'dark:to-blue-500/70',
      darkHoverFrom: 'dark:hover:from-blue-400/80',
      darkHoverTo: 'dark:hover:to-blue-600/80',
      badgeBg: 'bg-blue-600 dark:bg-blue-500',
      badgeText: 'text-white',
    },
    classic: {
      bgFrom: 'from-white/80',
      bgTo: 'to-white/80',
      hoverFrom: 'hover:from-blue-200',
      hoverTo: 'hover:to-blue-300',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-transparent',
      iconColor: 'text-blue-600 dark:text-blue-500',
      darkBgFrom: 'dark:from-gray-800/80',
      darkBgTo: 'dark:to-gray-800/80',
      darkHoverFrom: 'dark:hover:from-blue-400/80',
      darkHoverTo: 'dark:hover:to-blue-600/80',
      badgeBg: 'bg-blue-600 dark:bg-blue-500',
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
      iconBg: 'bg-transparent',
      iconColor: 'text-emerald-600 dark:text-emerald-500',
      darkBgFrom: 'dark:from-emerald-300/70',
      darkBgTo: 'dark:to-emerald-500/70',
      darkHoverFrom: 'dark:hover:from-emerald-400/80',
      darkHoverTo: 'dark:hover:to-emerald-600/80',
      badgeBg: 'bg-emerald-600 dark:bg-emerald-500',
      badgeText: 'text-white',
    },
    classic: {
      bgFrom: 'from-white/80',
      bgTo: 'to-white/80',
      hoverFrom: 'hover:from-emerald-200',
      hoverTo: 'hover:to-emerald-300',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-transparent',
      iconColor: 'text-emerald-600 dark:text-emerald-500',
      darkBgFrom: 'dark:from-gray-800/80',
      darkBgTo: 'dark:to-gray-800/80',
      darkHoverFrom: 'dark:hover:from-emerald-400/80',
      darkHoverTo: 'dark:hover:to-emerald-600/80',
      badgeBg: 'bg-emerald-600 dark:bg-emerald-500',
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
      iconBg: 'bg-transparent',
      iconColor: 'text-cyan-600 dark:text-cyan-500',
      darkBgFrom: 'dark:from-cyan-300/70',
      darkBgTo: 'dark:to-cyan-500/70',
      darkHoverFrom: 'dark:hover:from-cyan-400/80',
      darkHoverTo: 'dark:hover:to-cyan-600/80',
      badgeBg: 'bg-cyan-600 dark:bg-cyan-500',
      badgeText: 'text-white',
    },
    classic: {
      bgFrom: 'from-white/80',
      bgTo: 'to-white/80',
      hoverFrom: 'hover:from-cyan-200',
      hoverTo: 'hover:to-cyan-300',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-transparent',
      iconColor: 'text-cyan-600 dark:text-cyan-500',
      darkBgFrom: 'dark:from-gray-800/80',
      darkBgTo: 'dark:to-gray-800/80',
      darkHoverFrom: 'dark:hover:from-cyan-400/80',
      darkHoverTo: 'dark:hover:to-cyan-600/80',
      badgeBg: 'bg-cyan-600 dark:bg-cyan-500',
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
      iconBg: 'bg-transparent',
      iconColor: 'text-violet-600 dark:text-violet-500',
      darkBgFrom: 'dark:from-violet-300/70',
      darkBgTo: 'dark:to-violet-500/70',
      darkHoverFrom: 'dark:hover:from-violet-400/80',
      darkHoverTo: 'dark:hover:to-violet-600/80',
      badgeBg: 'bg-violet-600 dark:bg-violet-500',
      badgeText: 'text-white',
    },
    classic: {
      bgFrom: 'from-white/80',
      bgTo: 'to-white/80',
      hoverFrom: 'hover:from-violet-200',
      hoverTo: 'hover:to-violet-300',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-transparent',
      iconColor: 'text-violet-600 dark:text-violet-500',
      darkBgFrom: 'dark:from-gray-800/80',
      darkBgTo: 'dark:to-gray-800/80',
      darkHoverFrom: 'dark:hover:from-violet-400/80',
      darkHoverTo: 'dark:hover:to-violet-600/80',
      badgeBg: 'bg-violet-600 dark:bg-violet-500',
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
      iconBg: 'bg-transparent',
      iconColor: 'text-orange-600 dark:text-orange-500',
      darkBgFrom: 'dark:from-orange-300/70',
      darkBgTo: 'dark:to-orange-500/70',
      darkHoverFrom: 'dark:hover:from-orange-400/80',
      darkHoverTo: 'dark:hover:to-orange-600/80',
      badgeBg: 'bg-orange-600 dark:bg-orange-500',
      badgeText: 'text-white',
    },
    classic: {
      bgFrom: 'from-white/80',
      bgTo: 'to-white/80',
      hoverFrom: 'hover:from-orange-200',
      hoverTo: 'hover:to-orange-300',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-transparent',
      iconColor: 'text-orange-600 dark:text-orange-500',
      darkBgFrom: 'dark:from-gray-800/80',
      darkBgTo: 'dark:to-gray-800/80',
      darkHoverFrom: 'dark:hover:from-orange-400/80',
      darkHoverTo: 'dark:hover:to-orange-600/80',
      badgeBg: 'bg-orange-600 dark:bg-orange-500',
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
      iconBg: 'bg-transparent',
      iconColor: 'text-indigo-600 dark:text-indigo-500',
      darkBgFrom: 'dark:from-indigo-300/70',
      darkBgTo: 'dark:to-indigo-500/70',
      darkHoverFrom: 'dark:hover:from-indigo-400/80',
      darkHoverTo: 'dark:hover:to-indigo-600/80',
      badgeBg: 'bg-indigo-600 dark:bg-indigo-500',
      badgeText: 'text-white',
    },
    classic: {
      bgFrom: 'from-white/80',
      bgTo: 'to-white/80',
      hoverFrom: 'hover:from-indigo-200',
      hoverTo: 'hover:to-indigo-300',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-transparent',
      iconColor: 'text-indigo-600 dark:text-indigo-500',
      darkBgFrom: 'dark:from-gray-800/80',
      darkBgTo: 'dark:to-gray-800/80',
      darkHoverFrom: 'dark:hover:from-indigo-400/80',
      darkHoverTo: 'dark:hover:to-indigo-600/80',
      badgeBg: 'bg-indigo-600 dark:bg-indigo-500',
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
      iconBg: 'bg-transparent',
      iconColor: 'text-pink-600 dark:text-pink-500',
      darkBgFrom: 'dark:from-pink-300/70',
      darkBgTo: 'dark:to-pink-500/70',
      darkHoverFrom: 'dark:hover:from-pink-400/80',
      darkHoverTo: 'dark:hover:to-pink-600/80',
      badgeBg: 'bg-pink-600 dark:bg-pink-500',
      badgeText: 'text-white',
    },
    classic: {
      bgFrom: 'from-white/80',
      bgTo: 'to-white/80',
      hoverFrom: 'hover:from-pink-200',
      hoverTo: 'hover:to-pink-300',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-transparent',
      iconColor: 'text-pink-600 dark:text-pink-500',
      darkBgFrom: 'dark:from-gray-800/80',
      darkBgTo: 'dark:to-gray-800/80',
      darkHoverFrom: 'dark:hover:from-pink-400/80',
      darkHoverTo: 'dark:hover:to-pink-600/80',
      badgeBg: 'bg-pink-600 dark:bg-pink-500',
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
      iconBg: 'bg-transparent',
      iconColor: 'text-fuchsia-600 dark:text-fuchsia-500',
      darkBgFrom: 'dark:from-fuchsia-300/70',
      darkBgTo: 'dark:to-fuchsia-500/70',
      darkHoverFrom: 'dark:hover:from-fuchsia-400/80',
      darkHoverTo: 'dark:hover:to-fuchsia-600/80',
      badgeBg: 'bg-fuchsia-600 dark:bg-fuchsia-500',
      badgeText: 'text-white',
    },
    classic: {
      bgFrom: 'from-white/80',
      bgTo: 'to-white/80',
      hoverFrom: 'hover:from-fuchsia-200',
      hoverTo: 'hover:to-fuchsia-300',
      textColor: 'text-gray-800 dark:text-white',
      iconBg: 'bg-transparent',
      iconColor: 'text-fuchsia-600 dark:text-fuchsia-500',
      darkBgFrom: 'dark:from-gray-800/80',
      darkBgTo: 'dark:to-gray-800/80',
      darkHoverFrom: 'dark:hover:from-fuchsia-400/80',
      darkHoverTo: 'dark:hover:to-fuchsia-600/80',
      badgeBg: 'bg-fuchsia-600 dark:bg-fuchsia-500',
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
        iconBg: 'bg-transparent',
        iconColor: 'text-gray-600 dark:text-gray-400',
        darkBgFrom: 'dark:from-gray-300/70',
        darkBgTo: 'dark:to-gray-500/70',
        darkHoverFrom: 'dark:hover:from-gray-400/80',
        darkHoverTo: 'dark:hover:to-gray-600/80',
        badgeBg: 'bg-gray-600 dark:bg-gray-500',
        badgeText: 'text-white',
      },
      classic: {
        bgFrom: 'from-white/80',
        bgTo: 'to-white/80',
        hoverFrom: 'hover:from-gray-200',
        hoverTo: 'hover:to-gray-300',
        textColor: 'text-gray-800 dark:text-white',
        iconBg: 'bg-transparent',
        darkBgFrom: 'dark:from-gray-800/80',
        darkBgTo: 'dark:to-gray-800/80',
        darkHoverFrom: 'dark:hover:from-gray-400/80',
        darkHoverTo: 'dark:hover:to-gray-600/80',
        badgeBg: 'bg-gray-600 dark:bg-gray-500',
        badgeText: 'text-white',
        iconColor: 'text-gray-600 dark:text-gray-400',
      },
    }[theme];
  }
  
  return moduleConfig[theme];
};
