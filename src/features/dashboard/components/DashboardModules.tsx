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

  // 合并所有模块
  const allModules = [...quickCreateModules, ...toolsModules, ...toolModules];

  if (!hasModules) {
    return null;
  }

  return (
    <div className="mb-8">
      
      {/* 所有模块统一显示 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 md:gap-4 lg:gap-5 xl:gap-6">
        {allModules.map((module) => (
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
