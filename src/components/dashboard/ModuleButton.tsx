import React, { useState, useEffect } from 'react';
import { useThemeSettings, ButtonTheme } from '@/hooks/useThemeSettings';
import { getModuleColors } from '@/constants/colorMap';

// 徽章颜色映射 - 确保正确显示
const getBadgeColorStyle = (moduleId: string) => {
  const colorMap = {
    'quotation': '#2563eb',      // blue-600
    'confirmation': '#059669',   // emerald-600
    'packing': '#0891b2',        // cyan-600
    'invoice': '#7c3aed',        // violet-600
    'purchase': '#ea580c',       // orange-600
    'ai-email': '#4f46e5',       // indigo-600
    'history': '#db2777',        // pink-600
    'customer': '#c026d3',       // fuchsia-600
  };
  
  return colorMap[moduleId as keyof typeof colorMap] || '#4b5563'; // gray-600 fallback
};

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
  
  // 根据主题渲染不同的按钮样式
  if (currentTheme === 'classic') {
    // 获取经典主题的颜色配置
    const classicColors = getModuleColors(module.id, 'classic') as {
      bgColor: string;
      hoverBgColor: string;
      textColor: string;
      iconBg: string;
      hoverIconBg: string;
      badgeBg: string;
      badgeText: string;
    };

    return (
      <button
        className={`
          flex items-center justify-start gap-3 px-5 py-4 rounded-3xl shadow-md transition-all duration-300
          h-24 w-full relative overflow-hidden group cursor-pointer
          backdrop-blur-md border border-white/40 dark:border-gray-800/40
          ${classicColors.bgColor} ${classicColors.hoverBgColor}
          hover:shadow-lg hover:-translate-y-1
          active:translate-y-0 active:shadow-md
        `}
        onClick={() => onClick(module)}
        onMouseEnter={() => onHover?.(module)}
      >
        {/* 图标容器 - 经典风格 */}
        <div className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${classicColors.iconBg} ${classicColors.hoverIconBg} group-hover:scale-105`}>
          <Icon
            className={`w-5 h-5 transition-all duration-300 ${classicColors.textColor}`}
          />
        </div>

        {/* 文字标题 */}
        <div className={`text-[16px] font-medium leading-tight truncate transition-all duration-200 ${classicColors.textColor}`}>
          {module.name}
        </div>

        {/* 数量徽章 */}
        {showBadge && (
          <div
            className={`absolute top-3 right-3 min-w-[20px] h-5 px-1.5 rounded-full
              flex items-center justify-center text-xs font-medium
              transition-all duration-300 z-10
              group-hover:scale-110 group-hover:rotate-6
              backdrop-blur-sm shadow-sm
              ${classicColors.badgeBg} ${classicColors.badgeText}`}
          >
            <span>
              {count > 9999 ? '9999+' : count}
            </span>
          </div>
        )}
      </button>
    );
  }

  // 获取彩色主题的颜色配置
  const colorfulColors = getModuleColors(module.id, 'colorful') as {
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
  };

  // 彩色主题
  return (
    <button
      className={`
        flex items-center justify-start gap-3 px-5 py-4 rounded-3xl shadow-md transition-all duration-300
        h-24 w-full relative overflow-hidden group cursor-pointer
        bg-gradient-to-br
        ${colorfulColors.bgFrom} ${colorfulColors.bgTo} 
        ${colorfulColors.darkBgFrom} ${colorfulColors.darkBgTo}
        ${colorfulColors.hoverFrom} ${colorfulColors.hoverTo} 
        ${colorfulColors.darkHoverFrom} ${colorfulColors.darkHoverTo}
        hover:shadow-lg hover:-translate-y-1
        active:translate-y-0 active:shadow-md
      `}
      onClick={() => onClick(module)}
      onMouseEnter={() => onHover?.(module)}
    >
      {/* 图标容器 - Apple 风格圆形背景 */}
      <div className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${colorfulColors.iconBg} group-hover:scale-105`}>
        <Icon
          className={`w-5 h-5 transition-all duration-300 ${colorfulColors.textColor}`}
        />
      </div>

      {/* 文字标题 - Apple 风格排版 */}
      <div className={`text-[16px] font-medium leading-tight truncate transition-all duration-200 ${colorfulColors.textColor}`}>
        {module.name}
      </div>

      {/* 数量徽章 - Apple 风格 */}
      {showBadge && (
        <div
          className="absolute top-3 right-3 min-w-[20px] h-5 px-1.5 rounded-full
            flex items-center justify-center text-xs font-medium
            transition-all duration-300 z-10
            group-hover:scale-110 group-hover:rotate-6
            shadow-sm text-white"
          style={{
            backgroundColor: getBadgeColorStyle(module.id)
          }}
        >
          <span>
            {count > 9999 ? '9999+' : count}
          </span>
        </div>
      )}
    </button>
  );
};