'use client';

import React, { useState } from 'react';
import { useThemeManager } from '@/hooks/useThemeManager';

export const ThemeToggleTest: React.FC = () => {
  const { mode, buttonTheme, toggleMode, toggleButtonTheme, setMode, setButtonTheme } = useThemeManager();
  const [clickCount, setClickCount] = useState(0);

  const handleModeToggle = () => {
    console.log('🔄 点击模式切换按钮');
    console.log('🔄 切换前模式:', mode);
    setClickCount(prev => prev + 1);
    toggleMode();
  };

  const handleButtonThemeToggle = () => {
    console.log('🔄 点击按钮主题切换按钮');
    console.log('🔄 切换前按钮主题:', buttonTheme);
    setClickCount(prev => prev + 1);
    toggleButtonTheme();
  };

  const handleDirectSet = () => {
    console.log('🔄 直接设置模式为 light');
    setClickCount(prev => prev + 1);
    setMode('light');
  };

  const handleDirectSetDark = () => {
    console.log('🔄 直接设置模式为 dark');
    setClickCount(prev => prev + 1);
    setMode('dark');
  };

  return (
    <div className="fixed top-4 left-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
      <h3 className="text-sm font-bold mb-3">主题切换测试</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>当前状态:</strong>
          <div>模式: {mode}</div>
          <div>按钮主题: {buttonTheme}</div>
          <div>点击次数: {clickCount}</div>
        </div>
        
        <div className="space-y-1">
          <button
            onClick={handleModeToggle}
            className="w-full px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            切换模式 (toggleMode)
          </button>
          
          <button
            onClick={handleButtonThemeToggle}
            className="w-full px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
          >
            切换按钮主题 (toggleButtonTheme)
          </button>
          
          <button
            onClick={handleDirectSet}
            className="w-full px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
          >
            直接设为浅色 (setMode light)
          </button>
          
          <button
            onClick={handleDirectSetDark}
            className="w-full px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
          >
            直接设为深色 (setMode dark)
          </button>
        </div>
        
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              console.log('🔄 手动触发调试');
              (window as any).debugTheme?.();
            }}
            className="w-full px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
          >
            调试主题状态
          </button>
          
          <button
            onClick={() => {
              console.log('🔄 手动触发测试');
              (window as any).testThemeToggle?.();
            }}
            className="w-full px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 mt-1"
          >
            运行切换测试
          </button>
        </div>
      </div>
    </div>
  );
};
