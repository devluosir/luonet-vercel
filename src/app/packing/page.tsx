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
  showWeight: boolean;
  showPackageQty: boolean;
  showPrice: boolean;
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
    showWeight: true,
    showPackageQty: true,
    showPrice: true
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
      setSaveMessage('请填写收货人信息');
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
      setSaveMessage('保存成功');
    } catch (error) {
      console.error('Error saving:', error);
      setSaveSuccess(false);
      setSaveMessage('保存失败');
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
            className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Link>

          {/* 主卡片容器 */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl sm:rounded-3xl shadow-lg mt-6">
            <form>
              {/* 标题和设置按钮 */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-[#3A3A3C]">
                <div className="flex items-center gap-4">
                  <h1 className={titleClassName}>
                    箱单发票
                  </h1>
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
                    title="设置"
                  >
                    <Settings className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                </div>
              </div>

              {/* 设置面板 */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out
                ${showSettings ? 'opacity-100 px-4 sm:px-6 py-6 h-auto' : 'opacity-0 px-0 py-0 h-0'}`}>
                <div className="bg-gray-50 dark:bg-[#1C1C1E] rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">显示选项</h3>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={packingData.showMarkingNo}
                        onChange={(e) => setPackingData(prev => ({ ...prev, showMarkingNo: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">显示唛头</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={packingData.showDimensions}
                        onChange={(e) => setPackingData(prev => ({ ...prev, showDimensions: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">显示尺寸</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={packingData.showWeight}
                        onChange={(e) => setPackingData(prev => ({ ...prev, showWeight: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">显示重量</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={packingData.showPackageQty}
                        onChange={(e) => setPackingData(prev => ({ ...prev, showPackageQty: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">显示包裹数量</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={packingData.showPrice}
                        onChange={(e) => setPackingData(prev => ({ ...prev, showPrice: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">显示价格</span>
                    </label>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">货币选择</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPackingData(prev => ({ ...prev, currency: 'USD' }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          packingData.currency === 'USD' 
                            ? 'bg-[#007AFF] text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        $ USD
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackingData(prev => ({ ...prev, currency: 'EUR' }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          packingData.currency === 'EUR' 
                            ? 'bg-[#007AFF] text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        € EUR
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackingData(prev => ({ ...prev, currency: 'CNY' }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          packingData.currency === 'CNY' 
                            ? 'bg-[#007AFF] text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        ¥ CNY
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 基本信息区域 */}
              <div className="px-4 sm:px-6 py-4 space-y-6">
                {/* Order No和Invoice No */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D] mb-2">
                      Order No. *
                    </label>
                    <input
                      type="text"
                      value={packingData.orderNo}
                      onChange={(e) => setPackingData(prev => ({ ...prev, orderNo: e.target.value }))}
                      className={inputClassName}
                      placeholder="Please enter order number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D] mb-2">
                      Invoice No.
                    </label>
                    <input
                      type="text"
                      value={packingData.invoiceNo}
                      onChange={(e) => setPackingData(prev => ({ ...prev, invoiceNo: e.target.value }))}
                      className={inputClassName}
                      placeholder="Please enter invoice number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D] mb-2">
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

                {/* 收货人信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-[#F5F5F7]">To:</h3>
                  <div>
                    <textarea
                      value={packingData.consignee.name}
                      onChange={(e) => setPackingData(prev => ({ 
                        ...prev, 
                        consignee: { ...prev.consignee, name: e.target.value }
                      }))}
                      className={`${inputClassName} min-h-[120px] resize-none`}
                      placeholder="请输入收货人信息，包括公司名称、地址、联系方式等..."
                    />
                  </div>
                </div>
              </div>

              {/* 商品表格区域 */}
              <div className="px-4 sm:px-6 py-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#1C1C1E]">
                        {packingData.showMarkingNo && (
                          <th className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-[#98989D]">唛头</th>
                        )}
                        <th className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-[#98989D]">序号</th>
                        <th className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-[#98989D]">描述</th>
                        <th className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-[#98989D]">数量</th>
                        {packingData.showPrice && (
                          <>
                            <th className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-[#98989D]">单价</th>
                            <th className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-[#98989D]">总价</th>
                          </>
                        )}
                        {packingData.showWeight && (
                          <>
                            <th className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-[#98989D]">净重(kg)</th>
                            <th className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-[#98989D]">毛重(kg)</th>
                          </>
                        )}
                        {packingData.showPackageQty && (
                          <th className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-[#98989D]">包裹数量</th>
                        )}
                        {packingData.showDimensions && (
                          <th className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-[#98989D]">尺寸(cm)</th>
                        )}
                        <th className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-center text-sm font-medium text-gray-600 dark:text-[#98989D] w-16">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packingData.items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#1C1C1E]/50">
                          {packingData.showMarkingNo && (
                            <td className="border border-gray-200 dark:border-[#3A3A3C] p-1">
                              <input
                                type="text"
                                value={item.markingNo}
                                onChange={(e) => updateLineItem(index, 'markingNo', e.target.value)}
                                className={tableInputClassName}
                                placeholder="唛头"
                              />
                            </td>
                          )}
                          <td className="border border-gray-200 dark:border-[#3A3A3C] p-1 w-20">
                            <input
                              type="text"
                              value={item.serialNo}
                              onChange={(e) => updateLineItem(index, 'serialNo', e.target.value)}
                              className={tableInputClassName}
                              placeholder="序号"
                            />
                          </td>
                          <td className="border border-gray-200 dark:border-[#3A3A3C] p-1">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                              className={`${tableInputClassName} text-left`}
                              placeholder="商品描述"
                            />
                          </td>
                          <td className="border border-gray-200 dark:border-[#3A3A3C] p-1 w-24">
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
                              <td className="border border-gray-200 dark:border-[#3A3A3C] p-1 w-28">
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
                              <td className="border border-gray-200 dark:border-[#3A3A3C] p-1 w-28">
                                <div className="text-center py-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                                  {packingData.currency === 'USD' ? '$' : packingData.currency === 'EUR' ? '€' : '¥'}
                                  {item.totalPrice.toFixed(2)}
                                </div>
                              </td>
                            </>
                          )}
                          {packingData.showWeight && (
                            <>
                              <td className="border border-gray-200 dark:border-[#3A3A3C] p-1 w-24">
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
                              <td className="border border-gray-200 dark:border-[#3A3A3C] p-1 w-24">
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
                            </>
                          )}
                          {packingData.showPackageQty && (
                            <td className="border border-gray-200 dark:border-[#3A3A3C] p-1 w-24">
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
                          )}
                          {packingData.showDimensions && (
                            <td className="border border-gray-200 dark:border-[#3A3A3C] p-1">
                              <input
                                type="text"
                                value={item.dimensions}
                                onChange={(e) => updateLineItem(index, 'dimensions', e.target.value)}
                                className={tableInputClassName}
                                placeholder="长×宽×高"
                              />
                            </td>
                          )}
                          <td className="border border-gray-200 dark:border-[#3A3A3C] p-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteLine(index)}
                              disabled={packingData.items.length === 1}
                              className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                      {/* 总计行 */}
                      <tr className="bg-gray-100 dark:bg-[#1C1C1E] font-medium">
                        <td colSpan={
                          (packingData.showMarkingNo ? 1 : 0) + 
                          3 + // 序号、描述、数量
                          (packingData.showPrice ? 1 : 0) // 单价列
                        } className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-right">
                          总计:
                        </td>
                        {packingData.showPrice && (
                          <td className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-center">
                            {packingData.currency === 'USD' ? '$' : packingData.currency === 'EUR' ? '€' : '¥'}
                            {totals.totalPrice.toFixed(2)}
                          </td>
                        )}
                        {packingData.showWeight && (
                          <>
                            <td className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-center">
                              {totals.netWeight.toFixed(2)}
                            </td>
                            <td className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-center">
                              {totals.grossWeight.toFixed(2)}
                            </td>
                          </>
                        )}
                        {packingData.showPackageQty && (
                          <td className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2 text-center">
                            {totals.packageQty}
                          </td>
                        )}
                        {packingData.showDimensions && (
                          <td className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2"></td>
                        )}
                        <td className="border border-gray-200 dark:border-[#3A3A3C] px-3 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 添加行按钮 */}
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-3 h-7 rounded-lg
                      bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                      hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                      text-[#007AFF] dark:text-[#0A84FF]
                      text-[13px] font-medium
                      flex items-center gap-1
                      transition-all duration-200"
                  >
                    <span className="text-lg leading-none translate-y-[-1px]">+</span>
                    <span>添加行</span>
                  </button>
                </div>
              </div>

              {/* 备注区域 */}
              <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C]">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D] mb-2">
                    备注
                  </label>
                  <textarea
                    value={packingData.remarks}
                    onChange={(e) => setPackingData(prev => ({ ...prev, remarks: e.target.value }))}
                    className={`${inputClassName} min-h-[80px] resize-none`}
                    placeholder="请输入备注信息..."
                  />
                </div>
              </div>

              {/* 生成按钮和预览按钮 */}
              <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C]">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="w-full sm:w-auto sm:min-w-[180px]">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className={`${buttonClassName}
                        bg-[#007AFF] hover:bg-[#0063CC] dark:bg-[#0A84FF] dark:hover:bg-[#0070E0]
                        text-white font-medium
                        shadow-sm shadow-[#007AFF]/20 dark:shadow-[#0A84FF]/20
                        hover:shadow-lg hover:shadow-[#007AFF]/25 dark:hover:shadow-[#0A84FF]/25
                        active:scale-[0.98] active:shadow-inner active:bg-[#0052CC] dark:active:bg-[#0063CC]
                        transform transition-all duration-75 ease-out
                        w-full h-10
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${isGenerating ? 'scale-[0.98] shadow-inner bg-[#0052CC] dark:bg-[#0063CC]' : ''}`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {isGenerating ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>生成中...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>生成箱单</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={isLoading}
                    className={`${buttonClassName}
                      bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                      text-[#007AFF] dark:text-[#0A84FF] font-medium
                      border border-[#007AFF]/20 dark:border-[#0A84FF]/20
                      hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                      hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
                      active:bg-[#007AFF]/[0.16] dark:active:bg-[#0A84FF]/[0.16]
                      active:scale-[0.98] active:shadow-inner
                      transform transition-all duration-75 ease-out
                      w-full sm:w-auto sm:min-w-[120px] h-10
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${isLoading ? 'scale-[0.98] shadow-inner bg-[#007AFF]/[0.16] dark:bg-[#0A84FF]/[0.16]' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>预览中...</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          <span>预览</span>
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
