'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

export default function TestDarkModePage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen p-8 bg-transparent dark:bg-gray-900/20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-200">
          黑暗模式测试页面
        </h1>
        
        <div className="mb-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            当前主题: {resolvedTheme}
          </p>
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            切换主题
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 测试模块 */}
          <div className="group relative rounded-xl transition-all duration-300 ease-in-out hover:-translate-y-1 cursor-pointer p-4 h-20 flex items-center space-x-3 w-full bg-transparent hover:bg-blue-50/50 dark:bg-transparent dark:hover:bg-blue-900/10">
            <div className="p-2.5 rounded-xl flex-shrink-0 transition-all duration-300 group-hover:scale-105 relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700">
              <div className="w-5 h-5 bg-white rounded"></div>
            </div>
            <div className="flex-1 min-w-0 text-left flex-shrink-0">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 leading-tight">
                测试模块
              </h3>
            </div>
          </div>

          <div className="group relative rounded-xl transition-all duration-300 ease-in-out hover:-translate-y-1 cursor-pointer p-4 h-20 flex items-center space-x-3 w-full bg-transparent hover:bg-emerald-50/50 dark:bg-transparent dark:hover:bg-emerald-900/10">
            <div className="p-2.5 rounded-xl flex-shrink-0 transition-all duration-300 group-hover:scale-105 relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700">
              <div className="w-5 h-5 bg-white rounded"></div>
            </div>
            <div className="flex-1 min-w-0 text-left flex-shrink-0">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 leading-tight">
                测试模块2
              </h3>
            </div>
          </div>

          <div className="group relative rounded-xl transition-all duration-300 ease-in-out hover:-translate-y-1 cursor-pointer p-4 h-20 flex items-center space-x-3 w-full bg-transparent hover:bg-cyan-50/50 dark:bg-transparent dark:hover:bg-cyan-900/10">
            <div className="p-2.5 rounded-xl flex-shrink-0 transition-all duration-300 group-hover:scale-105 relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700">
              <div className="w-5 h-5 bg-white rounded"></div>
            </div>
            <div className="flex-1 min-w-0 text-left flex-shrink-0">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 leading-tight">
                测试模块3
              </h3>
            </div>
          </div>

          <div className="group relative rounded-xl transition-all duration-300 ease-in-out hover:-translate-y-1 cursor-pointer p-4 h-20 flex items-center space-x-3 w-full bg-transparent hover:bg-violet-50/50 dark:bg-transparent dark:hover:bg-violet-900/10">
            <div className="p-2.5 rounded-xl flex-shrink-0 transition-all duration-300 group-hover:scale-105 relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700">
              <div className="w-5 h-5 bg-white rounded"></div>
            </div>
            <div className="flex-1 min-w-0 text-left flex-shrink-0">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 leading-tight">
                测试模块4
              </h3>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            调试信息
          </h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>当前主题: {resolvedTheme}</p>
            <p>HTML class: {typeof document !== 'undefined' ? document.documentElement.className : 'N/A'}</p>
            <p>Body class: {typeof document !== 'undefined' ? document.body.className : 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
