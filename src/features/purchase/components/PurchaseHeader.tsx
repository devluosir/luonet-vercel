'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, History, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { usePurchaseStore } from '../state/purchase.store';

export default function PurchaseHeader() {
  const pathname = usePathname();
  const { toggleSettings, pageMode } = usePurchaseStore();

  return (
    <>
      {/* 返回按钮 */}
      <Link 
        href={
          pathname?.includes('/edit/') ? '/history?tab=purchase' : 
          pathname?.includes('/copy/') ? '/history?tab=purchase' : 
          '/dashboard'
        } 
        className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7] transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Link>

      {/* 标题和设置按钮 */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-[#3A3A3C]">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]">
          {pageMode === 'create' ? 'Create Purchase Order' : 
           pageMode === 'edit' ? 'Edit Purchase Order' : 
           pageMode === 'copy' ? 'Copy Purchase Order' : 
           'Purchase Order'}
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/history?tab=purchase"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
            title="历史记录"
          >
            <History className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
          </Link>
          <button
            type="button"
            onClick={toggleSettings}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
          </button>
        </div>
      </div>
    </>
  );
}
