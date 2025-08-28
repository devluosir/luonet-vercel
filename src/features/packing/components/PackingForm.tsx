'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Settings, History, Eye, FileSpreadsheet, Save } from 'lucide-react';
import { PackingFormProps } from '../types';
import { BasicInfoSection } from './BasicInfoSection';
import { ItemsTableSection } from './ItemsTableSection';
import { RemarksSection } from './RemarksSection';
import { ActionButtons } from './ActionButtons';
import { SettingsPanel } from '../../../components/packinglist/SettingsPanel';

import { calculatePackingTotals } from '../utils/calculations';
import { useTablePrefsHydrated } from '../state/useTablePrefs';



// 标题样式
const titleClassName = `text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]`;

export const PackingForm: React.FC<PackingFormProps> = ({
  data,
  onDataChange,
  isEditMode = false,
  editId,
  isGenerating = false,
  isSaving = false,
  saveMessage = '',
  saveSuccess = false,
  onSave = () => {},
  onGenerate = () => {},
  onPreview = () => {},
  onExportExcel = () => {}
}) => {
  const pathname = usePathname();
  const { setCols } = useTablePrefsHydrated();
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

  // 处理保存
  const handleSave = () => {
    onSave();
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-1">
        <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link 
            href={
              pathname?.includes('/edit/') ? '/history?tab=packing' : 
              pathname?.includes('/copy/') ? '/history?tab=packing' : 
              '/dashboard'
            } 
            className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          {/* 主卡片容器 */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl sm:rounded-3xl shadow-lg mt-6">
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
                    onClick={onExportExcel}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="导出为Excel"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0 relative"
                    title={editId ? '保存修改' : '保存新记录'}
                  >
                    {isSaving ? (
                      <svg className="animate-spin h-5 w-5 text-gray-600 dark:text-[#98989D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <Save className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                    )}
                    {saveMessage && (
                      <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white rounded-lg whitespace-nowrap ${
                        saveSuccess ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {saveMessage}
                      </div>
                    )}
                  </button>
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

              {/* 操作按钮区域 */}
              <div className="px-4 sm:px-6 py-4 sm:py-6 bg-gray-50 dark:bg-[#1C1C1E] rounded-b-2xl sm:rounded-b-3xl">
                <ActionButtons
                  data={data}
                  isGenerating={isGenerating}
                  isSaving={isSaving}
                  saveMessage={saveMessage}
                  onGenerate={onGenerate}
                  onPreview={onPreview}
                  onExportExcel={onExportExcel}
                />
              </div>
            </form>
          </div>
        </div>
      </main>


    </div>
  );
};
