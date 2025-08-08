'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useQuotationStore } from '../state/useQuotationStore';
// 移除选择器导入，直接使用store
import { useInitQuotation } from '../hooks/useInitQuotation';
import { useClipboardImport } from '../hooks/useClipboardImport';
import { useAutoSave } from '@/hooks/useAutoSave';
import { getInitialQuotationData } from '@/utils/quotationInitialData';
import { useToast } from '@/components/ui/Toast';
import { saveOrUpdate } from '../services/quotation.service';
import { useGenerateService } from '../services/generate.service';
import { downloadPdf } from '../services/generate.service';
import { buildPreviewPayload } from '../services/preview.service';
import { recordCustomerUsage } from '@/utils/customerUsageTracker';

// 动态导入组件
import dynamic from 'next/dynamic';

// 动态导入PDF预览组件
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-64"></div>
});

// 动态导入PaymentTermsSection
const DynamicPaymentTermsSection = dynamic(() => import('@/components/quotation/PaymentTermsSection').then(mod => ({ default: mod.PaymentTermsSection })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-8"></div>
});

// 导入现有组件
import { TabButton } from '@/components/quotation/TabButton';
import { CustomerInfoSection } from '@/components/quotation/CustomerInfoSection';
import { ItemsTable } from '@/components/quotation/ItemsTable';
import { NotesSection } from '@/components/quotation/NotesSection';
import { SettingsPanel } from '@/components/quotation/SettingsPanel';
import { ImportDataButton } from '@/components/quotation/ImportDataButton';
import { PasteDialog } from '@/components/quotation/PasteDialog';
import { Footer } from '@/components/Footer';
import { Clipboard, History, Save, Settings, Download, Eye } from 'lucide-react';

export default function QuotationPage() {
  const pathname = usePathname();
  const { showToast } = useToast();
  
  // 直接从store获取所有状态和actions，避免选择器循环
  const {
    // 状态
    tab: activeTab,
    data,
    editId,
    isGenerating,
    generatingProgress,
    showSettings,
    showPreview,
    isPasteDialogOpen,
    previewItem,
    // actions
    setTab,
    setEditId,
    setGenerating,
    setProgress,
    setShowSettings,
    setShowPreview,
    setPasteDialogOpen,
    setPreviewItem,
    updateItems,
    updateOtherFees,
    updateData
  } = useQuotationStore();
  
  // 初始化
  useInitQuotation();
  
  // 计算衍生状态
  const itemsTotal = data.items?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const feesTotal = data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0;
  const totalAmount = itemsTotal + feesTotal;
  const currencySymbol = data.currency === 'USD' ? '$' : data.currency === 'EUR' ? '€' : '¥';
  
  // 剪贴板导入
  const { handleClipboardButtonClick, handleGlobalPaste } = useClipboardImport();
  
  // 自动保存 - 使用稳定的数据引用
  const { clearSaved: clearAutoSave } = useAutoSave({
    data: JSON.stringify(data ?? getInitialQuotationData()),
    key: 'draftQuotation',
    delay: 2000,
    enabled: !editId
  });
  
  // PDF生成服务
  const { generatePdf } = useGenerateService();
  
  // 处理标签切换
  const handleTabChange = useCallback((tab: 'quotation' | 'confirmation') => {
    if (activeTab === tab) return;
    setTab(tab);
  }, [activeTab, setTab]);
  
  // 处理保存
  const handleSave = async () => {
    if (!data) return;

    try {
      const result = await saveOrUpdate(activeTab, data, editId);
      if (result) {
        if (!editId) {
          setEditId(result.id);
        }
        clearAutoSave();
        showToast('保存成功', 'success');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showToast('保存失败，请重试', 'error');
    }
  };
  
  // 处理生成PDF
  const handleGenerate = async () => {
    if (!data) return;

    setGenerating(true);
    setProgress(0);

    try {
      // 并行执行保存和PDF生成
      const [saveResult] = await Promise.all([
        saveOrUpdate(activeTab, data, editId),
        new Promise(resolve => setTimeout(resolve, 100))
      ]);

      setProgress(50);

      if (saveResult && !editId) {
        setEditId(saveResult.id);
      }

      // 记录使用情况
      const documentNo = activeTab === 'confirmation' 
        ? (data.contractNo || data.quotationNo) 
        : data.quotationNo;
      if (documentNo) {
        recordCustomerUsage(data.to.split('\n')[0].trim(), activeTab, documentNo);
      }

      setProgress(80);

      // 生成PDF
      const pdfBlob = await generatePdf(activeTab, data, setProgress);
      downloadPdf(pdfBlob, activeTab, data);

      // 生成成功后清除草稿
      clearAutoSave();
      showToast('PDF生成成功', 'success');

    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('PDF生成失败，请重试', 'error');
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };
  
  // 处理预览
  const handlePreview = async () => {
    if (!data) return;

    try {
      const previewData = buildPreviewPayload(activeTab, data, editId, totalAmount);
      setPreviewItem(previewData);
      setShowPreview(true);
    } catch (error) {
      console.error('Error previewing PDF:', error);
      showToast('预览失败，请重试', 'error');
    }
  };
  
  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate();
  };
  
  // 守卫：等待数据初始化完成
  if (!data || Object.keys(data).length === 0) {
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
              pathname?.includes('/edit/') ? `/history?tab=${activeTab}` : 
              pathname?.includes('/copy/') ? `/history?tab=${activeTab}` : 
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
              active={activeTab === 'quotation'}
              onClick={() => handleTabChange('quotation')}
            >
              Quotation
            </TabButton>
            <TabButton 
              active={activeTab === 'confirmation'}
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
                    href={`/history?tab=${activeTab}`}
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
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                </div>
              </div>

              {/* 设置面板 */}
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
                  type={activeTab}
                />
              </div>

              {/* 商品表格区域 */}
              <div className="px-0 sm:px-6 py-4">
                <div className="space-y-4">
                  <div className="px-4 sm:px-0">
                    <ImportDataButton onImport={updateItems} />
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
                        const newItems = [...(data.items || [])];
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

                  {/* 动态加载PaymentTermsSection */}
                  {activeTab === 'confirmation' && (
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

      {/* PDF预览弹窗 */}
      <PDFPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        item={previewItem}
        itemType={activeTab}
      />

      {/* 粘贴对话框组件 */}
      <PasteDialog
        isOpen={isPasteDialogOpen}
        onClose={() => setPasteDialogOpen(false)}
        onConfirm={handleGlobalPaste}
      />

      <Footer />
    </div>
  );
}
