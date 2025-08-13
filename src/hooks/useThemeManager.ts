import { useState, useEffect, useCallback, useRef } from 'react';
import { themeManager, ThemeConfig, ThemeMode, ButtonTheme } from '@/utils/themeUtils';

/**
 * 主题管理Hook
 * 提供响应式的主题状态和操作方法
 */
export function useThemeManager() {
  const [config, setConfig] = useState<ThemeConfig>(themeManager.getConfig());
  const [isLoading, setIsLoading] = useState(true);
  const listenerRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);

  // 监听主题变化
  useEffect(() => {
    // 防止重复设置监听器
    if (isInitializedRef.current) {
      return;
    }

    // 调试日志已关闭
    
    const unsubscribe = themeManager.addListener((newConfig) => {
      // 调试日志已关闭
      setConfig(newConfig);
    });

    listenerRef.current = unsubscribe;
    isInitializedRef.current = true;

    // 初始化完成
    setIsLoading(false);

    return () => {
      if (listenerRef.current) {
        // 调试日志已关闭
        listenerRef.current();
        listenerRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []);

  // 更新主题配置
  const updateConfig = useCallback((updates: Partial<ThemeConfig>) => {
    themeManager.updateConfig(updates);
  }, []);

  // 切换主题模式
  const toggleMode = useCallback(() => {
    themeManager.toggleMode();
  }, []);

  // 切换按钮主题
  const toggleButtonTheme = useCallback(() => {
    themeManager.toggleButtonTheme();
  }, []);

  // 设置主题模式
  const setMode = useCallback((mode: ThemeMode) => {
    themeManager.setMode(mode);
  }, []);

  // 设置按钮主题
  const setButtonTheme = useCallback((buttonTheme: ButtonTheme) => {
    themeManager.setButtonTheme(buttonTheme);
  }, []);

  // 获取模块颜色
  const getModuleColors = useCallback((moduleId: string, theme?: ButtonTheme) => {
    return themeManager.getModuleColors(moduleId, theme || config.buttonTheme);
  }, [config.buttonTheme]);

  return {
    // 状态
    config,
    isLoading,
    mode: config.mode,
    buttonTheme: config.buttonTheme,
    
    // 操作方法
    updateConfig,
    toggleMode,
    toggleButtonTheme,
    setMode,
    setButtonTheme,
    getModuleColors,
    
    // 便捷属性
    isDark: config.mode === 'dark',
    isLight: config.mode === 'light',
    isColorful: config.buttonTheme === 'colorful',
    isClassic: config.buttonTheme === 'classic',
  };
}

/**
 * 简化的主题Hook - 只返回当前主题状态
 */
export function useTheme() {
  const { config, isLoading } = useThemeManager();
  
  return {
    theme: config,
    isLoading,
    mode: config.mode,
    buttonTheme: config.buttonTheme,
    isDark: config.mode === 'dark',
    isLight: config.mode === 'light',
    isColorful: config.buttonTheme === 'colorful',
    isClassic: config.buttonTheme === 'classic',
  };
}

/**
 * 主题切换Hook - 只提供切换功能
 */
export function useThemeToggle() {
  const { toggleMode, toggleButtonTheme, setMode, setButtonTheme } = useThemeManager();
  
  return {
    toggleMode,
    toggleButtonTheme,
    setMode,
    setButtonTheme,
  };
}
