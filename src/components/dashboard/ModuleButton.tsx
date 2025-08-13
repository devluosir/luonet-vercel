import React from 'react';
import { useThemeContext } from '@/contexts/ThemeContext';

// 定义模块接口
interface Module {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface ModuleButtonProps {
  module: Module;
  onClick: (module: Module) => void;
  onHover?: (module: Module) => void;
  quotationCount?: number;
  confirmationCount?: number;
  invoiceCount?: number;
  packingCount?: number;
  purchaseCount?: number;
}

export const ModuleButton: React.FC<ModuleButtonProps> = ({
  module,
  onClick,
  onHover,
  quotationCount = 0,
  confirmationCount = 0,
  invoiceCount = 0,
  packingCount = 0,
  purchaseCount = 0
}) => {
  const { buttonTheme, getModuleColors } = useThemeContext();
  const Icon = module.icon;

  const getCountForModule = (moduleId: string): number => {
    switch (moduleId) {
      case 'quotation': return quotationCount;
      case 'confirmation': return confirmationCount;
      case 'invoice': return invoiceCount;
      case 'packing': return packingCount;
      case 'purchase': return purchaseCount;
      default: return 0;
    }
  };

  const count = getCountForModule(module.id);
  const showBadge = count > 0;

  // 获取当前主题的颜色配置
  const c = getModuleColors(module.id, buttonTheme);

  const explicitIconColorByModule: Record<string, string> = {
    confirmation: 'text-emerald-600 dark:text-emerald-500',
    history: 'text-pink-600 dark:text-pink-500',
  };

  // 徽章背景颜色兜底，避免某些构建情况下动态类名未被捕获
  const fallbackBadgeBgByModule: Record<string, string> = {
    quotation: 'bg-blue-600 dark:bg-blue-500',
    confirmation: 'bg-emerald-600 dark:bg-emerald-500',
    packing: 'bg-cyan-600 dark:bg-cyan-500',
    invoice: 'bg-violet-600 dark:bg-violet-500',
    purchase: 'bg-orange-600 dark:bg-orange-500',
    'ai-email': 'bg-indigo-600 dark:bg-indigo-500',
    history: 'bg-pink-600 dark:bg-pink-500',
    customer: 'bg-fuchsia-600 dark:bg-fuchsia-500',
  };

  // 验证CSS变量是否存在，如果不存在则使用默认值
  const getCSSVariableWithFallback = (variableName: string, fallback: string): string => {
    if (typeof window === 'undefined') return fallback;
    
    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName);
    return value.trim() || fallback;
  };

  // 构建CSS变量对象，包含错误处理
  const cssVariables = {
    '--bg-gradient': `linear-gradient(135deg, ${getCSSVariableWithFallback(`--${module.id}-from`, 'rgba(59, 130, 246, 0.08)')}, ${getCSSVariableWithFallback(`--${module.id}-to`, 'rgba(59, 130, 246, 0.12)')})`,
    '--bg-gradient-hover': `linear-gradient(135deg, ${getCSSVariableWithFallback(`--${module.id}-hover-from`, 'rgba(59, 130, 246, 0.12)')}, ${getCSSVariableWithFallback(`--${module.id}-hover-to`, 'rgba(59, 130, 246, 0.18)')})`,
    '--text-color': getCSSVariableWithFallback('--text-primary', '#171717'),
    '--icon-color': getCSSVariableWithFallback(`--${module.id}-icon-color`, '#2563eb'),
    '--badge-bg': getCSSVariableWithFallback(`--${module.id}-badge-bg`, '#2563eb'),
    '--badge-text': getCSSVariableWithFallback('--badge-text-color', '#ffffff'),
  };

  // 开发环境下调试CSS变量
  if (process.env.NODE_ENV === 'development') {
    console.log(`🎨 ${module.id} 按钮CSS变量:`, cssVariables);
  }

  return (
    <button
      className="module-button dashboard-module-button flex items-center justify-start gap-3 sm:gap-4 px-4 sm:px-5 py-4 sm:py-5 h-[96px] w-full relative group cursor-pointer"
      style={cssVariables as React.CSSProperties}
      onClick={() => onClick(module)}
      onMouseEnter={() => onHover?.(module)}
    >
      {/* 图标容器 */}
      <div className="icon-container w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center flex-shrink-0">
        <Icon className="icon w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6" />
      </div>

      {/* 文字标题 */}
      <div className="text-sm sm:text-base md:text-base font-semibold leading-tight truncate flex-1 min-w-0 text-left pl-0">
        {module.name}
      </div>

      {/* 数量徽章 */}
      {showBadge && (
        <div className="badge absolute top-2 right-2 sm:top-2.5 sm:right-2.5 md:top-3 md:right-3 min-w-[18px] h-4.5 sm:min-w-[20px] sm:h-5 md:min-w-[22px] md:h-5.5 px-1.5 sm:px-2 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] md:text-[11px] font-bold tracking-wide z-10">
          <span>{count > 9999 ? '9999+' : count}</span>
        </div>
      )}
    </button>
  );
};