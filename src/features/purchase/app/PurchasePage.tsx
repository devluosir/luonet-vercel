'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Download, Eye } from 'lucide-react';
import { AppLayout, type ActionButton } from '@/components/layout';
import { PermissionDenied } from '@/components/PermissionDenied';
import { FullScreenSpinner } from '@/components/layout/FullScreenSpinner';
import { useAppUser } from '@/hooks/useAppUser';
import { useModulePermissionGuard } from '@/hooks/useModulePermissionGuard';
import PurchaseHeader from '../components/PurchaseHeader';
import PurchaseForm from '../components/PurchaseForm';
import { usePurchaseInit, usePurchasePdfActions } from '../hooks/usePurchaseActions';
import { useRenderLoopGuard } from '@/debug/useRenderLoopGuard';
import { usePurchaseStore } from '../state/purchase.store';
import { PageCard } from '@/components/ui/PageCard';

// 动态导入PDFPreviewModal
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-64"></div>
});

export default function PurchasePage() {
  const pathname = usePathname();
  const { user, handleLogout } = useAppUser();
  const { ready: permissionReady, allowed: hasModuleAccess } = useModulePermissionGuard('purchase');
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

  // 页面级权限守卫
  if (!permissionReady) {
    return <FullScreenSpinner />;
  }
  if (!hasModuleAccess) {
    return <PermissionDenied message="您没有采购订单的访问权限" />;
  }

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
        <PageCard>
          <PurchaseHeader />
          <PurchaseForm />
        </PageCard>
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
