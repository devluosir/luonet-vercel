'use client'

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Footer() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="w-full border-t border-gray-200/30 dark:border-gray-800/30 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <a 
              href="mailto:luo@luocompany.com"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Design by Roger
            </a>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">2025</span>
          </div>

          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-gray-100/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400
                       hover:bg-gray-200/80 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label="切换主题模式"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
