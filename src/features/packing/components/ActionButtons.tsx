'use client';

import { Download, Eye, FileSpreadsheet } from 'lucide-react';
import { ActionButtonsProps } from '../types';

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  data,
  isGenerating,
  isSaving,
  saveMessage,
  onGenerate,
  onPreview,
  onExportExcel
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/30 shadow-sm p-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
        {/* 主要操作按钮 - 生成PDF */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl
            bg-[#007AFF] dark:bg-[#0A84FF] hover:bg-[#007AFF]/90 dark:hover:bg-[#0A84FF]/90
            text-white font-medium text-[15px] leading-relaxed
            transition-all duration-300 ease-out
            focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
            shadow-sm hover:shadow-md dark:shadow-[#0A84FF]/10
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          {isGenerating ? 'Generating...' : 'Generate PDF'}
        </button>

        {/* 次要操作按钮组 */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* 预览按钮 */}
          <button
            type="button"
            onClick={onPreview}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium
              bg-white dark:bg-[#1C1C1E]
              text-[#007AFF] dark:text-[#0A84FF]
              border border-[#007AFF]/20 dark:border-[#0A84FF]/20
              flex items-center justify-center gap-2
              hover:bg-[#007AFF]/[0.05] dark:hover:bg-[#0A84FF]/[0.05]
              hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
              active:bg-[#007AFF]/[0.1] dark:active:bg-[#0A84FF]/[0.1]
              transition-all duration-200"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>



          {/* Excel导出按钮 */}
          <button
            type="button"
            onClick={onExportExcel}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium
              bg-white dark:bg-[#1C1C1E]
              text-[#007AFF] dark:text-[#0A84FF]
              border border-[#007AFF]/20 dark:border-[#0A84FF]/20
              flex items-center justify-center gap-2
              hover:bg-[#007AFF]/[0.05] dark:hover:bg-[#0A84FF]/[0.05]
              hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
              active:bg-[#007AFF]/[0.1] dark:active:bg-[#0A84FF]/[0.1]
              transition-all duration-200"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* 保存消息 */}
      {saveMessage && (
        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-xs text-green-700 dark:text-green-300 text-center">
            {saveMessage}
          </p>
        </div>
      )}

      {/* 文档类型提示 */}
      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
          当前文档类型: {
            data.documentType === 'proforma' ? '形式发票 Proforma Invoice' :
            data.documentType === 'packing' ? '装箱单 Packing List' : '形式发票 + 装箱单 Proforma Invoice & Packing List'
          }
        </p>
      </div>
    </section>
  );
};
