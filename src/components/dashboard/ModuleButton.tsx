import React from 'react';

// 定义模块接口
interface Module {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  bgColor?: string;
  iconBg?: string;
  textColor?: string;
  titleColor?: string;
  shortcut?: string;
  shortcutBg?: string;
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
  const Icon = module.icon;
  
  // 优先使用模块对象的颜色字段
  const bgColor = module.bgColor || 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 dark:from-gray-800/50 dark:to-gray-700/40 dark:hover:from-gray-700/40 dark:hover:to-gray-600/50';
  const iconBg = module.iconBg || 'bg-gradient-to-br from-gray-500 to-gray-600';
  const titleColor = module.titleColor || module.textColor || 'text-gray-800 dark:text-gray-200';
  const shortcutBg = module.shortcutBg || iconBg;
  
  // 调试日志 - 打印模块颜色信息
  React.useEffect(() => {
    console.log(`[ModuleButton Debug] ${module.id}:`, {
      name: module.name,
      bgColor: module.bgColor,
      iconBg: module.iconBg,
      textColor: module.textColor,
      titleColor: module.titleColor,
      finalBgColor: bgColor,
      finalIconBg: iconBg,
      finalTitleColor: titleColor
    });
  }, [module.id, module.name, module.bgColor, module.iconBg, module.textColor, module.titleColor, bgColor, iconBg, titleColor]);
  
  // 根据模块ID获取对应的数量
  const getCountForModule = (moduleId: string): number => {
    switch (moduleId) {
      case 'quotation':
        return quotationCount;
      case 'confirmation':
        return confirmationCount;
      case 'invoice':
        return invoiceCount;
      case 'packing':
        return packingCount;
      case 'purchase':
        return purchaseCount;
      default:
        return 0;
    }
  };
  
  const count = getCountForModule(module.id);
  const showBadge = count > 0;
  
  // 获取内联样式以确保颜色优先级
  const getBackgroundStyle = () => {
    switch (module.id) {
      case 'quotation':
        return { background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' };
      case 'confirmation':
        return { background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' };
      case 'packing':
        return { background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)' };
      case 'invoice':
        return { background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' };
      case 'purchase':
        return { background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)' };
      case 'history':
        return { background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' };
      case 'customer':
        return { background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' };
      case 'ai-email':
        return { background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' };
      default:
        return {};
    }
  };
  
  const getIconBackgroundStyle = () => {
    switch (module.id) {
      case 'quotation':
        return { background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' };
      case 'confirmation':
        return { background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' };
      case 'packing':
        return { background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' };
      case 'invoice':
        return { background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)' };
      case 'purchase':
        return { background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)' };
      case 'history':
        return { background: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)' };
      case 'customer':
        return { background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' };
      case 'ai-email':
        return { background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' };
      default:
        return {};
    }
  };
  
  const getTextColorStyle = () => {
    switch (module.id) {
      case 'quotation':
        return { color: '#1e40af' };
      case 'confirmation':
        return { color: '#166534' };
      case 'packing':
        return { color: '#0f766e' };
      case 'invoice':
        return { color: '#7c3aed' };
      case 'purchase':
        return { color: '#c2410c' };
      case 'history':
        return { color: '#be185d' };
      case 'customer':
        return { color: '#6d28d9' };
      case 'ai-email':
        return { color: '#4338ca' };
      default:
        return {};
    }
  };
  
  return (
    <button
      className={`group relative shadow-lg hover:shadow-xl 
        rounded-xl overflow-hidden transition-all duration-300 ease-in-out
        hover:-translate-y-1 active:translate-y-0 cursor-pointer
        border border-gray-200/50 dark:border-gray-800/50
        hover:border-gray-300/70 dark:hover:border-gray-700/70
        active:shadow-md
        p-4 h-20 flex items-center space-x-3 w-full
        backdrop-blur-sm ${bgColor}`}
      style={getBackgroundStyle()}
      onClick={() => onClick(module)}
      onMouseEnter={() => onHover?.(module)}
    >
      {/* 图标容器 - 增强彩色效果 */}
      <div 
        className={`p-2.5 rounded-xl ${iconBg} flex-shrink-0 shadow-xl group-hover:shadow-2xl 
          transition-all duration-300 group-hover:scale-110
          relative overflow-hidden`}
        style={getIconBackgroundStyle()}
      >
        {/* 图标背景渐变效果 */}
        <div className={`absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent 
          group-hover:from-white/40 group-hover:via-white/20 transition-all duration-300`}></div>
        {/* 图标本身 */}
        <Icon className="w-5 h-5 text-white relative z-10 transition-all duration-300 
          group-hover:scale-110 group-hover:drop-shadow-lg" />
        {/* 图标光晕效果 */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent 
          opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      
      {/* 文本内容 */}
      <div className="flex-1 min-w-0 text-left">
        <h3 
          className={`text-base font-bold ${titleColor} leading-tight line-clamp-1
            transition-all duration-200 group-hover:scale-105 transform group-hover:drop-shadow-sm`}
          style={getTextColorStyle()}
        >
          {module.name}
        </h3>
      </div>
      
      {/* 各模块的数量徽章或快捷键 */}
      {showBadge ? (
        <div 
          className={`absolute top-2 right-2 min-w-[20px] h-5 px-1.5 ${iconBg} rounded-full text-white 
            flex items-center justify-center text-xs font-bold shadow-lg
            group-hover:scale-110 group-hover:shadow-xl transition-all duration-300
            group-hover:rotate-6 group-hover:animate-pulse`}
          style={getIconBackgroundStyle()}
        >
          {count > 9999 ? '9999+' : count}
        </div>
      ) : module.shortcut ? (
        <div 
          className={`absolute top-2 right-2 w-6 h-6 ${shortcutBg} rounded-lg text-white 
            flex items-center justify-center text-xs font-bold shadow-lg
            group-hover:scale-110 group-hover:shadow-xl transition-all duration-300
            group-hover:rotate-6 group-hover:animate-pulse`}
          style={getIconBackgroundStyle()}
        >
          {module.shortcut}
        </div>
      ) : null}
      
      {/* 悬停时的光晕效果 */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent 
        opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      {/* 边框光晕效果 */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent 
        group-hover:border-white/20 transition-all duration-300 pointer-events-none"></div>
    </button>
  );
}; 