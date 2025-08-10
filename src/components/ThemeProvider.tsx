'use client';

import React, { useEffect } from 'react';
import { themeManager } from '@/utils/themeUtils';
import '@/utils/themeDebug';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * 主题提供者组件
 * 在应用根级别提供主题上下文，确保主题状态在整个应用中同步
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  useEffect(() => {
    // 初始化主题管理器
    const config = themeManager.getConfig();
    
    // 应用初始主题
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      
      // 应用深色模式类
      if (config.mode === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      // 设置CSS变量
      if (config.primaryColor) {
        root.style.setProperty('--primary-color', config.primaryColor);
      }
      
      if (config.accentColor) {
        root.style.setProperty('--accent-color', config.accentColor);
      }
      
      // 强制应用主题配置
      themeManager.updateConfig(config);
    }
  }, []);

  return <>{children}</>;
};

/**
 * 主题初始化组件
 * 用于在客户端渲染时初始化主题状态
 */
export const ThemeInitializer: React.FC = () => {
  useEffect(() => {
    // 确保主题在客户端渲染时正确应用
    const config = themeManager.getConfig();
    
    // 延迟应用主题，确保DOM已准备好
    const timer = setTimeout(() => {
      themeManager.updateConfig(config);
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  return null;
};
