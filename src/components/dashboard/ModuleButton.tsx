import React from 'react';

// 定义模块接口
interface Module {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  bgColor: string;  // 改为必需字段
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
  const titleColor = module.titleColor || module.textColor;

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

  return (
    <button
      className="group relative overflow-hidden rounded-3xl h-24 w-full
        transition-all duration-300 ease-in-out
        hover:-translate-y-1 active:translate-y-0 cursor-pointer
        bg-white/30 border border-white/40 backdrop-blur-md
        shadow-md hover:shadow-lg"
      onClick={() => onClick(module)}
      onMouseEnter={() => onHover?.(module)}
    >
      {/* 悬停时的渐变背景层 */}
      <div className={`absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${bgColor}`} />

      {/* 主体内容层 - 提升到z-20 */}
      <div className="relative z-20 flex items-center justify-start gap-4 px-6 py-5 h-full">
        {/* 图标容器 - Apple 风格 */}
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 group-hover:bg-gradient-to-tr group-hover:from-white/40 group-hover:to-white/10 transition-all duration-300">
          <Icon
            className={`w-6 h-6 text-gray-800 dark:text-white 
              transition-all duration-300 group-hover:scale-105`}
          />
        </div>

        {/* 中文标题 - Apple 风格 */}
        <h3
          className={`text-[16px] font-medium leading-tight truncate
            text-gray-800 dark:text-white
            transition-all duration-200`}
        >
          {module.name}
        </h3>
      </div>

      {/* 各模块的数量徽章 - Apple 风格 */}
      {showBadge && (
        <div
          className={`absolute top-3 right-3 min-w-[20px] h-5 px-1.5 rounded-full
            flex items-center justify-center text-xs font-medium
            group-hover:scale-110 transition-all duration-300
            group-hover:rotate-6 group-hover:animate-pulse z-50 pointer-events-none 
            bg-gray-800/80 text-white backdrop-blur-sm shadow-sm`}
        >
          <span>
            {count > 9999 ? '9999+' : count}
          </span>
        </div>
      )}
    </button>
  );
}; 