'use client';
import React from 'react';
import { Download, Eye } from 'lucide-react';
import { usePurchasePdfActions } from '../hooks/usePurchaseActions';

export default function PurchaseActions() {
  const { handleGenerate, handlePreview, isGenerating, generatingProgress } = usePurchasePdfActions();

  return (
    <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C]">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 bg-[#007AFF] hover:bg-[#0063CC] dark:bg-[#0A84FF] dark:hover:bg-[#0070E0] text-white font-medium shadow-sm shadow-[#007AFF]/20 dark:shadow-[#0A84FF]/20 hover:shadow-lg hover:shadow-[#007AFF]/25 dark:hover:shadow-[#0A84FF]/25 active:scale-[0.98] active:shadow-inner active:bg-[#0052CC] dark:active:bg-[#0063CC] w-full h-10 disabled:opacity-50 disabled:cursor-not-allowed ${isGenerating ? 'scale-[0.98] shadow-inner bg-[#0052CC] dark:bg-[#0063CC]' : ''}`}
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
                  <span>生成PDF</span>
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
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08] text-[#007AFF] dark:text-[#0A84FF] font-medium border border-[#007AFF]/20 dark:border-[#0A84FF]/20 hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12] hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30 active:bg-[#007AFF]/[0.16] dark:active:bg-[#0A84FF]/[0.16] active:scale-[0.98] active:shadow-inner w-full sm:w-auto sm:min-w-[120px] h-10"
        >
          <div className="flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" />
            <span>预览PDF</span>
          </div>
        </button>
      </div>
    </div>
  );
}
