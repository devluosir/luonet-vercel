'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Download, Eye } from 'lucide-react';
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
import PurchaseHeader from '../components/PurchaseHeader';
import PurchaseForm from '../components/PurchaseForm';
import { usePurchaseInit, usePurchasePdfActions } from '../hooks/usePurchaseActions';
import { useRenderLoopGuard } from '@/debug/useRenderLoopGuard';
import { usePurchaseStore } from '../state/purchase.store';

// 动态导入PDFPreviewModal
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-64"></div>
});

export default function PurchasePage() {
  const pathname = usePathname();
  const { user, handleLogout } = useAppUser();
  const { showPreview, previewItem, setShowPreview, setPreviewItem, editId } = usePurchaseStore();
  const { handleGenerate, handlePreview, isGenerating } = usePurchasePdfActions();
  
  // 初始化逻辑
  usePurchaseInit();
  
  // 开发期循环哨兵
  useRenderLoopGuard('PurchasePage');

  const isEdit = pathname?.includes('/edit/') || pathname?.includes('/copy/') || !!editId;
  const bottomActions: ActionButton[] = [
    {
      key: 'generate',
      label: isGenerating ? 'Generating...' : 'Generate PDF',
      onClick: handleGenerate,
      variant: 'primary',
      loading: isGenerating,
      disabled: isGenerating,
      icon: Download,
    },
    {
      key: 'preview',
      label: 'Preview',
      onClick: handlePreview,
      variant: 'secondary',
      icon: Eye,
    },
  ];

  return (
    <AppLayout
      breadcrumbs={[
        { label: '首页', path: '/dashboard' },
        { label: '采购订单' },
        { label: isEdit ? '编辑' : '新建' },
      ]}
      user={user}
      onLogout={handleLogout}
      bottomActions={bottomActions}
    >
      <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
        <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl sm:rounded-3xl shadow-lg">
          <PurchaseHeader />
          <PurchaseForm />
        </div>
      </div>

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
    </AppLayout>
  );
}
