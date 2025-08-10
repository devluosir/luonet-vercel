import React from 'react';
import { useThemeManager } from '@/hooks/useThemeManager';

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
  const { buttonTheme, getModuleColors } = useThemeManager();
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

  return (
    <button
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
      onClick={() => onClick(module)}
      onMouseEnter={() => onHover?.(module)}
    >
      {/* 图标容器 */}
      <div className="icon-container w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 group-hover:scale-105">
        <Icon className="icon w-5 h-5 transition-all duration-300" />
      </div>

      {/* 文字标题 */}
      <div className="text-[16px] font-medium leading-tight truncate transition-all duration-200">
        {module.name}
      </div>

      {/* 数量徽章 */}
      {showBadge && (
        <div
          className="badge absolute top-3 right-3 min-w-[22px] h-5 px-2 rounded-full flex items-center justify-center text-[11px] font-semibold tracking-tight transition-all duration-300 z-10 group-hover:scale-110 group-hover:rotate-6 shadow-sm ring-1 ring-white/50 dark:ring-white/20 mix-blend-normal"
        >
          <span>{count > 9999 ? '9999+' : count}</span>
        </div>
      )}
    </button>
  );
};