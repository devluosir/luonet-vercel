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
  
  // 使用模块对象的颜色字段
  const bgColor = module.bgColor || 'bg-gradient-to-br from-gray-50/80 to-gray-100/60 hover:from-gray-100/90 hover:to-gray-200/80 dark:from-gray-800/20 dark:to-gray-700/30 dark:hover:from-gray-700/40 dark:hover:to-gray-600/50';
  const titleColor = module.titleColor || module.textColor || 'text-gray-700 dark:text-gray-300';
  
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
      className={`group relative shadow-lg hover:shadow-xl 
        rounded-xl transition-all duration-300 ease-in-out
        hover:-translate-y-1 active:translate-y-0 cursor-pointer
        border border-gray-200/30 dark:border-gray-800/30
        hover:border-gray-300/50 dark:hover:border-gray-700/50
        active:shadow-md
        p-4 h-20 flex items-center space-x-3 w-full
        backdrop-blur-sm ${bgColor}`}
      style={{
        background: module.id === 'quotation' ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' :
                   module.id === 'confirmation' ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' :
                   module.id === 'packing' ? 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)' :
                   module.id === 'invoice' ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' :
                   module.id === 'purchase' ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' :
                   module.id === 'history' ? 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)' :
                   module.id === 'customer' ? 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)' :
                   module.id === 'ai-email' ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' :
                   'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3)'
        }}
      onClick={() => onClick(module)}
      onMouseEnter={() => onHover?.(module)}
    >
      {/* 图标容器 - 固定位置，完全不受徽章影响，增强精细度 */}
      <div 
        className={`p-2.5 rounded-xl flex-shrink-0 shadow-xl group-hover:shadow-2xl 
          transition-all duration-300 group-hover:scale-110
          relative backdrop-blur-sm w-10 h-10 flex items-center justify-center
          border border-white/20 group-hover:border-white/40`}
        style={{
          background: module.id === 'quotation' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' :
                     module.id === 'confirmation' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                     module.id === 'packing' ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' :
                     module.id === 'invoice' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' :
                     module.id === 'purchase' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                     module.id === 'history' ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' :
                     module.id === 'customer' ? 'linear-gradient(135deg, #d946ef 0%, #c026d3 100%)' :
                     module.id === 'ai-email' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' :
                     'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
        }}
      >
        {/* 图标背景渐变效果 - 增强光泽和立体感 */}
        <div className={`absolute inset-0 bg-gradient-to-br from-white/50 via-white/25 to-transparent 
          group-hover:from-white/60 group-hover:via-white/35 transition-all duration-300 rounded-xl`}></div>
        
        {/* 图标容器内阴影 - 增强深度 */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-black/15 via-black/8 to-transparent"></div>
        
        {/* 图标容器高光 - 增强立体感 */}
        <div className="absolute top-0 left-0 w-full h-1/2 rounded-t-xl bg-gradient-to-b from-white/40 to-transparent"></div>
        
        {/* 图标容器边缘光晕 - 增强精致感 */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 via-white/10 to-transparent 
          opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* 图标本身 - 大幅增强精细化效果，保持透明区域 */}
        <Icon 
          className="w-5 h-5 dashboard-module-icon relative z-20 transition-all duration-300 
            group-hover:scale-110 group-hover:drop-shadow-lg filter drop-shadow-sm" 
          style={{ 
            fill: 'none', 
            color: 'white',
            stroke: 'white',
            strokeWidth: '2px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3)) drop-shadow(0 1px 2px rgba(0,0,0,0.2)) brightness(1.1) contrast(1.2)',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}
        />
        
        {/* 图标内阴影效果 - 增强深度感 */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-black/20 via-black/10 to-transparent"></div>
        
        {/* 图标高光效果 - 增强立体感 */}
        <div className="absolute top-0 left-0 w-full h-1/2 rounded-t-xl bg-gradient-to-b from-white/50 to-transparent"></div>
        
        {/* 图标边缘光晕 - 增强精致感 */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 via-white/15 to-transparent 
          opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* 图标内发光效果 - 新增 */}
        <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-white/20 via-white/10 to-transparent 
          opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* 图标外发光效果 - 新增 */}
        <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-white/15 via-white/5 to-transparent 
          opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
        
        {/* 图标立体边框效果 - 新增 */}
        <div className="absolute inset-0 rounded-xl border border-white/30 
          opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* 图标中心高光 - 新增 */}
        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/40 
          opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      
      {/* 文本内容 - 固定位置，不受徽章影响 */}
      <div className="flex-1 min-w-0 text-left flex-shrink-0">
        <h3 
          className={`text-base font-bold ${titleColor} leading-tight line-clamp-1
            transition-all duration-200 group-hover:scale-105 transform group-hover:drop-shadow-sm`}
        >
          {module.name}
        </h3>
      </div>
      
      {/* 各模块的数量徽章 - 绝对定位，完全不影响布局 */}
      {showBadge && (
        <div 
          className={`absolute top-2 right-2 min-w-[20px] h-5 px-1.5 rounded-full text-white 
            flex items-center justify-center text-xs font-bold shadow-lg backdrop-blur-sm
            group-hover:scale-110 group-hover:shadow-xl transition-all duration-300
            group-hover:rotate-6 group-hover:animate-pulse z-50 pointer-events-none`}
          style={{
            background: module.id === 'quotation' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' :
                       module.id === 'confirmation' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                       module.id === 'packing' ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' :
                       module.id === 'invoice' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' :
                       module.id === 'purchase' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                       module.id === 'history' ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' :
                       module.id === 'customer' ? 'linear-gradient(135deg, #d946ef 0%, #c026d3 100%)' :
                       module.id === 'ai-email' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' :
                       'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
          }}
        >
          {/* 徽章光泽效果 */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-1/2 rounded-t-full bg-gradient-to-b from-white/20 to-transparent"></div>
          <span className="relative z-10">{count > 9999 ? '9999+' : count}</span>
        </div>
      )}
      
      {/* 悬停时的光晕效果 */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/15 to-transparent 
        opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      {/* 边框光晕效果 */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent 
        group-hover:border-white/30 transition-all duration-300 pointer-events-none"></div>
    </button>
  );
}; 