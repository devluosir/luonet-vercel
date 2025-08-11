'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Settings, History, Save, Eye, FileSpreadsheet } from 'lucide-react';
import { PackingFormProps } from '../types';
import { BasicInfoSection } from './BasicInfoSection';
import { ItemsTableSection } from './ItemsTableSection';
import { RemarksSection } from './RemarksSection';
import { ActionButtons } from './ActionButtons';
import { SettingsPanel } from '@/components/packinglist/SettingsPanel';
import { ShippingMarksModal } from '@/components/packinglist/ShippingMarksModal';
import { calculatePackingTotals } from '../utils/calculations';

// 基础样式定义
const inputClassName = `w-full px-4 py-2.5 rounded-2xl
  bg-white/95 dark:bg-[#1c1c1e]/95
  border border-[#007AFF]/10 dark:border-[#0A84FF]/10
  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
  placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
  text-[15px] leading-relaxed text-gray-800 dark:text-gray-100
  transition-all duration-300 ease-out
  hover:border-[#007AFF]/20 dark:hover:border-[#0A84FF]/20
  shadow-sm hover:shadow-md`;

// 日期输入框专用样式
const dateInputClassName = `w-full min-w-0 px-4 py-2.5 rounded-2xl
  bg-white/95 dark:bg-[#1c1c1e]/95
  border border-[#007AFF]/10 dark:border-[#0A84FF]/10
  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
  placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
  text-[15px] leading-relaxed text-gray-800 dark:text-gray-100
  transition-all duration-300 ease-out
  hover:border-[#007AFF]/20 dark:hover:border-[#0A84FF]/20
  shadow-sm hover:shadow-md`;

// iOS光标优化样式
const iosCaretStyle = {
  caretColor: '#007AFF',
  WebkitCaretColor: '#007AFF',
  WebkitTextFillColor: 'initial',
  WebkitOpacity: 1,
  opacity: 1
} as React.CSSProperties;

// 标题样式
const titleClassName = `text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]`;

export const PackingForm: React.FC<PackingFormProps> = ({
  data,
  onDataChange,
  isEditMode = false,
  editId
}) => {
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  const [showShippingMarks, setShowShippingMarks] = useState(false);
  const [editingUnitPriceIndex, setEditingUnitPriceIndex] = useState<number | null>(null);
  const [editingUnitPrice, setEditingUnitPrice] = useState<string>('');
  const [editingFeeIndex, setEditingFeeIndex] = useState<number | null>(null);
  const [editingFeeAmount, setEditingFeeAmount] = useState<string>('');

  // 计算总计
  const totals = calculatePackingTotals(data);

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
        break;
      case 'packing':
        updates.showPrice = false;
        updates.showWeightAndPackage = true;
        break;
      case 'both':
        updates.showPrice = true;
        updates.showWeightAndPackage = true;
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
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="导出为Excel"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0 relative"
                    title={editId ? '保存修改' : '保存新记录'}
                  >
                    <Save className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
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
                showHsCode={data.showHsCode}
                showDimensions={data.showDimensions}
                showWeightAndPackage={data.showWeightAndPackage}
                showPrice={data.showPrice}
                dimensionUnit={data.dimensionUnit}
                currency={data.currency}
                headerType={data.templateConfig.headerType}
                customUnits={data.customUnits}
                onDocumentTypeChange={handleDocumentTypeChange}
                onToggleHsCode={(show) => handleDataChange({ showHsCode: show })}
                onToggleDimensions={(show) => handleDataChange({ showDimensions: show })}
                onToggleWeightAndPackage={(show) => handleDataChange({ showWeightAndPackage: show })}
                onTogglePrice={(show) => handleDataChange({ 
                  showPrice: show,
                  otherFees: show ? data.otherFees : []
                })}
                onDimensionUnitChange={(unit) => handleDataChange({ dimensionUnit: unit })}
                onCurrencyChange={(currency) => handleDataChange({ currency })}
                onHeaderTypeChange={(headerType) => handleDataChange({ 
                  templateConfig: { ...data.templateConfig, headerType } 
                })}
                onCustomUnitsChange={(units) => handleDataChange({ customUnits: units })}
              />

              {/* 基本信息区域 */}
              <BasicInfoSection
                data={data}
                onDataChange={handleDataChange}
                onShowShippingMarks={() => setShowShippingMarks(true)}
                inputClassName={inputClassName}
                dateInputClassName={dateInputClassName}
                iosCaretStyle={iosCaretStyle}
              />

              {/* 商品表格区域 */}
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

              {/* 备注区域 */}
              <RemarksSection
                data={data}
                onDataChange={handleDataChange}
                inputClassName={inputClassName}
                iosCaretStyle={iosCaretStyle}
              />

              {/* 操作按钮区域 */}
              <ActionButtons
                data={data}
                isGenerating={false}
                isSaving={false}
                saveMessage=""
                onGenerate={() => {}}
                onPreview={() => {}}
                onSave={() => {}}
                onExportExcel={() => {}}
              />
            </form>
          </div>
        </div>
      </main>

      {/* Shipping Marks Modal */}
      <ShippingMarksModal
        isOpen={showShippingMarks}
        onClose={() => setShowShippingMarks(false)}
        value={data.markingNo}
        onChange={(value) => handleDataChange({ markingNo: value })}
      />
    </div>
  );
};
