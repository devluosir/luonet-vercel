'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Settings, Download, ArrowLeft, Eye, Clipboard, History, Save } from 'lucide-react';
import { TabButton } from '@/components/quotation/TabButton';
// getDefaultNotes 现在在 getInitialQuotationData 中使用
import { CustomerInfoSection } from '@/components/quotation/CustomerInfoSection';
import { ItemsTable } from '@/components/quotation/ItemsTable';
import { NotesSection } from '@/components/quotation/NotesSection';
import { SettingsPanel } from '@/components/quotation/SettingsPanel';
import { ImportDataButton } from '@/components/quotation/ImportDataButton';
import type { QuotationData, LineItem, OtherFee } from '@/types/quotation';
import { Footer } from '@/components/Footer';
import { parseExcelData, convertExcelToLineItems } from '@/utils/excelPasteHandler';
import { saveQuotationHistory } from '@/utils/quotationHistory';
import { validateQuotation, validateQuotationForPreview } from '@/utils/quotationValidation';
import { usePdfGenerator } from '@/hooks/usePdfGenerator';
import { useToast } from '@/components/ui/Toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { getInitialQuotationData } from '@/utils/quotationInitialData';
import { PasteDialog } from '@/components/quotation/PasteDialog';
// format 现在在 getInitialQuotationData 中使用
import dynamic from 'next/dynamic';

// 动态导入PDF预览组件
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-64"></div>
});

// 动态导入PaymentTermsSection（仅在订单确认模式使用）
const DynamicPaymentTermsSection = dynamic(() => import('@/components/quotation/PaymentTermsSection').then(mod => ({ default: mod.PaymentTermsSection })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-8"></div>
});

// 这些函数现在在 getInitialQuotationData 中定义

// 异步设置localStorage（暂时未使用）
const _setLocalStorageAsync = (key: string, value: unknown) => {
  const serialized = JSON.stringify(value);
  
  // 使用requestIdleCallback延迟写入
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as { requestIdleCallback: (callback: () => void) => void }).requestIdleCallback(() => {
      try {
        localStorage.setItem(key, serialized);
      } catch (error) {
        console.warn(`Failed to set localStorage key: ${key}`, error);
      }
    });
  } else {
    // 降级到setTimeout
    setTimeout(() => {
      try {
        localStorage.setItem(key, serialized);
      } catch (error) {
        console.warn(`Failed to set localStorage key: ${key}`, error);
      }
    }, 0);
  }
};

interface CustomWindow extends Window {
  __QUOTATION_DATA__?: QuotationData;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
  __QUOTATION_TYPE__?: 'quotation' | 'confirmation';
}

export default function QuotationPage() {
  const _router = useRouter();
  const pathname = usePathname();
  const { generate: generatePdf } = usePdfGenerator();
  const { showToast } = useToast();
  
  // 权限初始化
  // usePermissionInit(); // 移除：权限初始化已在全局处理

  // 从 window 全局变量获取初始数据，添加下划线前缀表示有意未使用
  const _initialData = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__QUOTATION_DATA__) : null;
  const initialEditId = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__EDIT_ID__) : null;
  const _initialType = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__QUOTATION_TYPE__) : 'quotation';

  // 延迟初始化 tab 状态，避免 SSR 不一致
  const [activeTab, setActiveTab] = useState<'quotation' | 'confirmation' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState<unknown>(null);
  // 获取初始数据（优先使用全局数据，其次使用草稿，最后使用默认数据）
  const getInitialData = () => {
    if (_initialData) return _initialData;
    
    if (typeof window !== 'undefined') {
      try {
        const draft = localStorage.getItem('draftQuotation');
        if (draft) {
          const parsed = JSON.parse(draft);
          return parsed;
        }
      } catch (error) {
        console.warn('读取草稿失败:', error);
      }
    }
    
    return getInitialQuotationData();
  };

  const [data, setData] = useState<QuotationData>(getInitialData());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [editId, setEditId] = useState<string | undefined>(initialEditId || undefined);
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);

  // 自动保存功能
  const { clearSaved } = useAutoSave({
    data,
    key: 'draftQuotation',
    delay: 2000, // 2秒后自动保存
    enabled: !editId // 只在新建模式下启用自动保存
  });

  // 客户端初始化 tab 状态，避免 SSR 不一致
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabFromUrl = searchParams.get('tab') as 'quotation' | 'confirmation' | null;
    const win = window as unknown as CustomWindow;
    setActiveTab(tabFromUrl || win.__QUOTATION_TYPE__ || 'quotation');
  }, []);

  // 使用useRef缓存用户信息，避免重复解析（暂时未使用）
  const _userInfoRef = useRef<string>('');
  
  // 使用useMemo优化计算属性
  const totalAmount = useMemo(() => {
    return (
      data.items.reduce((sum, item) => sum + item.amount, 0) +
      (data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0)
    );
  }, [data.items, data.otherFees]);

  const currencySymbol = useMemo(() => {
    return data.currency === 'USD' ? '$' : data.currency === 'EUR' ? '€' : '¥';
  }, [data.currency]);

  // 使用useCallback优化事件处理函数，同时更新URL参数
  const handleTabChange = useCallback((tab: 'quotation' | 'confirmation') => {
    setActiveTab(tab);
    
    // 更新 URL 参数以持久化 tab 状态
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  // 类型安全的 activeTab，在守卫之后确保不为 null
  const safeActiveTab = activeTab as 'quotation' | 'confirmation';

  const handleSettingsToggle = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  const handlePreviewToggle = useCallback(() => {
    setShowPreview(prev => !prev);
  }, []);

  // 优化数据更新函数，使用局部更新
  const updateData = useCallback((updates: Partial<QuotationData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  // 优化项目更新函数
  const updateItems = useCallback((newItems: LineItem[]) => {
    setData(prev => ({ ...prev, items: newItems }));
  }, []);

  // 优化其他费用更新函数
  const updateOtherFees = useCallback((newFees: OtherFee[]) => {
    setData(prev => ({ ...prev, otherFees: newFees }));
  }, []);

  // 使用useCallback优化保存函数
  const handleSave = useCallback(async () => {
    const validation = validateQuotation(data);
    if (!validation.valid) {
      showToast(validation.message!, 'error');
      return;
    }

    try {
      // 使用 URL 中的 ID 或现有的 editId
      const id = pathname?.startsWith('/quotation/edit/') ? pathname.split('/').pop() : editId;
      
      const result = await saveQuotationHistory(safeActiveTab, data, id);
      if (result) {
        // 更新 editId，确保后续的保存操作会更新同一条记录
        if (!editId) {
          setEditId(result.id);
        }
        // 保存成功后清除草稿
        clearSaved();
        showToast('保存成功', 'success');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showToast('保存失败，请重试', 'error');
    }
  }, [safeActiveTab, data, editId, pathname, showToast, clearSaved]);

  // 优化生成PDF函数，使用统一的PDF生成Hook
  const handleGenerate = useCallback(async () => {
    const validation = validateQuotation(data);
    if (!validation.valid) {
      showToast(validation.message!, 'error');
      return;
    }

    setIsGenerating(true);
    setGeneratingProgress(0);

    try {
      const { recordCustomerUsage } = await import('@/utils/customerUsageTracker');
      
      // 并行执行保存和PDF生成
      const [saveResult] = await Promise.all([
        saveQuotationHistory(safeActiveTab, data, editId),
        new Promise(resolve => setTimeout(resolve, 100)) // 给UI一点时间更新
      ]);

      setGeneratingProgress(50);

      if (saveResult) {
        if (!editId) {
          setEditId(saveResult.id);
        }
      }

      // 记录使用情况
      if (data.quotationNo) {
        recordCustomerUsage(data.to.split('\n')[0].trim(), safeActiveTab, data.quotationNo);
      }

      setGeneratingProgress(80);

      // 使用统一的PDF生成Hook
      const pdfBlob = await generatePdf(safeActiveTab, data);

      setGeneratingProgress(100);

      // 下载PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeActiveTab === 'quotation' ? 'quotation' : 'order-confirmation'}_${data.quotationNo || 'draft'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // 生成成功后清除草稿
      clearSaved();
      showToast('PDF生成成功', 'success');

    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('PDF生成失败，请重试', 'error');
    } finally {
      setIsGenerating(false);
      setGeneratingProgress(0);
    }
  }, [safeActiveTab, data, editId, generatePdf, showToast, clearSaved]);

  // 优化预览函数
  const handlePreview = useCallback(async () => {
    const validation = validateQuotationForPreview(data);
    if (!validation.valid) {
      showToast(validation.message!, 'error');
      return;
    }

    try {
      const pdfBlob = await generatePdf(safeActiveTab, data);

      const url = URL.createObjectURL(pdfBlob);
      setPreviewItem({ url, type: safeActiveTab });
      setShowPreview(true);
    } catch (error) {
      console.error('Error previewing PDF:', error);
      showToast('预览失败，请重试', 'error');
    }
  }, [safeActiveTab, data, generatePdf, showToast]);

  // 优化全局粘贴处理
  const handleGlobalPaste = useCallback(async (text: string) => {
    try {
      const items = parseExcelData(text);
      if (items.length > 0) {
        const convertedItems = convertExcelToLineItems(items);
        updateItems(convertedItems);
        showToast(`成功导入 ${items.length} 个商品条目`, 'success');
      } else {
        showToast('未检测到有效的Excel数据', 'info');
      }
    } catch (error) {
      console.error('Error parsing pasted data:', error);
      showToast('数据解析失败，请检查格式', 'error');
    }
  }, [updateItems, showToast]);

  // 显示粘贴对话框（使用React组件替代DOM API）
  const openPasteDialog = useCallback(() => {
    setIsPasteDialogOpen(true);
  }, []);

  // 优化剪贴板按钮点击
  const handleClipboardButtonClick = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleGlobalPaste(text);
      } else {
        showToast('剪贴板为空', 'info');
      }
    } catch (error) {
      console.error('Error reading clipboard:', error);
      showToast('无法访问剪贴板，请手动粘贴', 'info');
      // 显示粘贴对话框
      openPasteDialog();
    }
  }, [handleGlobalPaste, openPasteDialog, showToast]);

  // 优化表单提交
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate();
  }, [handleGenerate]);

  // 从 URL 获取编辑 ID
  useEffect(() => {
    if (pathname?.startsWith('/quotation/edit/')) {
      const id = pathname.split('/').pop();
      setEditId(id);
    }
  }, [pathname]);

  // 守卫：等待客户端初始化完成
  if (!activeTab) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007AFF] dark:border-[#0A84FF]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-1">
        <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link 
            href={
              pathname?.includes('/edit/') ? `/history?tab=${safeActiveTab}` : 
              pathname?.includes('/copy/') ? `/history?tab=${safeActiveTab}` : 
              '/dashboard'
            } 
            className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          {/* 标签切换 */}
          <div className="flex justify-center gap-2 sm:gap-4 mt-4 sm:mt-6 mb-6 sm:mb-8">
            <TabButton 
              active={safeActiveTab === 'quotation'}
              onClick={() => handleTabChange('quotation')}
            >
              Quotation
            </TabButton>
            <TabButton 
              active={safeActiveTab === 'confirmation'}
              onClick={() => handleTabChange('confirmation')}
            >
              Order Confirmation
            </TabButton>
          </div>

          {/* 主卡片容器 */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl sm:rounded-3xl shadow-lg">
            <form onSubmit={handleSubmit}>
              {/* 标题和设置按钮 */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-[#3A3A3C]">
                <div className="flex items-center gap-4">
                  <h1 className="text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]">
                    Generate {safeActiveTab === 'quotation' ? 'Quotation' : 'Order'}
                  </h1>
                  <button
                    type="button"
                    onClick={handleClipboardButtonClick}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/history?tab=${safeActiveTab}`}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="历史记录"
                  >
                    <History className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0 relative"
                    title={editId ? '保存修改' : '保存新记录'}
                  >
                    <Save className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSettingsToggle}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                </div>
              </div>

              {/* 设置面板 - 条件渲染 */}
              {showSettings && (
                <div className="overflow-hidden transition-all duration-300 ease-in-out opacity-100 px-4 sm:px-6 py-2 h-auto mb-8">
                  <SettingsPanel 
                    data={data}
                    onChange={updateData}
                    activeTab={activeTab}
                  />
                </div>
              )}

              {/* 客户信息区域 */}
              <div className="px-4 sm:px-6 py-4">
                <CustomerInfoSection 
                  data={data}
                  onChange={updateData}
                  type={activeTab as 'quotation' | 'confirmation'}
                />
              </div>

              {/* 商品表格区域 */}
              <div className="px-0 sm:px-6 py-4">
                <div className="space-y-4">
                  <div className="px-4 sm:px-0">
                    <ImportDataButton onImport={(items: LineItem[]) => {
                    updateItems(items);
                  }} />
                  </div>
                  <ItemsTable 
                    data={data}
                    onChange={updateData}
                  />
                </div>

                {/* 按钮和总金额区域 */}
                <div className="mt-4 px-4 sm:px-0 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = [...data.items];
                        newItems.push({
                          id: newItems.length + 1,
                          partName: '',
                          description: '',
                          quantity: 0,
                          unit: 'pc',
                          unitPrice: 0,
                          amount: 0,
                          remarks: ''
                        });
                        updateItems(newItems);
                      }}
                      className="px-3 h-7 rounded-lg
                        bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                        hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                        text-[#007AFF] dark:text-[#0A84FF]
                        text-[13px] font-medium
                        flex items-center gap-1
                        transition-all duration-200"
                    >
                      <span className="text-lg leading-none translate-y-[-1px]">+</span>
                      <span>Add Line</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const newFees = [...(data.otherFees || [])];
                        const maxId = newFees.reduce((max, fee) => Math.max(max, fee.id), 0);
                        newFees.push({
                          id: maxId + 1,
                          description: '',
                          amount: 0,
                          remarks: ''
                        });
                        updateOtherFees(newFees);
                      }}
                      className="px-3 h-7 rounded-lg
                        bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                        hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                        text-[#007AFF] dark:text-[#0A84FF]
                        text-[13px] font-medium
                        flex items-center gap-1
                        transition-all duration-200"
                    >
                      <span className="text-lg leading-none translate-y-[-1px]">+</span>
                      <span>Add Other Fee</span>
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:block text-sm text-[#86868B] dark:text-gray-400">Total Amount:</div>
                      <div className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {currencySymbol}{totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes 部分 */}
              <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C]">
                <div className="space-y-6">
                  <NotesSection 
                    data={data}
                    onChange={updateData}
                  />
                  {/* 银行信息区域 */}
                  {safeActiveTab === 'confirmation' && data.showBank && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D] mb-2">
                        Bank Information:
                      </label>
                      <div className="bg-gray-50 dark:bg-[#3A3A3C] p-3 sm:p-4 rounded-xl text-sm dark:text-[#F5F5F7]">
                        <p>Bank Name: The Hongkong and Shanghai Banking Corporation Limited</p>
                        <p>Swift code: HSBCHKHHHKH</p>
                        <p>Bank address: Head Office 1 Queen&apos;s Road Central Hong Kong</p>
                        <p>A/C No.: 801470337838</p>
                        <p>Beneficiary: Luo & Company Co., Limited</p>
                      </div>
                    </div>
                  )}

                  {/* 动态加载PaymentTermsSection */}
                  {safeActiveTab === 'confirmation' && (
                    <DynamicPaymentTermsSection
                      data={data}
                      onChange={updateData}
                    />
                  )}
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
                      className={`px-4 py-2 rounded-xl text-sm font-medium 
                        transition-all duration-300
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
                            <span>Generating...</span>
                          </>
                        ) : (pathname?.startsWith('/quotation/edit/') || editId) ? (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Save Changes & Generate</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Generate {safeActiveTab === 'quotation' ? 'Quotation' : 'Order'}</span>
                          </>
                        )}
                      </div>
                    </button>
                    {/* 进度条 */}
                    {isGenerating && (
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                        <div 
                          className="bg-[#007AFF] dark:bg-[#0A84FF] h-1.5 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${Math.min(100, generatingProgress)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handlePreview}
                    className={`px-4 py-2 rounded-xl text-sm font-medium 
                      transition-all duration-300
                      bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                      text-[#007AFF] dark:text-[#0A84FF] font-medium
                      border border-[#007AFF]/20 dark:border-[#0A84FF]/20
                      hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                      hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
                      active:bg-[#007AFF]/[0.16] dark:active:bg-[#0A84FF]/[0.16]
                      active:scale-[0.98] active:shadow-inner
                      transform transition-all duration-75 ease-out
                      w-full sm:w-auto sm:min-w-[120px] h-10
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </div>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* PDF预览弹窗 - 使用统一的组件 */}
      <PDFPreviewModal
        isOpen={showPreview}
        onClose={handlePreviewToggle}
        item={previewItem}
        itemType={safeActiveTab}
      />

      {/* 粘贴对话框组件 */}
      <PasteDialog
        isOpen={isPasteDialogOpen}
        onClose={() => setIsPasteDialogOpen(false)}
        onConfirm={handleGlobalPaste}
      />

      <Footer />
    </div>
  );
}
