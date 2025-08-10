'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/Footer';
import PurchaseHeader from '../components/PurchaseHeader';
import PurchaseForm from '../components/PurchaseForm';
import PurchaseActions from '../components/PurchaseActions';
import { usePurchaseInit } from '../hooks/usePurchaseActions';
import { usePurchaseStore } from '../state/purchase.store';

// 动态导入PDFPreviewModal
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-64"></div>
});

export default function PurchasePage() {
  const { showPreview, previewItem, setShowPreview, setPreviewItem } = usePurchaseStore();
  
  // 初始化逻辑
  usePurchaseInit();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-1">
        <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
          <PurchaseHeader />
          
          {/* 主卡片容器内容 */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl sm:rounded-3xl shadow-lg">
            <PurchaseForm />
            <PurchaseActions />
          </div>
        </div>
      </main>

      {/* PDF预览弹窗 */}
      <PDFPreviewModal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewItem(null);
        }}
        item={previewItem}
        itemType="purchase"
      />

      <Footer />
    </div>
  );
}
