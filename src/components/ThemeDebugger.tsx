'use client';

import { useEffect, useState } from 'react';
import { useThemeManager } from '@/hooks/useThemeManager';

export const ThemeDebugger: React.FC = () => {
  const { buttonTheme, mode } = useThemeManager();
  const [cssVariables, setCssVariables] = useState<Record<string, string>>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateCSSVariables = () => {
      if (typeof window === 'undefined') return;

      const root = document.documentElement;
      const variables: Record<string, string> = {};

      // 检查所有模块的CSS变量
      const modules = ['quotation', 'confirmation', 'packing', 'invoice', 'purchase', 'ai-email', 'history', 'customer'];
      
      modules.forEach(moduleId => {
        const fromValue = getComputedStyle(root).getPropertyValue(`--${moduleId}-from`);
        const toValue = getComputedStyle(root).getPropertyValue(`--${moduleId}-to`);
        const hoverFromValue = getComputedStyle(root).getPropertyValue(`--${moduleId}-hover-from`);
        const hoverToValue = getComputedStyle(root).getPropertyValue(`--${moduleId}-hover-to`);
        const iconColorValue = getComputedStyle(root).getPropertyValue(`--${moduleId}-icon-color`);
        const badgeBgValue = getComputedStyle(root).getPropertyValue(`--${moduleId}-badge-bg`);

        variables[`${moduleId}-from`] = fromValue.trim() || '未定义';
        variables[`${moduleId}-to`] = toValue.trim() || '未定义';
        variables[`${moduleId}-hover-from`] = hoverFromValue.trim() || '未定义';
        variables[`${moduleId}-hover-to`] = hoverToValue.trim() || '未定义';
        variables[`${moduleId}-icon-color`] = iconColorValue.trim() || '未定义';
        variables[`${moduleId}-badge-bg`] = badgeBgValue.trim() || '未定义';
      });

      // 检查邮件模块的CSS变量
      const mailModules = ['mail-generate', 'mail-settings'];
      
      mailModules.forEach(moduleId => {
        const fromValue = getComputedStyle(root).getPropertyValue(`--${moduleId}-from`);
        const toValue = getComputedStyle(root).getPropertyValue(`--${moduleId}-to`);
        const hoverFromValue = getComputedStyle(root).getPropertyValue(`--${moduleId}-hover-from`);
        const hoverToValue = getComputedStyle(root).getPropertyValue(`--${moduleId}-hover-to`);
        const iconColorValue = getComputedStyle(root).getPropertyValue(`--${moduleId}-icon-color`);
        const badgeBgValue = getComputedStyle(root).getPropertyValue(`--${moduleId}-badge-bg`);

        variables[`${moduleId}-from`] = fromValue.trim() || '未定义';
        variables[`${moduleId}-to`] = toValue.trim() || '未定义';
        variables[`${moduleId}-hover-from`] = hoverFromValue.trim() || '未定义';
        variables[`${moduleId}-hover-to`] = hoverToValue.trim() || '未定义';
        variables[`${moduleId}-icon-color`] = iconColorValue.trim() || '未定义';
        variables[`${moduleId}-badge-bg`] = badgeBgValue.trim() || '未定义';
      });

      setCssVariables(variables);
    };

    // 初始更新
    updateCSSVariables();

    // 监听主题变化
    const interval = setInterval(updateCSSVariables, 1000);

    return () => clearInterval(interval);
  }, [buttonTheme, mode]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm z-50 hover:bg-blue-700"
      >
        调试主题
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-w-md max-h-96 overflow-y-auto shadow-lg z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">主题调试器</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div className="text-sm">
          <p><strong>当前主题:</strong> {mode} + {buttonTheme}</p>
          <p><strong>HTML类名:</strong> {typeof window !== 'undefined' ? document.documentElement.className : 'N/A'}</p>
        </div>

        <div className="text-xs space-y-2">
          <h4 className="font-semibold">CSS变量状态:</h4>
          {Object.entries(cssVariables).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{key}:</span>
              <span className={`${value === '未定义' ? 'text-red-500' : 'text-green-600'}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="text-xs">
          <h4 className="font-semibold mb-2">调试命令:</h4>
          <button
            onClick={() => {
              console.log('🎨 当前CSS变量:', cssVariables);
              console.log('🎨 HTML类名:', document.documentElement.className);
              console.log('🎨 主题配置:', { mode, buttonTheme });
            }}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
          >
            输出到控制台
          </button>
        </div>
      </div>
    </div>
  );
};
