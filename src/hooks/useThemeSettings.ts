import { useState, useEffect } from 'react';

export type ButtonTheme = 'classic' | 'colorful';

interface ThemeSettings {
  buttonTheme: ButtonTheme;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  buttonTheme: 'colorful'
};

const STORAGE_KEY = 'theme-settings';

export function useThemeSettings() {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时从 localStorage 读取设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedSettings = JSON.parse(stored);
          setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
        }
      } catch (error) {
        console.error('读取主题设置失败:', error);
      }
      setIsLoading(false);
    }
  }, []);

  // 更新设置并保存到 localStorage
  const updateSettings = (newSettings: Partial<ThemeSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
        
        // 触发自定义事件通知其他组件主题变化
        window.dispatchEvent(new CustomEvent('themeSettingsChanged', {
          detail: updatedSettings
        }));
      } catch (error) {
        console.error('保存主题设置失败:', error);
      }
    }
  };

  // 重置为默认设置
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('themeSettingsChanged', {
        detail: DEFAULT_SETTINGS
      }));
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    resetSettings,
    // 便捷的更新函数
    setButtonTheme: (theme: ButtonTheme) => updateSettings({ buttonTheme: theme }),
  };
}
