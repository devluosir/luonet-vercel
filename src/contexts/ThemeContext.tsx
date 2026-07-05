'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { themeManager, type ThemeConfig, type ThemeMode } from '@/utils/themeUtils';

interface ThemeContextType {
  config: ThemeConfig;
  isLoading: boolean;
  mode: ThemeMode;
  updateConfig: (updates: Partial<ThemeConfig>) => void;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(themeManager.getConfig());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = themeManager.addListener((newConfig) => {
      setConfig(newConfig);
    });
    setIsLoading(false);
    return unsubscribe;
  }, []);

  const updateConfig = useCallback((updates: Partial<ThemeConfig>) => {
    themeManager.updateConfig(updates);
  }, []);

  const toggleMode = useCallback(() => {
    themeManager.toggleMode();
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    themeManager.setMode(mode);
  }, []);

  const contextValue: ThemeContextType = {
    config,
    isLoading,
    mode: config.mode,
    updateConfig,
    toggleMode,
    setMode,
    isDark: config.mode === 'dark',
    isLight: config.mode === 'light',
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

export function useTheme() {
  const { config, isLoading, mode, isDark, isLight } = useThemeContext();

  return {
    theme: config,
    isLoading,
    mode,
    isDark,
    isLight,
  };
}

export function useThemeToggle() {
  const { toggleMode, setMode } = useThemeContext();

  return {
    toggleMode,
    setMode,
  };
}
