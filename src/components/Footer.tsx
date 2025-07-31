'use client'

import { useTheme } from 'next-themes';
import { Sun, Moon, Calculator, CalendarDays } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Calculator as CalculatorComponent } from './Calculator';
import { DateCalculator } from './DateCalculator';

export function Footer() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showDateCalculator, setShowDateCalculator] = useState(false);
  const calculatorButtonRef = useRef<HTMLButtonElement>(null);
  const dateCalculatorButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 打开计算器弹窗
  const openCalculator = () => {
    setShowCalculator(true);
  };

  // 打开日期计算器弹窗
  const openDateCalculator = () => {
    setShowDateCalculator(true);
  };

  return (
    <>
      <footer className="w-full border-t border-gray-200/30 dark:border-gray-800/30 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl">
        <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4">
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

            {/* 中间位置的工具图标 */}
            <div className="flex items-center space-x-2">
              <button
                ref={calculatorButtonRef}
                onClick={openCalculator}
                className="p-2 rounded-lg bg-gray-100/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400
                         hover:bg-gray-200/80 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 
                         transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                aria-label="打开计算器"
                title="打开计算器"
              >
                <Calculator className="h-4 w-4" />
              </button>
              <button
                ref={dateCalculatorButtonRef}
                onClick={openDateCalculator}
                className="p-2 rounded-lg bg-gray-100/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400
                         hover:bg-gray-200/80 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 
                         transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                aria-label="打开日期计算器"
                title="打开日期计算器"
              >
                <CalendarDays className="h-4 w-4" />
              </button>
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

      {/* 计算器组件 */}
      <CalculatorComponent
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        triggerRef={calculatorButtonRef}
      />

      {/* 日期计算器组件 */}
      <DateCalculator
        isOpen={showDateCalculator}
        onClose={() => setShowDateCalculator(false)}
        triggerRef={dateCalculatorButtonRef}
      />
    </>
  );
}
