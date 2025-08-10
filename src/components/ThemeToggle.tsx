import React, { useState } from 'react';
import { Sun, Moon, Palette, Settings } from 'lucide-react';
import { useThemeManager } from '@/hooks/useThemeManager';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'compact';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'button', 
  className = '' 
}) => {
  const { 
    mode, 
    buttonTheme, 
    toggleMode, 
    toggleButtonTheme, 
    setMode, 
    setButtonTheme,
    isDark,
    isColorful 
  } = useThemeManager();
  
  const [showDropdown, setShowDropdown] = useState(false);

  // 按钮变体
  if (variant === 'button') {
    return (
      <button
        onClick={toggleMode}
        className={`
          p-2 rounded-lg transition-all duration-300
          bg-white/80 dark:bg-gray-800/80
          hover:bg-white dark:hover:bg-gray-700
          border border-gray-200/60 dark:border-gray-700/50
          shadow-sm hover:shadow-md
          ${className}
        `}
        title={`切换到${isDark ? '浅色' : '深色'}模式`}
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-gray-600" />
        )}
      </button>
    );
  }

  // 下拉菜单变体
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg
            bg-white/80 dark:bg-gray-800/80
            hover:bg-white dark:hover:bg-gray-700
            border border-gray-200/60 dark:border-gray-700/50
            shadow-sm hover:shadow-md transition-all duration-300
          `}
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">主题</span>
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200/60 dark:border-gray-700/50 z-50">
            <div className="p-2">
              {/* 模式切换 */}
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                  显示模式
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setMode('light');
                      setShowDropdown(false);
                    }}
                    className={`
                      w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                      ${mode === 'light' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Sun className="w-4 h-4" />
                    浅色模式
                  </button>
                  <button
                    onClick={() => {
                      setMode('dark');
                      setShowDropdown(false);
                    }}
                    className={`
                      w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                      ${mode === 'dark' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Moon className="w-4 h-4" />
                    深色模式
                  </button>
                </div>
              </div>

              {/* 按钮主题切换 */}
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                  按钮主题
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setButtonTheme('colorful');
                      setShowDropdown(false);
                    }}
                    className={`
                      w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                      ${buttonTheme === 'colorful' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Palette className="w-4 h-4" />
                    彩色主题
                  </button>
                  <button
                    onClick={() => {
                      setButtonTheme('classic');
                      setShowDropdown(false);
                    }}
                    className={`
                      w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                      ${buttonTheme === 'classic' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Settings className="w-4 h-4" />
                    经典主题
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 紧凑变体
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={toggleMode}
        className={`
          p-1.5 rounded-md transition-all duration-300
          ${isDark 
            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }
          hover:scale-105
        `}
        title={`切换到${isDark ? '浅色' : '深色'}模式`}
      >
        {isDark ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </button>
      
      <button
        onClick={toggleButtonTheme}
        className={`
          p-1.5 rounded-md transition-all duration-300
          ${isColorful 
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }
          hover:scale-105
        `}
        title={`切换到${isColorful ? '经典' : '彩色'}主题`}
      >
        <Palette className="w-4 h-4" />
      </button>
    </div>
  );
};

// 导出便捷组件
export const ThemeModeToggle: React.FC<{ className?: string }> = ({ className }) => (
  <ThemeToggle variant="button" className={className} />
);

export const ThemeDropdown: React.FC<{ className?: string }> = ({ className }) => (
  <ThemeToggle variant="dropdown" className={className} />
);

export const ThemeCompactToggle: React.FC<{ className?: string }> = ({ className }) => (
  <ThemeToggle variant="compact" className={className} />
);
