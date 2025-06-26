'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Settings, Clipboard, History, Save, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Footer } from '@/components/Footer';

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

const tableInputClassName = `w-full px-3 py-2 rounded-xl
  bg-transparent backdrop-blur-sm
  border border-transparent
  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20
  text-[14px] leading-relaxed text-gray-800 dark:text-gray-100
  placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
  transition-all duration-300 ease-out
  hover:bg-[#007AFF]/5 dark:hover:bg-[#0A84FF]/5
  text-center whitespace-pre-wrap`;

const numberInputClassName = `${tableInputClassName}
  [appearance:textfield] 
  [&::-webkit-outer-spin-button]:appearance-none 
  [&::-webkit-inner-spin-button]:appearance-none
  text-center`;

// 标题样式
const titleClassName = `text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]`;

// 按钮基础样式
const buttonClassName = `px-4 py-2 rounded-xl text-sm font-medium 
  transition-all duration-300`;

interface PackingItem {
  id: number;
  markingNo: string;
  serialNo: string;
  description: string;
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
  
  items: PackingItem[];
  currency: string;
  remarks: string;
  showMarkingNo: boolean;
  showDimensions: boolean;
  showWeightAndPackage: boolean;
  showPrice: boolean;
  dimensionUnit: string;
  documentType: 'proforma' | 'packing' | 'both';
}

export default function PackingPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const [packingData, setPackingData] = useState<PackingData>({
    orderNo: '',
    invoiceNo: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    
    consignee: {
      name: ''
    },
    
    items: [{
      id: 1,
      markingNo: '',
      serialNo: '1',
      description: '',
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
    showMarkingNo: true,
    showDimensions: true,
    showWeightAndPackage: true,
    showPrice: true,
    dimensionUnit: 'cm',
    documentType: 'both'
  });

  // 计算总价
  const calculateTotalPrice = useCallback((quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  }, []);

  // 更新行项目
  const updateLineItem = (index: number, field: keyof PackingItem, value: string | number) => {
    setPackingData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      
      // 数值字段需要转换为数字
      if (field === 'quantity' || field === 'unitPrice' || field === 'netWeight' || field === 'grossWeight' || field === 'packageQty') {
        item[field] = typeof value === 'string' ? parseFloat(value) || 0 : value;
        
        // 如果是数量或单价变化，重新计算总价
        if (field === 'quantity' || field === 'unitPrice') {
          item.totalPrice = calculateTotalPrice(
            field === 'quantity' ? item.quantity : newItems[index].quantity,
            field === 'unitPrice' ? item.unitPrice : newItems[index].unitPrice
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
        markingNo: '',
        serialNo: (prev.items.length + 1).toString(),
        description: '',
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

  // 生成PDF
  const handleGenerate = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      // 这里添加生成PDF的逻辑
      console.log('Generating packing list PDF...', packingData);
      
      // 模拟生成过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('箱单生成成功！');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('生成箱单失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  }, [packingData]);

  // 预览
  const handlePreview = useCallback(async () => {
    setIsLoading(true);
    try {
      // 这里添加预览逻辑
      console.log('Previewing packing list...', packingData);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [packingData]);

  // 保存
  const handleSave = useCallback(async () => {
    if (!packingData.consignee.name.trim()) {
      setSaveMessage('Please fill in consignee information');
      setSaveSuccess(false);
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    setIsSaving(true);
    try {
      // 这里添加保存逻辑
      console.log('Saving packing list...', packingData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveSuccess(true);
      setSaveMessage('Saved successfully');
    } catch (error) {
      console.error('Error saving:', error);
      setSaveSuccess(false);
      setSaveMessage('Save failed');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 2000);
    }
  }, [packingData]);

  // 计算总计
  const totals = packingData.items.reduce((acc, item) => ({
    totalPrice: acc.totalPrice + item.totalPrice,
    netWeight: acc.netWeight + item.netWeight,
    grossWeight: acc.grossWeight + item.grossWeight,
    packageQty: acc.packageQty + item.packageQty
  }), { totalPrice: 0, netWeight: 0, grossWeight: 0, packageQty: 0 });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link 
            href="/tools" 
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
                    title="保存"
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
              <div className={`overflow-hidden transition-all duration-300 ease-in-out
                ${showSettings ? 'opacity-100 px-4 sm:px-6 py-6 h-auto' : 'opacity-0 px-0 py-0 h-0'}`}>
                <div className="bg-gray-50 dark:bg-[#1C1C1E] rounded-xl p-4 sm:p-6 space-y-6">
                  
                  {/* 文档类型选择 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Document Type</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setPackingData(prev => ({ ...prev, documentType: 'proforma' }))}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-center ${
                          packingData.documentType === 'proforma' 
                            ? 'bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/25' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        Proforma Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackingData(prev => ({ ...prev, documentType: 'packing' }))}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-center ${
                          packingData.documentType === 'packing' 
                            ? 'bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/25' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        Packing List
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackingData(prev => ({ ...prev, documentType: 'both' }))}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-center ${
                          packingData.documentType === 'both' 
                            ? 'bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/25' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        Proforma Invoice & Packing List
                      </button>
                    </div>
                  </div>

                  {/* 显示选项 */}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4 space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Options</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={packingData.showMarkingNo}
                          onChange={(e) => setPackingData(prev => ({ ...prev, showMarkingNo: e.target.checked }))}
                          className="w-4 h-4 text-[#007AFF] bg-gray-100 border-gray-300 rounded focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Marking No.</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={packingData.showDimensions}
                          onChange={(e) => setPackingData(prev => ({ ...prev, showDimensions: e.target.checked }))}
                          className="w-4 h-4 text-[#007AFF] bg-gray-100 border-gray-300 rounded focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          Dimensions 
                          <span className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => setPackingData(prev => ({ ...prev, dimensionUnit: 'cm' }))}
                              className={`text-xs px-1.5 py-0.5 rounded transition-all duration-200 ${
                                packingData.dimensionUnit === 'cm' 
                                  ? 'bg-[#007AFF] text-white' 
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-500'
                              }`}
                              title="Centimeters"
                            >
                              📏
                            </button>
                            <button
                              type="button"
                              onClick={() => setPackingData(prev => ({ ...prev, dimensionUnit: 'mm' }))}
                              className={`text-xs px-1.5 py-0.5 rounded transition-all duration-200 ${
                                packingData.dimensionUnit === 'mm' 
                                  ? 'bg-[#007AFF] text-white' 
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-500'
                              }`}
                              title="Millimeters"
                            >
                              📐
                            </button>
                          </span>
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={packingData.showWeightAndPackage}
                          onChange={(e) => setPackingData(prev => ({ ...prev, showWeightAndPackage: e.target.checked }))}
                          className="w-4 h-4 text-[#007AFF] bg-gray-100 border-gray-300 rounded focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Weight & Package</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={packingData.showPrice}
                          onChange={(e) => setPackingData(prev => ({ ...prev, showPrice: e.target.checked }))}
                          className="w-4 h-4 text-[#007AFF] bg-gray-100 border-gray-300 rounded focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          Price 
                          <span className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => setPackingData(prev => ({ ...prev, currency: 'USD' }))}
                              className={`text-xs px-1.5 py-0.5 rounded transition-all duration-200 ${
                                packingData.currency === 'USD' 
                                  ? 'bg-[#007AFF] text-white' 
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-500'
                              }`}
                              title="US Dollar"
                            >
                              $
                            </button>
                            <button
                              type="button"
                              onClick={() => setPackingData(prev => ({ ...prev, currency: 'EUR' }))}
                              className={`text-xs px-1.5 py-0.5 rounded transition-all duration-200 ${
                                packingData.currency === 'EUR' 
                                  ? 'bg-[#007AFF] text-white' 
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-500'
                              }`}
                              title="Euro"
                            >
                              €
                            </button>
                            <button
                              type="button"
                              onClick={() => setPackingData(prev => ({ ...prev, currency: 'CNY' }))}
                              className={`text-xs px-1.5 py-0.5 rounded transition-all duration-200 ${
                                packingData.currency === 'CNY' 
                                  ? 'bg-[#007AFF] text-white' 
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-500'
                              }`}
                              title="Chinese Yuan"
                            >
                              ¥
                            </button>
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 基本信息区域 */}
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <div className="space-y-6">
                  {/* 订单信息行 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D]">
                        Order No. *
                      </label>
                      <input
                        type="text"
                        value={packingData.orderNo}
                        onChange={(e) => setPackingData(prev => ({ ...prev, orderNo: e.target.value }))}
                        className={inputClassName}
                        placeholder="Enter order number"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D]">
                        Invoice No.
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
                        Date *
                      </label>
                      <input
                        type="date"
                        value={packingData.date}
                        onChange={(e) => setPackingData(prev => ({ ...prev, date: e.target.value }))}
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  {/* 收货人信息区域 */}
                  <div className="bg-gray-50 dark:bg-[#1C1C1E] rounded-xl p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7]">Consignee</h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-600 to-transparent"></div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D]">
                        Ship To *
                      </label>
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
                  </div>
                </div>
              </div>

              {/* 商品表格区域 */}
              <div className="px-0 sm:px-6 py-4">
                <div className="space-y-4">
                  <div className="px-4 sm:px-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7]">Items</h3>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <div className="min-w-full bg-white dark:bg-[#2C2C2E] rounded-xl border border-gray-200 dark:border-[#3A3A3C] overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-[#3A3A3C]">
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider w-12">No.</th>
                            {packingData.showMarkingNo && (
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Marking No.</th>
                            )}
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Qty</th>
                            {packingData.showPrice && (
                              <>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Unit Price</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Amount</th>
                              </>
                            )}
                            {packingData.showWeightAndPackage && (
                              <>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Net Weight (kg)</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Gross Weight (kg)</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Package Qty</th>
                              </>
                            )}
                            {packingData.showDimensions && (
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Dimensions ({packingData.dimensionUnit})</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-[#3A3A3C]">
                          {packingData.items.map((item, index) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#1C1C1E]/50 transition-colors duration-200">
                              <td className="px-4 py-3 w-12 text-center">
                                <span 
                                  className={`flex items-center justify-center w-6 h-6 rounded-full 
                                    text-xs transition-all duration-200 ${
                                    packingData.items.length > 1 
                                      ? 'text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer'
                                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                  }`}
                                  onClick={() => packingData.items.length > 1 && handleDeleteLine(index)}
                                  title={packingData.items.length > 1 ? "Click to delete" : "Cannot delete the last item"}
                                >
                                  {index + 1}
                                </span>
                              </td>
                              {packingData.showMarkingNo && (
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={item.markingNo}
                                    onChange={(e) => updateLineItem(index, 'markingNo', e.target.value)}
                                    className={`${tableInputClassName} text-left`}
                                    placeholder="Marking"
                                  />
                                </td>
                              )}
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                  className={`${tableInputClassName} text-left`}
                                  placeholder="Description"
                                />
                              </td>
                              <td className="px-4 py-3 w-24">
                                <input
                                  type="number"
                                  value={item.quantity || ''}
                                  onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                                  className={numberInputClassName}
                                  placeholder="0"
                                  min="0"
                                  step="1"
                                />
                              </td>
                              {packingData.showPrice && (
                                <>
                                  <td className="px-4 py-3 w-28">
                                    <input
                                      type="number"
                                      value={item.unitPrice || ''}
                                      onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                                      className={numberInputClassName}
                                      placeholder="0.00"
                                      min="0"
                                      step="0.01"
                                    />
                                  </td>
                                  <td className="px-4 py-3 w-28">
                                    <div className="text-center py-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                                      {packingData.currency === 'USD' ? '$' : packingData.currency === 'EUR' ? '€' : '¥'}
                                      {item.totalPrice.toFixed(2)}
                                    </div>
                                  </td>
                                </>
                              )}
                              {packingData.showWeightAndPackage && (
                                <>
                                  <td className="px-4 py-3 w-24">
                                    <input
                                      type="number"
                                      value={item.netWeight || ''}
                                      onChange={(e) => updateLineItem(index, 'netWeight', e.target.value)}
                                      className={numberInputClassName}
                                      placeholder="0.00"
                                      min="0"
                                      step="0.01"
                                    />
                                  </td>
                                  <td className="px-4 py-3 w-24">
                                    <input
                                      type="number"
                                      value={item.grossWeight || ''}
                                      onChange={(e) => updateLineItem(index, 'grossWeight', e.target.value)}
                                      className={numberInputClassName}
                                      placeholder="0.00"
                                      min="0"
                                      step="0.01"
                                    />
                                  </td>
                                  <td className="px-4 py-3 w-24">
                                    <input
                                      type="number"
                                      value={item.packageQty || ''}
                                      onChange={(e) => updateLineItem(index, 'packageQty', e.target.value)}
                                      className={numberInputClassName}
                                      placeholder="0"
                                      min="0"
                                      step="1"
                                    />
                                  </td>
                                </>
                              )}
                              {packingData.showDimensions && (
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={item.dimensions}
                                    onChange={(e) => updateLineItem(index, 'dimensions', e.target.value)}
                                    className={`${tableInputClassName} text-left`}
                                    placeholder="L×W×H"
                                  />
                                </td>
                              )}

                            </tr>
                          ))}
                          
                          {/* 总计行 */}
                          <tr className="bg-gray-50 dark:bg-[#1C1C1E] font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={handleAddLine}
                                className="flex items-center justify-center w-6 h-6 rounded-full
                                  bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                                  hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                                  text-[#007AFF] dark:text-[#0A84FF]
                                  text-sm font-medium
                                  transition-all duration-200"
                                title="Add new line"
                              >
                                +
                              </button>
                            </td>
                            <td colSpan={
                              (packingData.showMarkingNo ? 1 : 0) + 
                              2 + // 描述、数量
                              (packingData.showPrice ? 1 : 0) // 单价列
                            } className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                              Total:
                            </td>
                            {packingData.showPrice && (
                              <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                                {packingData.currency === 'USD' ? '$' : packingData.currency === 'EUR' ? '€' : '¥'}
                                {totals.totalPrice.toFixed(2)}
                              </td>
                            )}
                            {packingData.showWeightAndPackage && (
                              <>
                                <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                                  {totals.netWeight.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                                  {totals.grossWeight.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                                  {totals.packageQty}
                                </td>
                              </>
                            )}
                            {packingData.showDimensions && (
                              <td className="px-4 py-3"></td>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* 备注区域 */}
              <div className="px-4 sm:px-6 py-4 sm:py-6 border-t border-gray-100 dark:border-[#3A3A3C]">
                <div className="bg-gray-50 dark:bg-[#1C1C1E] rounded-xl p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7]">Remarks</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-600 to-transparent"></div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D]">
                      Additional Notes
                    </label>
                    <textarea
                      value={packingData.remarks}
                      onChange={(e) => setPackingData(prev => ({ ...prev, remarks: e.target.value }))}
                      className={`${inputClassName} min-h-[100px] resize-none`}
                      placeholder="Enter any additional remarks or special instructions..."
                    />
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
    </div>
  );
}
