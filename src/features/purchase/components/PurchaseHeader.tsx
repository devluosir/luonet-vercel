'use client';
import React from 'react';
import Link from 'next/link';
import { History, Settings } from 'lucide-react';
import { usePurchaseStore } from '../state/purchase.store';

export default function PurchaseHeader() {
  const { toggleSettings, pageMode } = usePurchaseStore();

  return (
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
  );
}
