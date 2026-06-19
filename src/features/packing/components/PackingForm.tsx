'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Settings, History } from 'lucide-react';
import { PackingFormProps } from '../types';
import { BasicInfoSection } from './BasicInfoSection';
import { ItemsTableSection } from './ItemsTableSection';
import { RemarksSection } from './RemarksSection';
import { SettingsPanel } from '../../../components/packinglist/SettingsPanel';

import { calculatePackingTotals } from '../utils/calculations';



// 标题样式
const titleClassName = `text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]`;

export const PackingForm: React.FC<PackingFormProps> = ({
  data,
  onDataChange,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const [editingUnitPriceIndex, setEditingUnitPriceIndex] = useState<number | null>(null);
  const [editingUnitPrice, setEditingUnitPrice] = useState<string>('');
  const [editingFeeIndex, setEditingFeeIndex] = useState<number | null>(null);
  const [editingFeeAmount, setEditingFeeAmount] = useState<string>('');

  // 计算总计
  const totals = calculatePackingTotals(data, {
    packageQty: data.manualMergedCells?.packageQty || [],
    dimensions: data.manualMergedCells?.dimensions || [],
    marks: data.manualMergedCells?.marks || []
  });

  // 处理数据变更
  const handleDataChange = (newData: Partial<typeof data>) => {
    onDataChange({ ...data, ...newData });
  };

  // 处理设置面板回调
  const handleDocumentTypeChange = (type: 'proforma' | 'packing' | 'both') => {
    const updates: Partial<typeof data> = { documentType: type };
    
    // 根据文档类型自动调整显示选项
    switch (type) {
      case 'proforma':
        updates.showPrice = true;
        updates.showWeightAndPackage = false;
        updates.showDimensions = false;
        updates.showHsCode = true;
        // 🚫 移除全局列显示设置修改，避免影响其他单据
        // setCols(['description', 'quantity', 'unit', 'hsCode', 'unitPrice', 'amount']);
        break;
      case 'packing':
        updates.showPrice = false;
        updates.showWeightAndPackage = true;
        updates.showDimensions = true;
        updates.showHsCode = true;
        // 🚫 移除全局列显示设置修改，避免影响其他单据
        // setCols(['description', 'quantity', 'unit', 'hsCode', 'netWeight', 'grossWeight', 'packageQty', 'dimensions']);
        break;
      case 'both':
        updates.showPrice = true;
        updates.showWeightAndPackage = true;
        updates.showDimensions = true;
        updates.showHsCode = true;
        // 🚫 移除全局列显示设置修改，避免影响其他单据
        // setCols(['description', 'quantity', 'unit', 'hsCode', 'unitPrice', 'amount', 'netWeight', 'grossWeight', 'packageQty', 'dimensions']);
        break;
    }
    
    handleDataChange(updates);
  };

  return (
    <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl sm:rounded-3xl shadow-lg">
            <form>
              {/* 标题和设置按钮 */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-[#3A3A3C]">
                <div className="flex items-center gap-4">
                  <h1 className={titleClassName}>
                    Generate {
                      data.documentType === 'proforma' ? 'Proforma Invoice' :
                      data.documentType === 'packing' ? 'Packing List' :
                      'Proforma Invoice & Packing List'
                    }
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/history?tab=packing"
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="历史记录"
                  >
                    <History className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                </div>
              </div>

              {/* 设置面板 */}
              <SettingsPanel
                isVisible={showSettings}
                documentType={data.documentType}
                dimensionUnit={data.dimensionUnit}
                headerType={data.templateConfig.headerType}
                customUnits={data.customUnits}
                onDocumentTypeChange={handleDocumentTypeChange}
                onDimensionUnitChange={(unit) => handleDataChange({ dimensionUnit: unit })}
                onHeaderTypeChange={(headerType) => handleDataChange({ 
                  templateConfig: { ...data.templateConfig, headerType } 
                })}
                onCustomUnitsChange={(units) => handleDataChange({ customUnits: units })}
              />

              {/* 基本信息区域 */}
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <BasicInfoSection
                  data={data}
                  onDataChange={handleDataChange}
                />
              </div>

              {/* 商品表格区域 */}
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <ItemsTableSection
                  data={data}
                  onDataChange={handleDataChange}
                  totals={totals}
                  editingUnitPriceIndex={editingUnitPriceIndex}
                  editingUnitPrice={editingUnitPrice}
                  editingFeeIndex={editingFeeIndex}
                  editingFeeAmount={editingFeeAmount}
                  setEditingUnitPriceIndex={setEditingUnitPriceIndex}
                  setEditingUnitPrice={setEditingUnitPrice}
                  setEditingFeeIndex={setEditingFeeIndex}
                  setEditingFeeAmount={setEditingFeeAmount}
                />
              </div>

              {/* 备注区域 */}
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <RemarksSection
                  data={data}
                  onDataChange={handleDataChange}
                />
              </div>

            </form>
          </div>
    </div>
  );
};
