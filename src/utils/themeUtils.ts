/**
 * 主题管理工具类
 * 提供动态主题切换、CSS变量管理和主题配置功能
 */

export type ThemeMode = 'light' | 'dark';
export type ButtonTheme = 'classic' | 'colorful';

// 主题配置接口
export interface ThemeConfig {
  mode: ThemeMode;
  buttonTheme: ButtonTheme;
  primaryColor?: string;
  accentColor?: string;
}

// 默认主题配置
export const DEFAULT_THEME: ThemeConfig = {
  mode: 'light',
  buttonTheme: 'colorful',
  primaryColor: '#2563eb',
  accentColor: '#059669'
};

// 主题颜色映射
export const THEME_COLORS = {
  blue: {
    light: '#2563eb',
    dark: '#3b82f6',
    bg: {
      light: 'from-blue-100 to-blue-200',
      dark: 'from-blue-300/70 to-blue-500/70'
    },
    hover: {
      light: 'hover:from-blue-200 hover:to-blue-300',
      dark: 'dark:hover:from-blue-400/80 dark:hover:to-blue-600/80'
    }
  },
  emerald: {
    light: '#059669',
    dark: '#10b981',
    bg: {
      light: 'from-emerald-100 to-emerald-200',
      dark: 'from-emerald-300/70 to-emerald-500/70'
    },
    hover: {
      light: 'hover:from-emerald-200 hover:to-emerald-300',
      dark: 'dark:hover:from-emerald-400/80 dark:hover:to-emerald-600/80'
    }
  },
  cyan: {
    light: '#0891b2',
    dark: '#06b6d4',
    bg: {
      light: 'from-cyan-100 to-cyan-200',
      dark: 'from-cyan-300/70 to-cyan-500/70'
    },
    hover: {
      light: 'hover:from-cyan-200 hover:to-cyan-300',
      dark: 'dark:hover:from-cyan-400/80 dark:hover:to-cyan-600/80'
    }
  },
  violet: {
    light: '#7c3aed',
    dark: '#8b5cf6',
    bg: {
      light: 'from-violet-100 to-violet-200',
      dark: 'from-violet-300/70 to-violet-500/70'
    },
    hover: {
      light: 'hover:from-violet-200 hover:to-violet-300',
      dark: 'dark:hover:from-violet-400/80 dark:hover:to-violet-600/80'
    }
  },
  orange: {
    light: '#ea580c',
    dark: '#f97316',
    bg: {
      light: 'from-orange-100 to-orange-200',
      dark: 'from-orange-300/70 to-orange-500/70'
    },
    hover: {
      light: 'hover:from-orange-200 hover:to-orange-300',
      dark: 'dark:hover:from-orange-400/80 dark:hover:to-orange-600/80'
    }
  },
  indigo: {
    light: '#4f46e5',
    dark: '#6366f1',
    bg: {
      light: 'from-indigo-100 to-indigo-200',
      dark: 'from-indigo-300/70 to-indigo-500/70'
    },
    hover: {
      light: 'hover:from-indigo-200 hover:to-indigo-300',
      dark: 'dark:hover:from-indigo-400/80 dark:hover:to-indigo-600/80'
    }
  },
  pink: {
    light: '#db2777',
    dark: '#ec4899',
    bg: {
      light: 'from-pink-100 to-pink-200',
      dark: 'from-pink-300/70 to-pink-500/70'
    },
    hover: {
      light: 'hover:from-pink-200 hover:to-pink-300',
      dark: 'dark:hover:from-pink-400/80 dark:hover:to-pink-600/80'
    }
  },
  fuchsia: {
    light: '#a21caf',
    dark: '#c026d3',
    bg: {
      light: 'from-fuchsia-100 to-fuchsia-200',
      dark: 'from-fuchsia-300/70 to-fuchsia-500/70'
    },
    hover: {
      light: 'hover:from-fuchsia-200 hover:to-fuchsia-300',
      dark: 'dark:hover:from-fuchsia-400/80 dark:hover:to-fuchsia-600/80'
    }
  }
} as const;

/**
 * 主题管理类
 */
export class ThemeManager {
  private static instance: ThemeManager;
  private config: ThemeConfig = DEFAULT_THEME;
  private listeners: Set<(config: ThemeConfig) => void> = new Set();
  private isInitialized = false;
  private applyThemeDebounceTimer: NodeJS.Timeout | null = null;
  private lastAppliedConfig: string = '';

  private constructor() {
    // 只在客户端环境下初始化
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      this.initializeTheme();
    }
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * 初始化主题
   */
  private initializeTheme(): void {
    if (this.isInitialized) return;
    
    this.applyTheme();
    this.isInitialized = true;
    
    // 确保在DOM准备好后再次应用主题
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.applyTheme();
      });
    } else {
      // DOM已经准备好，延迟应用确保所有样式都已加载
      setTimeout(() => {
        this.applyTheme();
      }, 0);
    }
  }

  /**
   * 获取当前主题配置
   */
  getConfig(): ThemeConfig {
    return { ...this.config };
  }

  /**
   * 更新主题配置
   */
  updateConfig(updates: Partial<ThemeConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };
    
    // 检查配置是否真的发生了变化
    const newConfigString = JSON.stringify(this.config);
    if (newConfigString === this.lastAppliedConfig) {
      return; // 配置没有变化，跳过更新
    }
    
    console.log('🔄 更新主题配置:', { 当前: this.config, 更新: updates });
    console.log('🔄 配置已更新:', { 之前: oldConfig, 之后: this.config });
    
    this.saveToStorage();
    this.debouncedApplyTheme();
    this.notifyListeners();
  }

  /**
   * 防抖应用主题
   */
  private debouncedApplyTheme(): void {
    if (this.applyThemeDebounceTimer) {
      clearTimeout(this.applyThemeDebounceTimer);
    }
    
    this.applyThemeDebounceTimer = setTimeout(() => {
      this.applyTheme();
      this.applyThemeDebounceTimer = null;
    }, 50); // 50ms 防抖
  }

  /**
   * 切换主题模式
   */
  toggleMode(): void {
    const newMode = this.config.mode === 'light' ? 'dark' : 'light';
    this.updateConfig({ mode: newMode });
  }

  /**
   * 切换按钮主题
   */
  toggleButtonTheme(): void {
    const newButtonTheme = this.config.buttonTheme === 'classic' ? 'colorful' : 'classic';
    this.updateConfig({ buttonTheme: newButtonTheme });
  }

  /**
   * 设置主题模式
   */
  setMode(mode: ThemeMode): void {
    this.updateConfig({ mode });
  }

  /**
   * 设置按钮主题
   */
  setButtonTheme(buttonTheme: ButtonTheme): void {
    this.updateConfig({ buttonTheme });
  }

  /**
   * 应用主题到DOM
   */
  private applyTheme(): void {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const configString = JSON.stringify(this.config);
    
    // 检查是否已经应用了相同的配置
    if (configString === this.lastAppliedConfig) {
      return;
    }
    
    console.log('🔄 应用主题到DOM:', this.config);
    
    // 应用深色模式类
    if (this.config.mode === 'dark') {
      root.classList.add('dark');
      console.log('🔄 添加dark类');
    } else {
      root.classList.remove('dark');
      console.log('🔄 移除dark类');
    }

    // 应用按钮主题类
    if (this.config.buttonTheme === 'classic') {
      root.classList.add('classic-theme');
      console.log('🔄 添加classic-theme类');
    } else {
      root.classList.remove('classic-theme');
      console.log('🔄 移除classic-theme类');
    }

    // 设置CSS变量
    this.setCSSVariables();
    
    // 记录已应用的配置
    this.lastAppliedConfig = configString;
    console.log('🔄 当前HTML类名:', root.className);
  }

  /**
   * 设置CSS变量
   */
  private setCSSVariables(): void {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    // 设置主色调
    if (this.config.primaryColor) {
      root.style.setProperty('--primary-color', this.config.primaryColor);
    }
    
    if (this.config.accentColor) {
      root.style.setProperty('--accent-color', this.config.accentColor);
    }

    // 根据按钮主题设置模块按钮的CSS变量
    this.setModuleButtonVariables();
  }

  /**
   * 设置模块按钮的CSS变量
   */
  private setModuleButtonVariables(): void {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const isDark = this.config.mode === 'dark';
    const isClassic = this.config.buttonTheme === 'classic';

    console.log('🎨 设置模块按钮CSS变量:', { isDark, isClassic });

    // 定义模块颜色映射
    const moduleColors = {
      quotation: { light: '#2563eb', dark: '#60a5fa' },
      confirmation: { light: '#059669', dark: '#34d399' },
      packing: { light: '#0891b2', dark: '#22d3ee' },
      invoice: { light: '#7c3aed', dark: '#a78bfa' },
      purchase: { light: '#ea580c', dark: '#fb923c' },
      'ai-email': { light: '#4f46e5', dark: '#818cf8' },
      history: { light: '#db2777', dark: '#f472b6' },
      customer: { light: '#a21caf', dark: '#d946ef' },
    };

    // 为每个模块设置CSS变量
    Object.entries(moduleColors).forEach(([moduleId, colors]) => {
      const color = isDark ? colors.dark : colors.light;
      
      if (isClassic) {
        // 经典主题：白色/灰色背景，彩色悬停
        root.style.setProperty(`--${moduleId}-from`, isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)');
        root.style.setProperty(`--${moduleId}-to`, isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)');
        root.style.setProperty(`--${moduleId}-hover-from`, isDark ? 'rgba(59, 130, 246, 0.8)' : 'rgba(219, 234, 254, 1)');
        root.style.setProperty(`--${moduleId}-hover-to`, isDark ? 'rgba(37, 99, 235, 0.8)' : 'rgba(191, 219, 254, 1)');
        console.log(`🎨 ${moduleId} 经典主题变量已设置`);
      } else {
        // 彩色主题：清除之前设置的CSS变量，让globals.css中的定义生效
        root.style.removeProperty(`--${moduleId}-from`);
        root.style.removeProperty(`--${moduleId}-to`);
        root.style.removeProperty(`--${moduleId}-hover-from`);
        root.style.removeProperty(`--${moduleId}-hover-to`);
        console.log(`🎨 ${moduleId} 彩色主题变量已清除`);
      }
      
      // 设置图标和徽章颜色
      root.style.setProperty(`--${moduleId}-icon-color`, color);
      root.style.setProperty(`--${moduleId}-badge-bg`, color);
      console.log(`🎨 ${moduleId} 图标颜色: ${color}`);
    });
  }

  /**
   * 从localStorage加载配置
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('theme-config');
      console.log('🔄 从localStorage加载配置:', stored);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('🔄 解析的配置:', parsed);
        this.config = { ...DEFAULT_THEME, ...parsed };
        console.log('🔄 合并后的配置:', this.config);
      } else {
        console.log('🔄 没有找到存储的配置，使用默认配置:', DEFAULT_THEME);
      }
    } catch (error) {
      console.error('🔄 加载主题配置失败:', error);
      console.log('🔄 使用默认配置:', DEFAULT_THEME);
    }
  }

  /**
   * 保存配置到localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const configString = JSON.stringify(this.config);
      console.log('🔄 保存配置到localStorage:', configString);
      localStorage.setItem('theme-config', configString);
      
      // 验证保存是否成功
      const saved = localStorage.getItem('theme-config');
      console.log('🔄 验证保存结果:', saved);
    } catch (error) {
      console.error('🔄 保存主题配置失败:', error);
    }
  }

  /**
   * 添加配置变化监听器
   */
  addListener(listener: (config: ThemeConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    console.log('🔄 通知监听器，当前配置:', this.config);
    console.log('🔄 监听器数量:', this.listeners.size);
    
    this.listeners.forEach((listener, index) => {
      try {
        listener(this.config);
        console.log(`🔄 监听器 ${index} 通知成功`);
      } catch (error) {
        console.error(`🔄 监听器 ${index} 通知失败:`, error);
      }
    });
  }

  /**
   * 获取模块颜色配置
   */
  getModuleColors(moduleId: string, theme: ButtonTheme = 'colorful') {
    const colorKey = this.getColorKeyForModule(moduleId);
    const colorConfig = THEME_COLORS[colorKey];
    
    if (!colorConfig) {
      return this.getDefaultColors(theme);
    }

    if (theme === 'classic') {
      return {
        bgFrom: 'from-white/80',
        bgTo: 'to-white/80',
        hoverFrom: colorConfig.hover.light.split(' ')[0],
        hoverTo: colorConfig.hover.light.split(' ')[1],
        textColor: 'text-gray-800 dark:text-white',
        iconBg: 'bg-transparent',
        iconColor: `text-${colorKey}-600 dark:text-${colorKey}-500`,
        darkBgFrom: 'dark:from-gray-800/80',
        darkBgTo: 'dark:to-gray-800/80',
        darkHoverFrom: colorConfig.hover.dark.split(' ')[0],
        darkHoverTo: colorConfig.hover.dark.split(' ')[1],
        badgeBg: `bg-${colorKey}-600 dark:bg-${colorKey}-500`,
        badgeText: 'text-white',
      };
    }

    return {
      bgFrom: colorConfig.bg.light.split(' ')[0],
      bgTo: colorConfig.bg.light.split(' ')[1],
      hoverFrom: colorConfig.hover.light.split(' ')[0],
      hoverTo: colorConfig.hover.light.split(' ')[1],
      textColor: 'text-neutral-800 dark:text-white',
      iconBg: 'bg-transparent',
      iconColor: `text-${colorKey}-600 dark:text-${colorKey}-500`,
      darkBgFrom: colorConfig.bg.dark.split(' ')[0],
      darkBgTo: colorConfig.bg.dark.split(' ')[1],
      darkHoverFrom: colorConfig.hover.dark.split(' ')[0],
      darkHoverTo: colorConfig.hover.dark.split(' ')[1],
      badgeBg: `bg-${colorKey}-600 dark:bg-${colorKey}-500`,
      badgeText: 'text-white',
    };
  }

  /**
   * 获取模块对应的颜色键
   */
  private getColorKeyForModule(moduleId: string): keyof typeof THEME_COLORS {
    const colorMap: Record<string, keyof typeof THEME_COLORS> = {
      quotation: 'blue',
      confirmation: 'emerald',
      packing: 'cyan',
      invoice: 'violet',
      purchase: 'orange',
      'ai-email': 'indigo',
      history: 'pink',
      customer: 'fuchsia',
    };
    
    return colorMap[moduleId] || 'gray';
  }

  /**
   * 获取默认颜色配置
   */
  private getDefaultColors(theme: ButtonTheme) {
    if (theme === 'classic') {
      return {
        bgFrom: 'from-white/80',
        bgTo: 'to-white/80',
        hoverFrom: 'hover:from-gray-200',
        hoverTo: 'hover:to-gray-300',
        textColor: 'text-gray-800 dark:text-white',
        iconBg: 'bg-transparent',
        iconColor: 'text-gray-600 dark:text-gray-400',
        darkBgFrom: 'dark:from-gray-800/80',
        darkBgTo: 'dark:to-gray-800/80',
        darkHoverFrom: 'dark:hover:from-gray-400/80',
        darkHoverTo: 'dark:hover:to-gray-600/80',
        badgeBg: 'bg-gray-600 dark:bg-gray-500',
        badgeText: 'text-white',
      };
    }

    return {
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
    };
  }
}

// 导出单例实例
export const themeManager = ThemeManager.getInstance();

// 便捷函数
export const getModuleColors = (moduleId: string, theme: ButtonTheme = 'colorful') => {
  return themeManager.getModuleColors(moduleId, theme);
};
