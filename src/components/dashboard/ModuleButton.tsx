import React, { useState, useEffect } from 'react';
import { useThemeSettings, ButtonTheme } from '@/hooks/useThemeSettings';
import { getModuleColors } from '@/constants/colorMap';

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
  const { settings } = useThemeSettings();
  const [currentTheme, setCurrentTheme] = useState<ButtonTheme>(settings.buttonTheme);
  const Icon = module.icon;

  // 监听主题变化
  useEffect(() => {
    setCurrentTheme(settings.buttonTheme);
  }, [settings.buttonTheme]);

  // 监听全局主题变化事件
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      setCurrentTheme(event.detail.buttonTheme);
    };

    window.addEventListener('themeSettingsChanged', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('themeSettingsChanged', handleThemeChange as EventListener);
    };
  }, []);

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

  // 统一获取当前主题的颜色配置（classic 与 colorful 结构一致）
  const c = getModuleColors(module.id, currentTheme) as unknown as {
    bgFrom: string;
    bgTo: string;
    hoverFrom: string;
    hoverTo: string;
    textColor: string;
    iconBg: string;
    darkBgFrom: string;
    darkBgTo: string;
    darkHoverFrom: string;
    darkHoverTo: string;
    badgeBg: string;
    badgeText: string;
    hoverIconBg?: string;
    iconColor?: string; // Added iconColor
  };

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
      className={`
        flex items-center justify-start gap-3 px-5 py-4 rounded-3xl shadow-md transition-all duration-300
        h-24 w-full relative overflow-hidden group cursor-pointer
        bg-gradient-to-br
        ${c.bgFrom} ${c.bgTo}
        ${c.darkBgFrom} ${c.darkBgTo}
        ${c.hoverFrom} ${c.hoverTo}
        ${c.darkHoverFrom} ${c.darkHoverTo}
        hover:shadow-lg hover:-translate-y-1
        active:translate-y-0 active:shadow-md
        border border-white/40 dark:border-gray-800/40
      `}
      onClick={() => onClick(module)}
      onMouseEnter={() => onHover?.(module)}
    >
      {/* 图标容器 */}
      <div className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${c.iconBg} ${c.hoverIconBg ?? ''} group-hover:scale-105`}>
        <Icon className={`w-5 h-5 transition-all duration-300 ${c.iconColor ?? c.textColor} ${explicitIconColorByModule[module.id] ?? ''}`} />
      </div>

      {/* 文字标题 */}
      <div className={`text-[16px] font-medium leading-tight truncate transition-all duration-200 ${c.textColor}`}>
        {module.name}
      </div>

      {/* 数量徽章 */}
      {showBadge && (
        <div
          className={`absolute top-3 right-3 min-w-[22px] h-5 px-2 rounded-full
            flex items-center justify-center text-[11px] font-semibold tracking-tight
            transition-all duration-300 z-10
            group-hover:scale-110 group-hover:rotate-6
            shadow-sm ring-1 ring-white/50 dark:ring-white/20 mix-blend-normal ${c.badgeBg} ${fallbackBadgeBgByModule[module.id] ?? ''} ${c.badgeText} !text-white`}
        >
          <span>{count > 9999 ? '9999+' : count}</span>
        </div>
      )}
    </button>
  );
};