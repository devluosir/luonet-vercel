'use client';

import React, { useState, useEffect } from 'react';
import { useThemeManager } from '@/hooks/useThemeManager';
import { themeManager } from '@/utils/themeUtils';

export const ThemeDebugger: React.FC = () => {
  const { config, buttonTheme, mode } = useThemeManager();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    // 收集调试信息
    const info = {
      config,
      buttonTheme,
      mode,
      htmlClasses: typeof window !== 'undefined' ? document.documentElement.className : '',
      cssVariables: typeof window !== 'undefined' ? {
        primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color'),
        bgPrimary: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary'),
      } : {},
      localStorage: typeof window !== 'undefined' ? {
        themeConfig: localStorage.getItem('theme-config'),
        themeSettings: localStorage.getItem('theme-settings'),
      } : {},
    };
    
    setDebugInfo(info);
  }, [config, buttonTheme, mode]);

  const testModuleColors = (moduleId: string) => {
    const colors = themeManager.getModuleColors(moduleId, buttonTheme);
    console.log(`Module ${moduleId} colors:`, colors);
    return colors;
  };

  const forceRefresh = () => {
    themeManager.updateConfig(config);
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
      <h3 className="text-sm font-bold mb-2">主题调试器</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>当前配置:</strong>
          <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 overflow-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>HTML类名:</strong>
          <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1">
            {debugInfo.htmlClasses || 'N/A'}
          </div>
        </div>
        
        <div>
          <strong>CSS变量:</strong>
          <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 overflow-auto">
            {JSON.stringify(debugInfo.cssVariables, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>LocalStorage:</strong>
          <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 overflow-auto">
            {JSON.stringify(debugInfo.localStorage, null, 2)}
          </pre>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => testModuleColors('quotation')}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
          >
            测试报价单颜色
          </button>
          <button
            onClick={forceRefresh}
            className="px-2 py-1 bg-green-500 text-white rounded text-xs"
          >
            强制刷新
          </button>
        </div>
      </div>
    </div>
  );
};
