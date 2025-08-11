'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Clipboard,
  Settings,
  History
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { CustomerSection } from '@/components/invoice/CustomerSection';
import { ItemsTable } from '../components/ItemsTable';
import PDFPreviewModal from '@/components/history/PDFPreviewModal';
import { useInvoiceStore } from '../state/invoice.store';
import { useInvoiceForm } from '../hooks/useInvoiceForm';
import { usePasteImport } from '../hooks/usePasteImport';
import { SettingsPanel } from '../components/SettingsPanel';
import { InvoiceActions } from '../components/InvoiceActions';
import { PaymentTermsSection } from '../components/PaymentTermsSection';
import { InvoiceInfoCompact } from '../components/InvoiceInfoCompact';
import { INPUT_CLASSNAMES } from '../constants/settings';
import { getTotalAmount } from '../utils/calculations';

/**
 * 发票主页面组件
 */
export const InvoicePage = () => {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  const {
    data,
    isEditMode,
    editId,
    isSaving,
    saveSuccess,
    saveMessage,
    showSettings,
    showPreview,
    previewItem,
    customUnit,
    showUnitSuccess,
    focusedCell,
    updateData,
    saveInvoice,
    toggleSettings,
    togglePreview,
    setPreviewItem,
    addLineItem,
    addOtherFee
  } = useInvoiceStore();

  const { handleSubmit } = useInvoiceForm();
  const { handlePasteButtonClick } = usePasteImport();

  // 优化总金额计算
  const totalAmount = useMemo(() => {
    return getTotalAmount(data.items, data.otherFees);
  }, [data.items, data.otherFees]);

  // 组件挂载状态
  useEffect(() => {
    setMounted(true);
  }, []);

  // 避免闪烁
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#000000] dark:text-gray-100 flex flex-col">
      <main className="flex-1">
        <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link 
            href={
              pathname?.includes('/edit/') ? '/history?tab=invoice' : 
              pathname?.includes('/copy/') ? '/history?tab=invoice' : 
              '/dashboard'
            } 
            className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          {/* 主卡片容器 */}
          <div className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-3xl shadow-lg dark:shadow-2xl shadow-black/5 dark:shadow-black/20 border border-black/5 dark:border-white/10 p-4 md:p-8 mt-8">
            <form onSubmit={handleSubmit}>
              {/* 标题和工具栏 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Invoice Generator
                  </h1>
                  <button
                    type="button"
                    onClick={handlePasteButtonClick}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 flex-shrink-0"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/history?tab=invoice"
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 flex-shrink-0"
                    title="历史记录"
                  >
                    <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </Link>
                  <button
                    type="button"
                    onClick={saveInvoice}
                    disabled={isSaving}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 flex-shrink-0 relative"
                    title={isEditMode ? '保存修改' : '保存新记录'}
                  >
                    {isSaving ? (
                      <svg className="animate-spin h-5 w-5 text-gray-600 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <Save className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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
                    onClick={toggleSettings}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  >
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* 设置面板 */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showSettings ? 'opacity-100 px-4 sm:px-6 py-2 h-auto mb-8' : 'opacity-0 px-0 py-0 h-0'}`}>
                <SettingsPanel />
              </div>

              {/* 基础信息区域 */}
              <div className="mb-8">
                <div className="bg-gray-50/50 dark:bg-gray-800/20 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
                  <InvoiceInfoCompact 
                    data={data} 
                    onChange={updateData} 
                  />
                </div>
              </div>

              {/* 商品表格 */}
              <ItemsTable />

              {/* 添加行按钮和总金额 */}
              <div className="flex items-center justify-between gap-4 mt-6 mb-8">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="px-2 sm:px-3 h-7 rounded-lg whitespace-nowrap
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
                    onClick={addOtherFee}
                    className="px-2 sm:px-3 h-7 rounded-lg whitespace-nowrap
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
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-500 hidden md:inline">Total Amount</span>
                  <div className="text-right">
                    <span className="text-xl font-semibold tracking-tight whitespace-nowrap">
                      {data.currency === 'USD' ? '$' : '¥'}
                      {totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 英文大写金额显示区域 */}
              <div className="mt-4 mb-8">
                <div className="inline text-sm">
                  <span className="text-gray-600 dark:text-gray-400">SAY TOTAL </span>
                  <span className="text-blue-500">
                    {data.currency === 'USD' ? 'US DOLLARS ' : 'CHINESE YUAN '}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">{data.amountInWords.dollars}</span>
                  {data.amountInWords.hasDecimals && (
                    <>
                      <span className="text-red-500"> AND </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {data.amountInWords.cents}
                      </span>
                    </>
                  )}
                  {!data.amountInWords.hasDecimals && (
                    <span className="text-gray-600 dark:text-gray-400"> ONLY</span>
                  )}
                </div>
              </div>

              {/* 银行信息 */}
              {data.showBank && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Bank Information:</h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                    <p>Bank Name: The Hongkong and Shanghai Banking Corporation Limited</p>
                    <p>Swift Code: HSBCHKHHHKH</p>
                    <p>Bank Address: Head Office 1 Queen&apos;s Road Central Hong Kong</p>
                    <p>A/C No.: 801470337838</p>
                    <p>Beneficiary: Luo &amp; Company Co., Limited</p>
                  </div>
                </div>
              )}

              {/* 付款条款 */}
              <div className="mb-6">
                <PaymentTermsSection 
                  data={data} 
                  onChange={updateData} 
                />
              </div>

              {/* 生成按钮 */}
              <InvoiceActions />
            </form>
          </div>
        </div>
      </main>

      {/* PDF预览弹窗 */}
      <PDFPreviewModal
        isOpen={showPreview}
        onClose={() => {
          togglePreview();
          setPreviewItem(null);
        }}
        item={previewItem}
        itemType="invoice"
      />

      <Footer />
    </div>
  );
};
