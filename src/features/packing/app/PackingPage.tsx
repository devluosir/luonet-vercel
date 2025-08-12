'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/Footer';
import { PackingForm } from '../components/PackingForm';
import { usePackingData } from '../hooks/usePackingData';
import { usePackingActions } from '../hooks/usePackingActions';
import { PackingData } from '../types';

// 动态导入PDFPreviewModal
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { ssr: false });

interface CustomWindow extends Window {
  __PACKING_DATA__?: PackingData;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
}

export default function PackingPage() {
  const pathname = usePathname();
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);

  // 使用自定义Hooks
  const {
    data,
    setData,
    editId,
    setEditId,
    updateLineItem,
    handleAddLine,
    handleDeleteLine,
    handleEnterGroupMode,
    handleExitGroupMode,
    handleDocumentTypeChange,
    handleOtherFeeDoubleClick,
    handleAddOtherFee,
    handleDeleteOtherFee,
    handleOtherFeeChange
  } = usePackingData();

  const {
    isGenerating,
    isSaving,
    saveMessage,
    handleGenerate,
    handlePreview,
    handleSave,
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
  const handleDataChange = (newData: PackingData) => {
    setData(newData);
  };

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

  return (
    <>
      <PackingForm
        data={data}
        onDataChange={handleDataChange}
        isEditMode={!!editId}
        editId={editId}
        isGenerating={isGenerating}
        isSaving={isSaving}
        saveMessage={saveMessage}
        onGenerate={handleGenerate}
        onPreview={handlePreviewClick}
        onSave={handleSave}
        onExportExcel={handleExportExcel}
      />
      <Footer />
      
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
    </>
  );
}
