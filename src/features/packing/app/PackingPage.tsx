'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Download, Eye, FileSpreadsheet, Save } from 'lucide-react';
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
import { PackingForm } from '../components/PackingForm';
import { usePackingData } from '../hooks/usePackingData';
import { usePackingActions } from '../hooks/usePackingActions';
import type { PackingData } from '../types';

// 动态导入PDFPreviewModal
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { ssr: false });

export default function PackingPage() {
  const pathname = usePathname();
  const { user, handleLogout } = useAppUser();
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);

  // 使用自定义Hooks
  const {
    data,
    setData,
    editId,
    setEditId,
  } = usePackingData();

  const {
    isGenerating,
    isSaving,
    saveMessage,
    handleSave,
    handleGenerate,
    handlePreview,
    handleExportExcel
  } = usePackingActions(data, editId);

  // 从 URL 获取编辑 ID
  useEffect(() => {
    if (pathname?.startsWith('/packing/edit/')) {
      const id = pathname.split('/').pop();
      setEditId(id);
    }
  }, [pathname, setEditId]);

  // 处理数据变更
  const handleDataChange = useCallback((newData: PackingData) => {
    setData(newData);
  }, [setData]);

  // 处理预览
  const handlePreviewClick = async () => {
    try {
      const blob = await handlePreview();
      if (blob) {
        // 准备预览数据
        const previewData = {
          id: editId || 'preview',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          consigneeName: data.consignee.name || 'Unknown',
          invoiceNo: data.invoiceNo || 'N/A',
          orderNo: data.orderNo || 'N/A',
          totalAmount: 0, // 这里可以计算总金额
          currency: data.currency,
          documentType: data.documentType,
          data: data
        };
        
        setPreviewItem(previewData);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  const isEdit = pathname?.includes('/edit/') || pathname?.includes('/copy/') || !!editId;
  const bottomActions: ActionButton[] = [
    {
      key: 'save',
      label: isSaving ? '保存中...' : '保存',
      onClick: handleSave,
      variant: 'secondary',
      loading: isSaving,
      disabled: isSaving,
      icon: Save,
    },
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
      onClick: handlePreviewClick,
      variant: 'secondary',
      icon: Eye,
    },
    {
      key: 'excel',
      label: 'Excel',
      onClick: handleExportExcel,
      variant: 'secondary',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <AppLayout
      breadcrumbs={[
        { label: '首页', path: '/dashboard' },
        { label: '箱单发票' },
        { label: isEdit ? '编辑' : '新建' },
      ]}
      user={user}
      onLogout={handleLogout}
      bottomActions={bottomActions}
    >
      <PackingForm
        data={data}
        onDataChange={handleDataChange}
        isEditMode={!!editId}
        editId={editId}
        isGenerating={isGenerating}
        isSaving={isSaving}
        saveMessage={saveMessage}
        saveSuccess={saveMessage === '保存成功'}
        onSave={handleSave}
        onGenerate={handleGenerate}
        onPreview={handlePreviewClick}
        onExportExcel={handleExportExcel}
      />
      
      {/* PDF预览弹窗 */}
      <PDFPreviewModal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewItem(null);
        }}
        item={previewItem}
        itemType="packing"
      />
    </AppLayout>
  );
}
