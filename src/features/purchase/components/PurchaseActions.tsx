'use client';
import React from 'react';
import { Download, Eye } from 'lucide-react';
import { usePurchasePdfActions } from '../hooks/usePurchaseActions';

export default function PurchaseActions() {
  const { handleGenerate, handlePreview, isGenerating, generatingProgress } = usePurchasePdfActions();

  return (
    <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C]">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
        {/* 主要操作按钮 - 生成PDF */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl
            bg-[#007AFF] dark:bg-[#0A84FF] hover:bg-[#007AFF]/90 dark:hover:bg-[#0A84FF]/90
            text-white font-medium text-[15px] leading-relaxed
            transition-all duration-300 ease-out
            focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
            shadow-sm hover:shadow-md dark:shadow-[#0A84FF]/10
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
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
        </button>

        {/* 次要操作按钮组 */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* 预览按钮 */}
          <button
            type="button"
            onClick={handlePreview}
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
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* 进度条 */}
      {isGenerating && (
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
          <div 
            className="bg-[#007AFF] dark:bg-[#0A84FF] h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, generatingProgress)}%` }}
          />
        </div>
      )}
    </div>
  );
}
