'use client';

import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { generateQuotationPDF } from '@/utils/quotationPdfGenerator';
import { generateOrderConfirmationPDF } from '@/utils/orderConfirmationPdfGenerator';
import { generateInvoicePDF } from '@/utils/invoicePdfGenerator';
import { generatePurchaseOrderPDF } from '@/utils/purchasePdfGenerator';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  itemType: 'quotation' | 'confirmation' | 'invoice' | 'purchase';
}

export default function PDFPreviewModal({ isOpen, onClose, item, itemType }: PDFPreviewModalProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // 生成PDF预览
  const generatePdfPreview = async () => {
    if (!item) return;

    setIsGeneratingPdf(true);
    setPdfPreviewUrl(null);
    
    try {
      let pdfUrl: string | null = null;

      // 根据记录类型生成对应的PDF
      if (itemType === 'quotation') {
        const pdfBlob = await generateQuotationPDF(item.data, true);
        pdfUrl = URL.createObjectURL(pdfBlob);
      } else if (itemType === 'confirmation') {
        const pdfBlob = await generateOrderConfirmationPDF(item.data, true);
        pdfUrl = URL.createObjectURL(pdfBlob);
      } else if (itemType === 'invoice') {
        pdfUrl = await generateInvoicePDF(item.data, true);
      } else if (itemType === 'purchase') {
        const pdfBlob = await generatePurchaseOrderPDF(item.data, true);
        pdfUrl = URL.createObjectURL(pdfBlob);
      }

      if (pdfUrl) {
        setPdfPreviewUrl(pdfUrl);
      }
    } catch (error) {
      console.error('Error generating PDF preview:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 获取预览标题
  const getPreviewTitle = () => {
    switch (itemType) {
      case 'quotation':
        return '报价单 PDF 预览';
      case 'confirmation':
        return '订单确认 PDF 预览';
      case 'invoice':
        return '发票 PDF 预览';
      case 'purchase':
        return '采购单 PDF 预览';
      default:
        return 'PDF 预览';
    }
  };

  // 清理PDF预览URL
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  // 当模态框打开时生成PDF
  useEffect(() => {
    if (isOpen && item) {
      generatePdfPreview();
    }
  }, [isOpen, item, itemType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {getPreviewTitle()}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-b-xl flex items-center justify-center border border-gray-200 dark:border-gray-600" style={{padding:0}}>
          {isGeneratingPdf ? (
            <div className="flex flex-col items-center space-y-4 py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">正在生成PDF预览...</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">请稍候</p>
              </div>
            </div>
          ) : pdfPreviewUrl ? (
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-[80vh] border-0 rounded-b-xl"
              title="PDF预览"
              style={{margin:0, padding:0}}
            />
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">无法生成PDF预览</p>
              <p className="text-sm">请检查记录数据是否完整</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 