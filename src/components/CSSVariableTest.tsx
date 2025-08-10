'use client';

import React, { useState, useEffect } from 'react';
import { useThemeManager } from '@/hooks/useThemeManager';

export const CSSVariableTest: React.FC = () => {
  const { mode, buttonTheme } = useThemeManager();
  const [cssVariables, setCssVariables] = useState<Record<string, string>>({});
  const [htmlClasses, setHtmlClasses] = useState<string[]>([]);

  // 监控CSS变量变化
  useEffect(() => {
    const updateCSSVariables = () => {
      if (typeof window === 'undefined') return;

      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      const variables = {
        '--quotation-from': computedStyle.getPropertyValue('--quotation-from'),
        '--quotation-to': computedStyle.getPropertyValue('--quotation-to'),
        '--quotation-icon-color': computedStyle.getPropertyValue('--quotation-icon-color'),
        '--confirmation-from': computedStyle.getPropertyValue('--confirmation-from'),
        '--confirmation-to': computedStyle.getPropertyValue('--confirmation-to'),
        '--confirmation-icon-color': computedStyle.getPropertyValue('--confirmation-icon-color'),
        '--packing-from': computedStyle.getPropertyValue('--packing-from'),
        '--packing-to': computedStyle.getPropertyValue('--packing-to'),
        '--packing-icon-color': computedStyle.getPropertyValue('--packing-icon-color'),
        '--invoice-from': computedStyle.getPropertyValue('--invoice-from'),
        '--invoice-to': computedStyle.getPropertyValue('--invoice-to'),
        '--invoice-icon-color': computedStyle.getPropertyValue('--invoice-icon-color'),
        '--purchase-from': computedStyle.getPropertyValue('--purchase-from'),
        '--purchase-to': computedStyle.getPropertyValue('--purchase-to'),
        '--purchase-icon-color': computedStyle.getPropertyValue('--purchase-icon-color'),
      };

      setCssVariables(variables);
      setHtmlClasses(Array.from(root.classList));
    };

    // 初始更新
    updateCSSVariables();

    // 监听主题变化
    const interval = setInterval(updateCSSVariables, 100);

    return () => clearInterval(interval);
  }, [mode, buttonTheme]);

  return (
    <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 max-w-md">
      <h3 className="text-sm font-bold mb-3">CSS变量监控</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>当前状态:</strong>
          <div>模式: {mode}</div>
          <div>按钮主题: {buttonTheme}</div>
        </div>
        
        <div>
          <strong>HTML类名:</strong>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {htmlClasses.join(' ')}
          </div>
        </div>
        
        <div>
          <strong>CSS变量:</strong>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {Object.entries(cssVariables).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                <span className="text-gray-800 dark:text-gray-200">{value}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              console.log('🔄 手动触发CSS变量检查');
              (window as any).debugTheme?.();
            }}
            className="w-full px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            控制台调试
          </button>
        </div>
      </div>
    </div>
  );
};
