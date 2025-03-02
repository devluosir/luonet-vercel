'use client';

import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Settings, Download, ArrowLeft, Eye, Clipboard, History, Save } from 'lucide-react';
import { generateQuotationPDF } from '@/utils/quotationPdfGenerator';
import { generateOrderConfirmationPDF } from '@/utils/orderConfirmationPdfGenerator';
import { TabButton } from '@/components/quotation/TabButton';
import { getDefaultNotes } from '@/utils/getDefaultNotes';
import { CustomerInfoSection } from '@/components/quotation/CustomerInfoSection';
import { ItemsTable } from '@/components/quotation/ItemsTable';
import { NotesSection } from '@/components/quotation/NotesSection';
import { SettingsPanel } from '@/components/quotation/SettingsPanel';
import { ImportDataButton } from '@/components/quotation/ImportDataButton';
import type { QuotationData, LineItem } from '@/types/quotation';
import { Footer } from '@/components/Footer';
import { parseExcelData, convertExcelToLineItems } from '@/utils/excelPasteHandler';
import { PaymentTermsSection } from '@/components/quotation/PaymentTermsSection';
import { saveQuotationHistory } from '@/utils/quotationHistory';

// 标题样式
const titleClassName = `text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]`;

// 按钮基础样式
const buttonClassName = `px-4 py-2 rounded-xl text-sm font-medium 
  transition-all duration-300`;

interface CustomWindow extends Window {
  __QUOTATION_DATA__?: QuotationData;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
  __QUOTATION_TYPE__?: 'quotation' | 'confirmation';
}

export default function QuotationPage() {
  const _router = useRouter();
  const pathname = usePathname();

  // 从 window 全局变量获取初始数据，添加下划线前缀表示有意未使用
  const _initialData = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__QUOTATION_DATA__) : null;
  const initialEditId = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__EDIT_ID__) : null;
  const initialType = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__QUOTATION_TYPE__) : 'quotation';

  const [activeTab, setActiveTab] = useState<'quotation' | 'confirmation'>(initialType || 'quotation');
  const [showSettings, setShowSettings] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [editId, setEditId] = useState<string | undefined>(initialEditId || undefined);
  const [data, setData] = useState<QuotationData>(_initialData || {
    to: '',
    inquiryNo: '',
    quotationNo: '',
    date: new Date().toISOString().split('T')[0],
    from: '',
    currency: 'USD',
    paymentDate: new Date().toISOString().split('T')[0],
    items: [{
      id: 1,
      partName: '',
      description: '',
      quantity: 0,
      unit: 'pc',
      unitPrice: 0,
      amount: 0,
      remarks: ''
    }],
    notes: [],
    amountInWords: {
      dollars: '',
      cents: '',
      hasDecimals: false
    },
    showDescription: true,
    showRemarks: true,
    showBank: false,
    showStamp: false,
    contractNo: '',
    customUnits: [],
    showPaymentTerms: false,
    showInvoiceReminder: false,
    additionalPaymentTerms: ''
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 为 any 类型添加具体的类型定义
  interface CustomError {
    message: string;
    code?: string;
    details?: unknown;
  }

  // 将 handleError 包装在 useCallback 中
  const handleError = useCallback((error: CustomError | Error | unknown) => {
    if (error instanceof Error) {
      console.error('Error:', error.message);
      return error.message;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const customError = error as CustomError;
      console.error('Custom error:', customError.message);
      return customError.message;
    }
    console.error('Unknown error:', error);
    return 'An unknown error occurred';
  }, []);

  // 清除注入的数据
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 获取并保存编辑模式状态
      const customWindow = window as unknown as CustomWindow;
      const editId = customWindow.__EDIT_ID__;
      const type = customWindow.__QUOTATION_TYPE__;
      
      if (editId !== undefined) {
        setEditId(editId);
      }
      if (type !== undefined) {
        setActiveTab(type);
      }

      // 清除注入的数据
      delete customWindow.__QUOTATION_DATA__;
      delete customWindow.__EDIT_MODE__;
      delete customWindow.__EDIT_ID__;
      delete customWindow.__QUOTATION_TYPE__;
    }
  }, []);

  // 监听 activeTab 变化，更新 notes
  useEffect(() => {
    setData(prev => ({
      ...prev,
      // 只在 notes 为空数组或等于默认值时更新
      ...(prev.notes.length === 0 || JSON.stringify(prev.notes) === JSON.stringify(getDefaultNotes(prev.from, activeTab === 'quotation' ? 'confirmation' : 'quotation'))
        ? { notes: getDefaultNotes(prev.from, activeTab) }
        : {})
    }));
  }, [activeTab]);

  // 添加PDF预览事件监听器
  useEffect(() => {
    const handlePdfPreview = (event: CustomEvent<string>) => {
      setPdfPreviewUrl(event.detail);
    };

    window.addEventListener('pdf-preview', handlePdfPreview as EventListener);

    return () => {
      window.removeEventListener('pdf-preview', handlePdfPreview as EventListener);
    };
  }, []);

  const handleGenerate = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // 设置生成状态
    flushSync(() => {
      setIsGenerating(true);
      setGeneratingProgress(10);
    });
    
    let progressInterval: NodeJS.Timeout | undefined;
    
    try {
      // 获取编辑 ID（从 URL 或 state）
      const existingId = editId || (pathname?.startsWith('/quotation/edit/') ? pathname.split('/').pop() : undefined);
      
      // 保存记录
      const saveResult = await saveQuotationHistory(activeTab, data, existingId);
      if (saveResult && !editId) {
        setEditId(saveResult.id);
      }
      
      // 启动进度更新
      progressInterval = setInterval(() => {
        setGeneratingProgress(prev => {
          const increment = Math.max(1, (90 - prev) / 10);
          return prev >= 90 ? prev : prev + increment;
        });
      }, 100);

      // 生成 PDF
      if (activeTab === 'quotation') {
        await generateQuotationPDF(data);
      } else {
        await generateOrderConfirmationPDF(data);
      }

      // 清除进度更新
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      // 完成时立即设置100%
      flushSync(() => {
        setGeneratingProgress(100);
      });
      
      // 延迟重置进度
      setTimeout(() => {
        setGeneratingProgress(0);
        setIsGenerating(false);
      }, 500);
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setIsGenerating(false);
      setGeneratingProgress(0);
      alert('生成 PDF 失败，请稍后重试');
    }
  }, [activeTab, data, editId, pathname]);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  }, []);

  const handlePreview = useCallback(async () => {
    flushSync(() => {
      setIsLoading(true);
    });
    
    try {
      if (activeTab === 'quotation') {
        const pdfBlob = await generateQuotationPDF(data, true);
        const url = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
      } else {
        const pdfBlob = await generateOrderConfirmationPDF(data, true);
        const url = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
      }
    } catch (error: unknown) {
      const errorMessage = handleError(error);
      console.error('PDF generation failed:', errorMessage);
    } finally {
      flushSync(() => {
        setIsLoading(false);
      });
    }
  }, [activeTab, data, handleError]);

  // 将 handleGlobalPaste 包装在 useCallback 中
  const handleGlobalPaste = useCallback((data: string | LineItem[]) => {
    try {
      if (typeof data === 'string') {
        const parsedData = parseExcelData(data);
        const newItems = convertExcelToLineItems(parsedData);
        if (newItems.length > 0) {
          setData(prev => ({
            ...prev,
            items: newItems
          }));
        }
      } else {
        setData(prev => ({
          ...prev,
          items: data
        }));
      }
    } catch (error: unknown) {
      const errorMessage = handleError(error);
      console.error('Failed to parse pasted data:', errorMessage);
    }
  }, [handleError]);

  // 处理剪贴板按钮点击
  const handleClipboardButtonClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleGlobalPaste(text);
      }
    } catch (error: unknown) {
      const errorMessage = handleError(error);
      console.error('Failed to access clipboard:', errorMessage);
      showPasteDialog();
    }
  };

  // 添加全局粘贴事件监听器
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;
      
      // 如果目标元素不存在，直接返回
      if (!target) return;

      // 检查是否在表格内的任何输入元素中
      const isTableInput = target.matches('input, textarea') && 
        (target.closest('td') !== null || target.closest('table') !== null);
      
      // 如果是表格内的输入元素，直接返回
      if (isTableInput) {
        return;
      }

      // 检查是否在其他输入元素中
      const isOtherInput = target.matches('input, textarea') || 
        target.getAttribute('contenteditable') === 'true' ||
        target.closest('[contenteditable="true"]') !== null;

      // 如果是其他输入元素，直接返回
      if (isOtherInput) {
        return;
      }

      // 只有在非输入元素区域的粘贴才执行全局粘贴
      event.preventDefault();
      try {
        let text = event.clipboardData?.getData('text') || '';
        if (!text) {
          text = await navigator.clipboard.readText();
        }
        if (text) {
          handleGlobalPaste(text);
        }
      } catch (err) {
        console.error('Failed to handle paste:', err);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handleGlobalPaste]);

  // 显示粘贴对话框
  const showPasteDialog = () => {
    const input = document.createElement('textarea');
    input.style.position = 'fixed';
    input.style.top = '50%';
    input.style.left = '50%';
    input.style.transform = 'translate(-50%, -50%)';
    input.style.zIndex = '9999';
    input.style.width = '80%';
    input.style.height = '200px';
    input.style.padding = '12px';
    input.style.border = '2px solid #007AFF';
    input.style.borderRadius = '8px';
    input.placeholder = '请将数据粘贴到这里...';
    
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '9998';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确认';
    confirmBtn.style.position = 'fixed';
    confirmBtn.style.bottom = '20%';
    confirmBtn.style.left = '50%';
    confirmBtn.style.transform = 'translateX(-50%)';
    confirmBtn.style.zIndex = '9999';
    confirmBtn.style.padding = '8px 24px';
    confirmBtn.style.backgroundColor = '#007AFF';
    confirmBtn.style.color = 'white';
    confirmBtn.style.border = 'none';
    confirmBtn.style.borderRadius = '6px';
    confirmBtn.style.cursor = 'pointer';
    
    const cleanup = () => {
      document.body.removeChild(input);
      document.body.removeChild(overlay);
      document.body.removeChild(confirmBtn);
    };
    
    confirmBtn.onclick = () => {
      const text = input.value;
      if (text) {
        handleGlobalPaste(text);
      }
      cleanup();
    };
    
    overlay.onclick = cleanup;
    
    document.body.appendChild(overlay);
    document.body.appendChild(input);
    document.body.appendChild(confirmBtn);
    
    input.focus();
  };

  // 从 URL 获取编辑 ID
  useEffect(() => {
    if (pathname?.startsWith('/quotation/edit/')) {
      const id = pathname.split('/').pop();
      setEditId(id);
    }
  }, [pathname]);

  // 处理保存
  const handleSave = useCallback(async () => {
    if (!data.to.trim()) {
      setSaveMessage('请填写客户名称');
      setSaveSuccess(false);
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    if (data.items.length === 0 || (data.items.length === 1 && !data.items[0].partName)) {
      setSaveMessage('请添加至少一个商品');
      setSaveSuccess(false);
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    setIsSaving(true);
    try {
      // 使用 URL 中的 ID 或现有的 editId
      const id = pathname?.startsWith('/quotation/edit/') ? pathname.split('/').pop() : editId;
      
      const result = await saveQuotationHistory(activeTab, data, id);
      if (result) {
        setSaveSuccess(true);
        setSaveMessage('保存成功');
        // 更新 editId，确保后续的保存操作会更新同一条记录
        if (!editId) {
          setEditId(result.id);
        }
      } else {
        setSaveSuccess(false);
        setSaveMessage('保存失败');
      }
    } catch (error) {
      console.error('Error saving:', error);
      setSaveSuccess(false);
      setSaveMessage('保存失败');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 2000);
    }
  }, [activeTab, data, editId, pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link href="/tools" className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          {/* 标签切换 */}
          <div className="flex justify-center gap-2 sm:gap-4 mt-4 sm:mt-6 mb-6 sm:mb-8">
            <TabButton 
              active={activeTab === 'quotation'}
              onClick={() => setActiveTab('quotation')}
            >
              Quotation
            </TabButton>
            <TabButton 
              active={activeTab === 'confirmation'}
              onClick={() => setActiveTab('confirmation')}
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
                  <h1 className={titleClassName}>
                    Generate {activeTab === 'quotation' ? 'Quotation' : 'Order'}
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
                    href="/quotation/history"
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
                    onClick={(e) => {
                      e.preventDefault();
                      setShowSettings(!showSettings);
                    }}
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
                <SettingsPanel 
                  data={data}
                  onChange={setData}
                  activeTab={activeTab}
                />
              </div>

              {/* 客户信息区域 */}
              <div className="px-4 sm:px-6 py-4">
                <CustomerInfoSection 
                  data={data}
                  onChange={setData}
                  type={activeTab as 'quotation' | 'confirmation'}
                />
              </div>

              {/* 商品表格区域 */}
              <div className="px-0 sm:px-6 py-4">
                <div className="space-y-4">
                  <div className="px-4 sm:px-0">
                    <ImportDataButton onImport={handleGlobalPaste} />
                  </div>
                  <ItemsTable 
                    data={data}
                    onChange={setData}
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
                        setData({ ...data, items: newItems });
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
                        setData({ ...data, otherFees: newFees });
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
                        {data.currency === 'USD' ? '$' : '¥'}
                        {(
                          data.items.reduce((sum, item) => sum + item.amount, 0) +
                          (data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0)
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes 部分 */}
                <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C]">
                  <div className="space-y-6">
                    <NotesSection 
                      data={data}
                      onChange={setData}
                    />
                    {/* 银行信息区域 */}
                    {activeTab === 'confirmation' && data.showBank && (
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

                    {activeTab === 'confirmation' && (
                      <PaymentTermsSection
                        data={data}
                        onChange={setData}
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
                              <span>Generate {activeTab === 'quotation' ? 'Quotation' : 'Order'}</span>
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
                            <span>Previewing...</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            <span>Preview</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* PDF预览弹窗 */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] w-full max-w-5xl h-[90vh] rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#3A3A3C]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
                PDF Preview
              </h3>
              <button
                onClick={() => setPdfPreviewUrl(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-[#98989D] dark:hover:text-[#F5F5F7]"
              >
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 p-4">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full rounded-lg border border-gray-200 dark:border-[#3A3A3C]"
              />
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
