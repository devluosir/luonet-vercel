'use client';

import React from 'react';
import { useInvoiceStore } from '../state/invoice.store';
import { getTotalAmount } from '../utils/calculations';
import { Download } from 'lucide-react';

/**
 * 发票操作按钮组件
 */
export const InvoiceActions = React.memo(() => {
  const {
    data,
    isEditMode,
    isSaving,
    saveSuccess,
    saveMessage,
    showPreview,
    previewItem,
    saveInvoice,
    generatePDF,
    previewPDF,
    togglePreview,
    setPreviewItem
  } = useInvoiceStore();

  const totalAmount = getTotalAmount(data.items, data.otherFees);

  const handleGeneratePDF = async () => {
    try {
      await generatePDF();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('生成PDF时出错');
    }
  };

  const handlePreview = async () => {
    try {
      // 使用新的预览方法
      const previewUrl = await previewPDF();
      
      // 准备预览数据，包装成历史记录格式
      const previewData = {
        id: 'preview',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customerName: data.to || 'Unknown',
        invoiceNo: data.invoiceNo || 'N/A',
        totalAmount: totalAmount,
        currency: data.currency,
        data: data,
        pdfUrl: previewUrl // 添加PDF URL
      };
      
      setPreviewItem(previewData);
      togglePreview();
    } catch (error) {
      console.error('Error previewing PDF:', error);
      alert('预览PDF时出错');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
      <button
        type="button"
        onClick={handleGeneratePDF}
        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl
          bg-[#007AFF] dark:bg-[#0A84FF] hover:bg-[#007AFF]/90 dark:hover:bg-[#0A84FF]/90
          text-white font-medium text-[15px] leading-relaxed
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
          shadow-sm hover:shadow-md dark:shadow-[#0A84FF]/10`}
      >
        <Download className="w-5 h-5" />
        {isEditMode ? 'Save Changes & Generate' : 'Generate Invoice'}
      </button>

      <button
        type="button"
        onClick={handlePreview}
        className="w-full sm:w-auto px-6 py-2.5 rounded-2xl font-medium
          bg-white dark:bg-[#1C1C1E]
          text-[#007AFF] dark:text-[#0A84FF]
          border border-[#007AFF]/20 dark:border-[#0A84FF]/20
          flex items-center justify-center gap-2
          hover:bg-[#007AFF]/[0.05] dark:hover:bg-[#0A84FF]/[0.05]
          hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
          active:bg-[#007AFF]/[0.1] dark:active:bg-[#0A84FF]/[0.1]
          transition-all duration-200"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Preview
      </button>
    </div>
  );
});
