import React, { useState } from 'react';
import { Moon, Settings, Sun } from 'lucide-react';
import { useThemeContext } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'compact';
  className?: string;
}

function CurrentModeIcon({ isDark, className = 'w-5 h-5' }: { isDark: boolean; className?: string }) {
  return isDark
    ? <Moon className={`${className} text-blue-300`} />
    : <Sun className={`${className} text-amber-500`} />;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  className = '',
}) => {
  const { mode, toggleMode, setMode, isDark } = useThemeContext();
  const [showDropdown, setShowDropdown] = useState(false);

  if (variant === 'button') {
    return (
      <button
        onClick={toggleMode}
        className={`
          p-2 rounded-lg transition-all duration-300
          bg-white/80 dark:bg-app-dark-surface
          hover:bg-white dark:hover:bg-white/10
          border border-gray-200/60 dark:border-white/10
          shadow-sm hover:shadow-md
          ${className}
        `}
        title={isDark ? '当前为深色模式，点击切换到浅色模式' : '当前为浅色模式，点击切换到深色模式'}
      >
        <CurrentModeIcon isDark={isDark} />
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="
            flex items-center gap-2 px-3 py-2 rounded-lg
            bg-white/80 dark:bg-app-dark-surface
            hover:bg-white dark:hover:bg-white/10
            border border-gray-200/60 dark:border-white/10
            shadow-sm hover:shadow-md transition-all duration-300
          "
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">主题</span>
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-200/60 bg-white shadow-lg dark:border-white/10 dark:bg-app-dark-surface">
            <div className="p-2">
              <div className="mb-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">
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
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-white/10'
                    }
                  `}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
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
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-white/10'
                    }
                  `}
                >
                  <Moon className="w-4 h-4 text-blue-300" />
                  深色模式
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={toggleMode}
      className={`rounded-md p-1.5 text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white ${className}`}
      title={isDark ? '当前为深色模式，点击切换到浅色模式' : '当前为浅色模式，点击切换到深色模式'}
    >
      <CurrentModeIcon isDark={isDark} className="w-4 h-4" />
    </button>
  );
};

export const ThemeModeToggle: React.FC<{ className?: string }> = ({ className }) => (
  <ThemeToggle variant="button" className={className} />
);

export const ThemeDropdown: React.FC<{ className?: string }> = ({ className }) => (
  <ThemeToggle variant="dropdown" className={className} />
);

export const ThemeCompactToggle: React.FC<{ className?: string }> = ({ className }) => (
  <ThemeToggle variant="compact" className={className} />
);
