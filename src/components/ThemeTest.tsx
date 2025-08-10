'use client';

import React from 'react';
import { useThemeManager } from '@/hooks/useThemeManager';
import { FileText, Receipt, Package, ShoppingCart, Mail, Archive, Users } from 'lucide-react';

export const ThemeTest: React.FC = () => {
  const { buttonTheme, toggleButtonTheme, mode, toggleMode } = useThemeManager();

  const testModules = [
    { id: 'quotation', name: '报价单', icon: FileText },
    { id: 'confirmation', name: '销售确认', icon: FileText },
    { id: 'packing', name: '装箱单', icon: Package },
    { id: 'invoice', name: '发票', icon: Receipt },
    { id: 'purchase', name: '采购', icon: ShoppingCart },
    { id: 'ai-email', name: 'AI邮件', icon: Mail },
    { id: 'history', name: '历史', icon: Archive },
    { id: 'customer', name: '客户', icon: Users },
  ];

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-6">主题系统测试</h3>
      
      <div className="space-y-6">
        {/* 主题控制 */}
        <div className="flex gap-4 items-center">
          <div>
            <p className="text-sm font-medium">当前模式: {mode}</p>
            <button
              onClick={toggleMode}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              切换模式
            </button>
          </div>
          
          <div>
            <p className="text-sm font-medium">当前按钮主题: {buttonTheme}</p>
            <button
              onClick={toggleButtonTheme}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              切换按钮主题
            </button>
          </div>
        </div>
        
        {/* 测试按钮网格 */}
        <div>
          <p className="text-sm font-medium mb-4">模块按钮测试:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {testModules.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.id}
                  className="module-button dashboard-module-button flex items-center justify-start gap-3 px-5 py-4 rounded-3xl shadow-md transition-all duration-300 h-24 w-full relative overflow-hidden group cursor-pointer bg-gradient-to-br hover:shadow-lg hover:-translate-y-1 active:translate-y-0 active:shadow-md border border-white/40 dark:border-gray-800/40"
                  style={{
                    '--bg-gradient': `linear-gradient(to bottom right, var(--${module.id}-from), var(--${module.id}-to))`,
                    '--bg-gradient-hover': `linear-gradient(to bottom right, var(--${module.id}-hover-from), var(--${module.id}-hover-to))`,
                    '--text-color': 'var(--text-primary)',
                    '--icon-color': `var(--${module.id}-icon-color)`,
                    '--icon-bg': 'var(--icon-bg-color)',
                    '--badge-bg': `var(--${module.id}-badge-bg)`,
                    '--badge-text': 'var(--badge-text-color)',
                    '--transform-hover': 'translateY(-4px)',
                    '--transform-active': 'translateY(0)',
                    '--shadow-hover': '0 10px 25px -3px rgba(0, 0, 0, 0.1)',
                    '--shadow-active': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  } as React.CSSProperties}
                >
                  <div className="icon-container w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 group-hover:scale-105">
                    <Icon className="icon w-5 h-5 transition-all duration-300" />
                  </div>
                  <span className="text-[16px] font-medium leading-tight truncate transition-all duration-200">
                    {module.name}
                  </span>
                  
                  {/* 测试徽章 */}
                  <div className="badge absolute top-3 right-3 min-w-[22px] h-5 px-2 rounded-full flex items-center justify-center text-[11px] font-semibold tracking-tight transition-all duration-300 z-10 group-hover:scale-110 group-hover:rotate-6 shadow-sm ring-1 ring-white/50 dark:ring-white/20 mix-blend-normal">
                    <span>99</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* CSS变量调试信息 */}
        <div>
          <p className="text-sm font-medium mb-2">CSS变量调试:</p>
          <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-40">
            <pre>
              {JSON.stringify({
                mode,
                buttonTheme,
                quotationFrom: getComputedStyle(document.documentElement).getPropertyValue('--quotation-from'),
                quotationTo: getComputedStyle(document.documentElement).getPropertyValue('--quotation-to'),
                quotationIconColor: getComputedStyle(document.documentElement).getPropertyValue('--quotation-icon-color'),
                confirmationFrom: getComputedStyle(document.documentElement).getPropertyValue('--confirmation-from'),
                confirmationTo: getComputedStyle(document.documentElement).getPropertyValue('--confirmation-to'),
                confirmationIconColor: getComputedStyle(document.documentElement).getPropertyValue('--confirmation-icon-color'),
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
