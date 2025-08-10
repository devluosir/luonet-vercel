/**
 * 主题样式工具类
 * 提供常用的主题样式组合和工具函数
 */

import { ThemeMode, ButtonTheme } from './themeUtils';

// 基础样式类
export const baseStyles = {
  // 卡片样式
  card: {
    light: 'bg-white/80 border border-gray-200/60 shadow-sm',
    dark: 'dark:bg-gray-800/80 dark:border-gray-700/50 dark:shadow-gray-900/20',
    hover: {
      light: 'hover:bg-white hover:shadow-md',
      dark: 'dark:hover:bg-gray-700 dark:hover:shadow-lg'
    }
  },
  
  // 按钮样式
  button: {
    primary: {
      light: 'bg-blue-600 hover:bg-blue-700 text-white',
      dark: 'dark:bg-blue-500 dark:hover:bg-blue-600'
    },
    secondary: {
      light: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
      dark: 'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
    },
    outline: {
      light: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
      dark: 'dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-200'
    }
  },
  
  // 输入框样式
  input: {
    light: 'bg-white border border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    dark: 'dark:bg-gray-800 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400'
  },
  
  // 文本样式
  text: {
    primary: {
      light: 'text-gray-900',
      dark: 'dark:text-white'
    },
    secondary: {
      light: 'text-gray-600',
      dark: 'dark:text-gray-300'
    },
    muted: {
      light: 'text-gray-500',
      dark: 'dark:text-gray-400'
    }
  }
};

// 模块按钮样式生成器
export const getModuleButtonStyles = (moduleId: string, theme: ButtonTheme, mode: ThemeMode) => {
  const colorMap: Record<string, string> = {
    quotation: 'blue',
    confirmation: 'emerald',
    packing: 'cyan',
    invoice: 'violet',
    purchase: 'orange',
    'ai-email': 'indigo',
    history: 'pink',
    customer: 'fuchsia'
  };
  
  const color = colorMap[moduleId] || 'gray';
  
  if (theme === 'classic') {
    return {
      base: mode === 'dark' 
        ? 'bg-gray-800/80 border-gray-700/50' 
        : 'bg-white/80 border-gray-200/60',
      hover: `hover:from-${color}-200 hover:to-${color}-300`,
      darkHover: `dark:hover:from-${color}-400/80 dark:hover:to-${color}-600/80`,
      icon: `text-${color}-600 dark:text-${color}-500`,
      badge: `bg-${color}-600 dark:bg-${color}-500`
    };
  }
  
  return {
    base: mode === 'dark'
      ? `from-${color}-300/70 to-${color}-500/70`
      : `from-${color}-100 to-${color}-200`,
    hover: `hover:from-${color}-200 hover:to-${color}-300`,
    darkHover: `dark:hover:from-${color}-400/80 dark:hover:to-${color}-600/80`,
    icon: `text-${color}-600 dark:text-${color}-500`,
    badge: `bg-${color}-600 dark:bg-${color}-500`
  };
};

// 响应式样式生成器
export const getResponsiveStyles = (breakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl') => {
  const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  };
  
  return {
    container: `max-w-${breakpoint}`,
    grid: {
      cols: {
        sm: 'grid-cols-1 sm:grid-cols-2',
        md: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        lg: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
        xl: 'grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3'
      }
    }
  };
};

// 动画样式
export const animationStyles = {
  fadeIn: 'animate-in fade-in-0 duration-300',
  slideIn: 'animate-in slide-in-from-bottom-4 duration-300',
  scaleIn: 'animate-in zoom-in-95 duration-300',
  bounce: 'animate-bounce',
  pulse: 'animate-pulse',
  spin: 'animate-spin'
};

// 过渡样式
export const transitionStyles = {
  fast: 'transition-all duration-150 ease-out',
  normal: 'transition-all duration-300 ease-out',
  slow: 'transition-all duration-500 ease-out',
  colors: 'transition-colors duration-200',
  transform: 'transition-transform duration-200'
};

// 阴影样式
export const shadowStyles = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  inner: 'shadow-inner',
  none: 'shadow-none'
};

// 边框样式
export const borderStyles = {
  none: 'border-0',
  sm: 'border',
  md: 'border-2',
  lg: 'border-4',
  radius: {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full'
  }
};

// 组合样式生成器
export const combineStyles = (...styles: string[]) => {
  return styles.filter(Boolean).join(' ');
};

// 条件样式生成器
export const conditionalStyles = (condition: boolean, trueStyle: string, falseStyle: string = '') => {
  return condition ? trueStyle : falseStyle;
};

// 主题相关样式生成器
export const getThemeStyles = (mode: ThemeMode, theme: ButtonTheme) => {
  return {
    background: mode === 'dark' ? 'bg-gray-900' : 'bg-gray-50',
    surface: mode === 'dark' ? 'bg-gray-800' : 'bg-white',
    text: mode === 'dark' ? 'text-white' : 'text-gray-900',
    border: mode === 'dark' ? 'border-gray-700' : 'border-gray-200',
    buttonTheme: theme === 'colorful' ? 'colorful-theme' : 'classic-theme'
  };
};

// 导出便捷函数
export const createModuleButtonClass = (moduleId: string, theme: ButtonTheme, mode: ThemeMode) => {
  const styles = getModuleButtonStyles(moduleId, theme, mode);
  return combineStyles(
    'flex items-center justify-start gap-3 px-5 py-4 rounded-3xl',
    'bg-gradient-to-br',
    styles.base,
    styles.hover,
    styles.darkHover,
    'shadow-md hover:shadow-lg hover:-translate-y-1',
    'transition-all duration-300',
    'border border-white/40 dark:border-gray-800/40'
  );
};

export const createCardClass = (mode: ThemeMode) => {
  return combineStyles(
    baseStyles.card.light,
    baseStyles.card.dark,
    baseStyles.card.hover.light,
    baseStyles.card.hover.dark,
    'rounded-lg p-4',
    transitionStyles.normal
  );
};
