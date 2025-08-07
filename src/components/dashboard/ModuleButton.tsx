import React from 'react';

// 定义模块接口
interface Module {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  bgColor: string;  // 改为必需字段
  iconBg: string;   // 改为必需字段
  textColor?: string;
  titleColor?: string;
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
  
  // 直接使用模块配置的颜色（已通过 ...moduleColorMap[xxx] 注入）
  const bgColor = module.bgColor;
  const iconBg = module.iconBg;
  const titleColor = module.titleColor || module.textColor;
  

  
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
  
  return (
    <button
      className={`group relative 
        rounded-xl transition-all duration-300 ease-in-out
        hover:-translate-y-1 active:translate-y-0 cursor-pointer
        p-4 h-20 flex items-center space-x-3 w-full
        ${bgColor}`}
      // 移除内联样式，使用模块配置
      onClick={() => onClick(module)}
      onMouseEnter={() => onHover?.(module)}
    >
      {/* 图标容器 */}
      <div 
        className={`p-2.5 rounded-xl flex-shrink-0 
          transition-all duration-300 group-hover:scale-105
          relative w-10 h-10 flex items-center justify-center
          ${iconBg}`}
      >
        {/* 图标本身 */}
        <Icon 
          className="w-5 h-5 dashboard-module-icon relative z-20 transition-all duration-300 
            group-hover:scale-105" 
          style={{ 
            fill: 'none', 
            color: 'white',
            stroke: 'white',
            strokeWidth: '2px',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2)) brightness(1.05)',
            textShadow: '0 1px 1px rgba(0,0,0,0.2)'
          }}
        />
        
        {/* 图标高光效果 - 轻微的高光，不覆盖背景色 */}
        <div className="absolute top-0 left-0 w-full h-1/3 rounded-t-xl bg-gradient-to-b from-white/20 to-transparent"></div>
        
        {/* 悬停时的图标边缘光晕 */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 via-white/5 to-transparent 
          opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      
      {/* 文本内容 */}
      <div className="flex-1 min-w-0 text-left flex-shrink-0">
        <h3 
          className={`text-base font-bold ${titleColor} leading-tight line-clamp-1
            transition-all duration-200 group-hover:scale-105 transform`}
        >
          {module.name}
        </h3>
      </div>
      
      {/* 各模块的数量徽章 */}
      {showBadge && (
        <div 
          className={`absolute top-2 right-2 min-w-[20px] h-5 px-1.5 rounded-full text-white 
            flex items-center justify-center text-xs font-bold
            group-hover:scale-110 transition-all duration-300
            group-hover:rotate-6 group-hover:animate-pulse z-50 pointer-events-none ${iconBg}`}
        >
          {/* 徽章光泽效果 */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-1/2 rounded-t-full bg-gradient-to-b from-white/20 to-transparent"></div>
          <span className="relative z-10">{count > 9999 ? '9999+' : count}</span>
        </div>
      )}
    </button>
  );
}; 