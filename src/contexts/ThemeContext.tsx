'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { themeManager, ThemeConfig, ThemeMode, ButtonTheme } from '@/utils/themeUtils';

// 主题上下文接口
interface ThemeContextType {
  config: ThemeConfig;
  isLoading: boolean;
  mode: ThemeMode;
  buttonTheme: ButtonTheme;
  updateConfig: (updates: Partial<ThemeConfig>) => void;
  toggleMode: () => void;
  toggleButtonTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  setButtonTheme: (buttonTheme: ButtonTheme) => void;
  getModuleColors: (moduleId: string, theme?: ButtonTheme) => any;
  isDark: boolean;
  isLight: boolean;
  isColorful: boolean;
  isClassic: boolean;
}

// 创建上下文
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 主题提供者组件
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(themeManager.getConfig());
  const [isLoading, setIsLoading] = useState(true);

  // 监听主题变化
  useEffect(() => {
    console.log('🔄 ThemeProvider: 设置监听器');
    
    const unsubscribe = themeManager.addListener((newConfig) => {
      console.log('🔄 ThemeProvider: 收到配置更新:', newConfig);
      setConfig(newConfig);
    });

    // 初始化完成
    setIsLoading(false);

    return () => {
      console.log('🔄 ThemeProvider: 清理监听器');
      unsubscribe();
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

  const contextValue: ThemeContextType = {
    config,
    isLoading,
    mode: config.mode,
    buttonTheme: config.buttonTheme,
    updateConfig,
    toggleMode,
    toggleButtonTheme,
    setMode,
    setButtonTheme,
    getModuleColors,
    isDark: config.mode === 'dark',
    isLight: config.mode === 'light',
    isColorful: config.buttonTheme === 'colorful',
    isClassic: config.buttonTheme === 'classic',
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// 使用主题的Hook
export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

// 简化的主题Hook
export function useTheme() {
  const { config, isLoading, mode, buttonTheme, isDark, isLight, isColorful, isClassic } = useThemeContext();
  
  return {
    theme: config,
    isLoading,
    mode,
    buttonTheme,
    isDark,
    isLight,
    isColorful,
    isClassic,
  };
}

// 主题切换Hook
export function useThemeToggle() {
  const { toggleMode, toggleButtonTheme, setMode, setButtonTheme } = useThemeContext();
  
  return {
    toggleMode,
    toggleButtonTheme,
    setMode,
    setButtonTheme,
  };
}
