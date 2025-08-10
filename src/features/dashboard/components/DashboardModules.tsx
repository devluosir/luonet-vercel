import React from 'react';
import { ModuleButton } from '@/components/dashboard/ModuleButton';

// 模块类型定义
interface DashboardModule {
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

interface DocumentCounts {
  quotation: number;
  confirmation: number;
  invoice: number;
  packing: number;
  purchase: number;
}

interface DashboardModulesProps {
  quickCreateModules: DashboardModule[];
  toolModules: DashboardModule[];
  toolsModules: DashboardModule[];
  documentCounts: DocumentCounts;
  onModuleClick: (module: DashboardModule) => void;
  onModuleHover?: (module: DashboardModule) => void;
}

export const DashboardModules: React.FC<DashboardModulesProps> = ({
  quickCreateModules,
  toolModules,
  toolsModules,
  documentCounts,
  onModuleClick,
  onModuleHover
}) => {
  // 检查是否有可显示的模块
  const hasModules = quickCreateModules.length > 0 || 
                    toolModules.length > 0 || 
                    toolsModules.length > 0;

  if (!hasModules) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {/* 新建单据按钮 */}
        {quickCreateModules.map((module) => (
          <ModuleButton 
            key={module.id}
            module={module}
            onClick={onModuleClick}
            onHover={onModuleHover}
            quotationCount={documentCounts.quotation}
            confirmationCount={documentCounts.confirmation}
            invoiceCount={documentCounts.invoice}
            packingCount={documentCounts.packing}
            purchaseCount={documentCounts.purchase}
          />
        ))}
        
        {/* 管理中心按钮 */}
        {toolsModules.slice(0, 4).map((module) => (
          <ModuleButton 
            key={module.id}
            module={module}
            onClick={onModuleClick}
            onHover={onModuleHover}
            quotationCount={documentCounts.quotation}
            confirmationCount={documentCounts.confirmation}
            invoiceCount={documentCounts.invoice}
            packingCount={documentCounts.packing}
            purchaseCount={documentCounts.purchase}
          />
        ))}
        
        {/* 实用工具按钮 */}
        {toolModules.map((module) => (
          <ModuleButton 
            key={module.id}
            module={module}
            onClick={onModuleClick}
            onHover={onModuleHover}
            quotationCount={documentCounts.quotation}
            confirmationCount={documentCounts.confirmation}
            invoiceCount={documentCounts.invoice}
            packingCount={documentCounts.packing}
            purchaseCount={documentCounts.purchase}
          />
        ))}
      </div>
    </div>
  );
};
