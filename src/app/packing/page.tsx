'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Settings, Clipboard, History, Save, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Footer } from '@/components/Footer';
import { generatePackingListPDF } from '@/utils/packingPdfGenerator';
import { ItemsTable } from '@/components/packinglist/ItemsTable';
import { SettingsPanel } from '@/components/packinglist/SettingsPanel';
import { ShippingMarksModal } from '@/components/packinglist/ShippingMarksModal';
import { savePackingHistory, getPackingHistoryById } from '@/utils/packingHistory';

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



// 标题样式
const titleClassName = `text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]`;

// 按钮基础样式
const buttonClassName = `px-4 py-2 rounded-xl text-sm font-medium 
  transition-all duration-300`;

interface PackingItem {
  id: number;
  serialNo: string;
  description: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  netWeight: number;
  grossWeight: number;
  packageQty: number;
  dimensions: string;
  unit: string;
}

interface PackingData {
  orderNo: string;
  invoiceNo: string;
  date: string;
  
  // 收货人信息
  consignee: {
    name: string;
  };
  
  // 唛头信息
  markingNo: string;
  
  items: PackingItem[];
  currency: string;
  remarks: string;
  remarkOptions: {
    shipsSpares: boolean;
    customsPurpose: boolean;
  };
  showHsCode: boolean;
  showDimensions: boolean;
  showWeightAndPackage: boolean;
  showPrice: boolean;
  dimensionUnit: string;
  documentType: 'proforma' | 'packing' | 'both';
  templateConfig: {
    headerType: 'none' | 'bilingual' | 'english';
  };
  customUnits?: string[];
}

interface CustomWindow extends Window {
  __PACKING_DATA__?: PackingData;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
}

export default function PackingPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  // 从 window 全局变量获取初始数据
  const _initialData = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__PACKING_DATA__) : null;
  const initialEditId = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__EDIT_ID__) : null;
  
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [showShippingMarksModal, setShowShippingMarksModal] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(initialEditId || undefined);

  const [packingData, setPackingData] = useState<PackingData>(_initialData || {
    orderNo: '',
    invoiceNo: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    
    consignee: {
      name: ''
    },
    
    markingNo: '',
    
    items: [{
      id: 1,
      serialNo: '1',
      description: '',
      hsCode: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      netWeight: 0,
      grossWeight: 0,
      packageQty: 0,
      dimensions: '',
      unit: 'pc'
    }],
    
    currency: 'USD',
    remarks: '',
    remarkOptions: {
      shipsSpares: true,
      customsPurpose: true,
    },
    showHsCode: false,
    showDimensions: false,
    showWeightAndPackage: true,
    showPrice: false,
    dimensionUnit: 'cm',
    documentType: 'packing',
    templateConfig: {
      headerType: 'bilingual'
    },
    customUnits: []
  });

  // 清除注入的数据
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 获取并保存编辑模式状态
      const customWindow = window as unknown as CustomWindow;
      const editId = customWindow.__EDIT_ID__;
      
      if (editId !== undefined) {
        setEditId(editId);
      }

      // 清除注入的数据
      delete customWindow.__PACKING_DATA__;
      delete customWindow.__EDIT_MODE__;
      delete customWindow.__EDIT_ID__;
    }
  }, []);

  // 从 URL 获取编辑 ID
  useEffect(() => {
    if (pathname?.startsWith('/packing/edit/')) {
      const id = pathname.split('/').pop();
      setEditId(id);
    }
  }, [pathname]);

  // 计算总价
  const calculateTotalPrice = useCallback((quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  }, []);

  // 默认单位列表（需要单复数变化的单位）
  const defaultUnits = ['pc', 'set', 'length'] as const;

  // 处理单位的单复数
  const getUnitDisplay = (baseUnit: string, quantity: number) => {
    if (defaultUnits.includes(baseUnit as typeof defaultUnits[number])) {
      return quantity > 1 ? `${baseUnit}s` : baseUnit;
    }
    return baseUnit; // 自定义单位不变化单复数
  };

  // 更新行项目
  const updateLineItem = (index: number, field: keyof PackingItem, value: string | number) => {
    setPackingData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      
      if (field === 'unit') {
        // 处理单位变更，根据当前数量决定是否需要复数形式
        const baseUnit = value.toString().replace(/s$/, '');
        const quantity = newItems[index].quantity;
        item.unit = defaultUnits.includes(baseUnit as typeof defaultUnits[number]) 
          ? getUnitDisplay(baseUnit, quantity) 
          : value.toString();
      } else if (field === 'quantity') {
        // 更新数量时，同时更新单位的单复数
        const quantity = Number(value);
        const baseUnit = newItems[index].unit.replace(/s$/, '');
        item.quantity = quantity;
        item.unit = defaultUnits.includes(baseUnit as typeof defaultUnits[number]) 
          ? getUnitDisplay(baseUnit, quantity) 
          : newItems[index].unit;
        
        // 如果是数量变化，重新计算总价
        item.totalPrice = calculateTotalPrice(quantity, newItems[index].unitPrice);
      } else if (field === 'unitPrice' || field === 'netWeight' || field === 'grossWeight' || field === 'packageQty') {
        // 其他数值字段需要转换为数字
        item[field] = typeof value === 'string' ? parseFloat(value) || 0 : value;
        
        // 如果是单价变化，重新计算总价
        if (field === 'unitPrice') {
          item.totalPrice = calculateTotalPrice(
            newItems[index].quantity,
            item.unitPrice
          );
        }
      } else {
        // 字符串字段直接赋值
        (item as any)[field] = value;
      }
      
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  // 添加新行
  const handleAddLine = () => {
    setPackingData(prev => ({
      ...prev,
      items: [...prev.items, {
        id: prev.items.length + 1,
        serialNo: (prev.items.length + 1).toString(),
        description: '',
        hsCode: '',
        quantity: 0,
        unitPrice: 0,
        totalPrice: 0,
        netWeight: 0,
        grossWeight: 0,
        packageQty: 0,
        dimensions: '',
        unit: 'pc'
      }]
    }));
  };

  // 删除行
  const handleDeleteLine = (index: number) => {
    if (packingData.items.length > 1) {
      setPackingData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  // 设置面板回调函数
  const handleDocumentTypeChange = (type: 'proforma' | 'packing' | 'both') => {
    setPackingData(prev => {
      const updates: Partial<PackingData> = { documentType: type };
      
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
      
      return { ...prev, ...updates };
    });
  };

  // 生成PDF
  const handleGenerate = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      // 验证必填字段
      if (!packingData.invoiceNo.trim()) {
        alert('Please fill in Invoice No.');
        return;
      }

      // 获取编辑 ID（从 URL 或 state）
      const existingId = editId || (pathname?.startsWith('/packing/edit/') ? pathname.split('/').pop() : undefined);
      
      // 保存记录
      const saveResult = await savePackingHistory(packingData, existingId);
      if (saveResult && !editId) {
        setEditId(saveResult.id);
      }

      // 生成PDF
      await generatePackingListPDF(packingData);
      alert('Packing list generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate packing list. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [packingData, editId, pathname]);

  // 预览
  const handlePreview = useCallback(async () => {
    setIsLoading(true);
    try {
      // 验证必填字段
      if (!packingData.invoiceNo.trim()) {
        alert('Please fill in Invoice No.');
        return;
      }

      // 生成预览URL
      const pdfUrl = await generatePackingListPDF(packingData, true);
      if (pdfUrl) {
        setPreviewUrl(pdfUrl);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Failed to generate preview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [packingData]);

  // 保存
  const handleSave = useCallback(async () => {
    if (!packingData.invoiceNo.trim()) {
      setSaveMessage('Please fill in Invoice No.');
      setSaveSuccess(false);
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    setIsSaving(true);
    try {
      // 使用 URL 中的 ID 或现有的 editId
      const id = pathname?.startsWith('/packing/edit/') ? pathname.split('/').pop() : editId;
      
      const result = await savePackingHistory(packingData, id);
      if (result) {
        setSaveSuccess(true);
        setSaveMessage('Saved successfully');
        // 更新 editId，确保后续的保存操作会更新同一条记录
        if (!editId) {
          setEditId(result.id);
        }
      } else {
        setSaveSuccess(false);
        setSaveMessage('Save failed');
      }
    } catch (error) {
      console.error('Error saving:', error);
      setSaveSuccess(false);
      setSaveMessage('Save failed');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 2000);
    }
  }, [packingData, editId, pathname]);

  // 计算总计
  const totals = packingData.items.reduce((acc, item) => ({
    totalPrice: acc.totalPrice + item.totalPrice,
    netWeight: acc.netWeight + item.netWeight,
    grossWeight: acc.grossWeight + item.grossWeight,
    packageQty: acc.packageQty + item.packageQty
  }), { totalPrice: 0, netWeight: 0, grossWeight: 0, packageQty: 0 });

  // 清理预览URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link 
            href={pathname?.includes('/edit/') || pathname?.includes('/copy/') ? '/history' : '/tools'} 
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
                      packingData.documentType === 'proforma' ? 'Proforma Invoice' :
                      packingData.documentType === 'packing' ? 'Packing List' :
                      'Proforma Invoice & Packing List'
                    }
                  </h1>
                  <button
                    type="button"
                    onClick={() => {/* TODO: 添加剪贴板功能 */}}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/history"
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="历史记录"
                  >
                    <History className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </Link>
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
                documentType={packingData.documentType}
                showHsCode={packingData.showHsCode}
                showDimensions={packingData.showDimensions}
                showWeightAndPackage={packingData.showWeightAndPackage}
                showPrice={packingData.showPrice}
                dimensionUnit={packingData.dimensionUnit}
                currency={packingData.currency}
                headerType={packingData.templateConfig.headerType}
                onDocumentTypeChange={handleDocumentTypeChange}
                onToggleHsCode={(show) => setPackingData(prev => ({ ...prev, showHsCode: show }))}
                onToggleDimensions={(show) => setPackingData(prev => ({ ...prev, showDimensions: show }))}
                onToggleWeightAndPackage={(show) => setPackingData(prev => ({ ...prev, showWeightAndPackage: show }))}
                onTogglePrice={(show) => setPackingData(prev => ({ ...prev, showPrice: show }))}
                onDimensionUnitChange={(unit) => setPackingData(prev => ({ ...prev, dimensionUnit: unit }))}
                onCurrencyChange={(currency) => setPackingData(prev => ({ ...prev, currency }))}
                onHeaderTypeChange={(headerType) => setPackingData(prev => ({ 
                  ...prev, 
                  templateConfig: { ...prev.templateConfig, headerType } 
                }))}
              />

              {/* 基本信息区域 */}
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <div className="space-y-6">
                  {/* Consignee和订单信息并排布局 */}
                  <div className="bg-gray-50 dark:bg-[#1C1C1E] rounded-xl p-4 sm:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* 左侧：Consignee + Order No. */}
                      <div className="space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7]">Consignee</h3>
                            <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-600 to-transparent"></div>
                          </div>
                          <textarea
                            value={packingData.consignee.name}
                            onChange={(e) => setPackingData(prev => ({ 
                              ...prev, 
                              consignee: { ...prev.consignee, name: e.target.value }
                            }))}
                            className={`${inputClassName} min-h-[120px] resize-none`}
                            placeholder="Enter consignee information including company name, address, contact details..."
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D]">
                            Order No.
                          </label>
                          <input
                            type="text"
                            value={packingData.orderNo}
                            onChange={(e) => setPackingData(prev => ({ ...prev, orderNo: e.target.value }))}
                            className={inputClassName}
                            placeholder="Enter order number"
                          />
                        </div>
                      </div>

                      {/* 右侧：Invoice No. + Date + Shipping Marks */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D]">
                            Invoice No. *
                          </label>
                          <input
                            type="text"
                            value={packingData.invoiceNo}
                            onChange={(e) => setPackingData(prev => ({ ...prev, invoiceNo: e.target.value }))}
                            className={inputClassName}
                            placeholder="Enter invoice number"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D]">
                            Date
                          </label>
                          <input
                            type="date"
                            value={packingData.date}
                            onChange={(e) => setPackingData(prev => ({ ...prev, date: e.target.value }))}
                            className={inputClassName}
                          />
                        </div>
                        
                        {/* Shipping Marks */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D]">
                              Shipping Marks
                            </label>
                            {packingData.markingNo && (
                              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                Configured
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowShippingMarksModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#3A3A3C] hover:bg-gray-200 dark:hover:bg-[#48484A] hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-all duration-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            {packingData.markingNo ? 'Edit Marks' : 'Add Marks'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 商品表格区域 */}
              <div className="px-0 sm:px-6 py-4">
                <ItemsTable
                  data={{
                    items: packingData.items,
                    showHsCode: packingData.showHsCode,
                    showDimensions: packingData.showDimensions,
                    showWeightAndPackage: packingData.showWeightAndPackage,
                    showPrice: packingData.showPrice,
                    dimensionUnit: packingData.dimensionUnit,
                    currency: packingData.currency
                  }}
                  onItemChange={updateLineItem}
                  onAddLine={handleAddLine}
                  onDeleteLine={handleDeleteLine}
                  totals={totals}
                />
              </div>

              {/* 备注区域 */}
              <div className="px-4 sm:px-6 py-4 sm:py-6 border-t border-gray-100 dark:border-[#3A3A3C]">
                <div className="bg-gray-50 dark:bg-[#1C1C1E] rounded-xl p-4 sm:p-6 space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Remarks:</h3>
                    
                    {/* 固定选项 */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={packingData.remarkOptions.shipsSpares}
                          onChange={(e) => setPackingData(prev => ({
                            ...prev,
                            remarkOptions: {
                              ...prev.remarkOptions,
                              shipsSpares: e.target.checked
                            }
                          }))}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#007AFF] dark:text-[#0A84FF] focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                          SHIP'S SPARES IN TRANSIT
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={packingData.remarkOptions.customsPurpose}
                          onChange={(e) => setPackingData(prev => ({
                            ...prev,
                            remarkOptions: {
                              ...prev.remarkOptions,
                              customsPurpose: e.target.checked
                            }
                          }))}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#007AFF] dark:text-[#0A84FF] focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                          FOR CUSTOMS PURPOSE ONLY
                        </span>
                      </label>
                    </div>
                    
                    {/* 自定义备注文本框 */}
                    <div>
                      <textarea
                        value={packingData.remarks}
                        onChange={(e) => setPackingData(prev => ({ ...prev, remarks: e.target.value }))}
                        className={`${inputClassName} min-h-[80px] resize-none`}
                        placeholder="Enter any additional remarks or special instructions..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 生成按钮和预览按钮 */}
              <div className="px-4 sm:px-6 py-4 sm:py-6 border-t border-gray-100 dark:border-[#3A3A3C] bg-gray-50 dark:bg-[#1C1C1E] rounded-b-2xl sm:rounded-b-3xl">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className={`${buttonClassName}
                      bg-[#007AFF] hover:bg-[#0063CC] dark:bg-[#0A84FF] dark:hover:bg-[#0070E0]
                      text-white font-medium
                      shadow-lg shadow-[#007AFF]/25 dark:shadow-[#0A84FF]/25
                      hover:shadow-xl hover:shadow-[#007AFF]/30 dark:hover:shadow-[#0A84FF]/30
                      active:scale-[0.98] active:shadow-inner active:bg-[#0052CC] dark:active:bg-[#0063CC]
                      transform transition-all duration-200 ease-out
                      flex-1 sm:flex-none sm:min-w-[180px] h-12
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${isGenerating ? 'scale-[0.98] shadow-inner bg-[#0052CC] dark:bg-[#0063CC]' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-2.5">
                      {isGenerating ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Generating...</span>
                        </>
                                              ) : (pathname?.startsWith('/packing/edit/') || editId) ? (
                          <>
                            <Download className="w-5 h-5" />
                            <span>Save Changes & Generate</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-5 h-5" />
                            <span>Generate PDF</span>
                          </>
                        )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={isLoading}
                    className={`${buttonClassName}
                      bg-white dark:bg-[#2C2C2E]
                      text-[#007AFF] dark:text-[#0A84FF] font-medium
                      border-2 border-[#007AFF]/20 dark:border-[#0A84FF]/20
                      hover:bg-[#007AFF]/[0.05] dark:hover:bg-[#0A84FF]/[0.05]
                      hover:border-[#007AFF]/40 dark:hover:border-[#0A84FF]/40
                      active:bg-[#007AFF]/[0.08] dark:active:bg-[#0A84FF]/[0.08]
                      active:scale-[0.98] active:shadow-inner
                      transform transition-all duration-200 ease-out
                      flex-1 sm:flex-none sm:min-w-[140px] h-12
                      disabled:opacity-50 disabled:cursor-not-allowed
                      shadow-sm hover:shadow-md
                      ${isLoading ? 'scale-[0.98] shadow-inner bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-2.5">
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Previewing...</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-5 h-5" />
                          <span>Preview</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* PDF 预览模态框 */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex flex-col p-4 border-b border-gray-200 dark:border-gray-800">
              {/* 标题和关闭按钮 */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preview Packing List</h3>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewUrl('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* 箱单信息 */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Document Type:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {packingData.documentType === 'proforma' ? 'Proforma Invoice' :
                     packingData.documentType === 'packing' ? 'Packing List' :
                     'Proforma Invoice & Packing List'}
                  </span>
                </div>
                {packingData.orderNo && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Order No:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{packingData.orderNo}</span>
                  </div>
                )}
                {packingData.invoiceNo && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Invoice No:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{packingData.invoiceNo}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Date:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{packingData.date}</span>
                </div>
                {packingData.showPrice && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">Currency:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {packingData.currency === 'USD' ? 'US Dollar' : packingData.currency === 'EUR' ? 'Euro' : 'Chinese Yuan'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">Total Amount:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {packingData.currency === 'USD' ? '$' : packingData.currency === 'EUR' ? '€' : '¥'}{totals.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-black p-4">
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg bg-white dark:bg-[#1C1C1E] shadow-lg"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Shipping Marks Modal */}
      <ShippingMarksModal
        isOpen={showShippingMarksModal}
        onClose={() => setShowShippingMarksModal(false)}
        value={packingData.markingNo}
        onChange={(value) => setPackingData(prev => ({ ...prev, markingNo: value }))}
      />
    </div>
  );
}
