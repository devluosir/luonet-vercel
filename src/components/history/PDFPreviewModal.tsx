'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Download, ExternalLink } from 'lucide-react';
import { generateQuotationPDF } from '@/utils/quotationPdfGenerator';
import { generateOrderConfirmationPDF } from '@/utils/orderConfirmationPdfGenerator';
import { generateInvoicePDF } from '@/utils/invoicePdfGenerator';
import { generatePurchaseOrderPDF } from '@/utils/purchasePdfGenerator';
import { generatePackingListPDF } from '@/utils/packingPdfGenerator';
import { supportsPDFPreview, getDeviceInfo, handlePDFPreview, openPDFInNewTab } from '@/utils/pdfHelpers';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  itemType: 'quotation' | 'confirmation' | 'invoice' | 'purchase' | 'packing';
}

export default function PDFPreviewModal({ isOpen, onClose, item, itemType }: PDFPreviewModalProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showDownloadFallback, setShowDownloadFallback] = useState(false);

  const deviceInfo = getDeviceInfo();
  const previewInfo = handlePDFPreview(pdfPreviewUrl, {
    autoDetectDevice: true,
    forceAndroidFallback: true
  });

  // 检测PDF预览支持
  useEffect(() => {
    if (deviceInfo.isAndroid || !deviceInfo.canPreviewPDF) {
      setShowDownloadFallback(true);
    }
  }, [deviceInfo.isAndroid, deviceInfo.canPreviewPDF]);

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
      } else if (itemType === 'packing') {
        pdfUrl = await generatePackingListPDF(item.data, true);
      }

      if (pdfUrl) {
        setPdfPreviewUrl(pdfUrl);
        // 安卓设备不尝试iframe预览，直接显示fallback
        if (deviceInfo.isAndroid) {
          setShowDownloadFallback(true);
        }
      }
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      setShowDownloadFallback(true);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 下载PDF
  const downloadPDF = async () => {
    if (!item) return;

    setIsGeneratingPdf(true);
    try {
      // 根据记录类型生成对应的PDF并下载
      if (itemType === 'quotation') {
        await generateQuotationPDF(item.data, false);
      } else if (itemType === 'confirmation') {
        await generateOrderConfirmationPDF(item.data, false);
      } else if (itemType === 'invoice') {
        await generateInvoicePDF(item.data, false);
      } else if (itemType === 'purchase') {
        await generatePurchaseOrderPDF(item.data, false);
      } else if (itemType === 'packing') {
        await generatePackingListPDF(item.data, false);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('PDF下载失败，请重试');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 在新窗口打开PDF
  const openInNewTab = () => {
    if (pdfPreviewUrl) {
      openPDFInNewTab(pdfPreviewUrl);
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
      case 'packing':
        return '装箱单 PDF 预览';
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
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {getPreviewTitle()}
            </h3>
            {deviceInfo.isAndroid && (
              <div className="flex gap-2">
                <span className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                  安卓设备
                </span>
                <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                  {deviceInfo.browser.name}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 新窗口打开按钮 */}
            {pdfPreviewUrl && (
              <button
                onClick={openInNewTab}
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title={deviceInfo.isAndroid ? "在新窗口打开（推荐）" : "在新窗口打开"}
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            )}
            
            {/* 下载按钮 */}
            <button
              onClick={downloadPDF}
              disabled={isGeneratingPdf}
              className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
              title="下载PDF"
            >
              <Download className={`w-5 h-5 ${isGeneratingPdf ? 'animate-pulse' : ''}`} />
            </button>
            
            {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
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
          ) : showDownloadFallback || deviceInfo.isAndroid ? (
            <div className="text-center py-12 px-6 max-w-lg mx-auto">
              <FileText className="w-16 h-16 mx-auto mb-4 text-blue-500 opacity-70" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {deviceInfo.isAndroid ? 'PDF查看方式' : 'PDF预览'}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {previewInfo.message || '选择您偏好的PDF查看方式'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {/* 推荐操作按钮 */}
                {deviceInfo.recommendedAction === 'newTab' && pdfPreviewUrl && (
                  <button
                    onClick={openInNewTab}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>新窗口打开 (推荐)</span>
                  </button>
                )}
                
                <button
                  onClick={downloadPDF}
                  disabled={isGeneratingPdf}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                    deviceInfo.recommendedAction === 'download' 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isGeneratingPdf ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>下载PDF {deviceInfo.recommendedAction === 'download' ? '(推荐)' : ''}</span>
                    </>
                  )}
                </button>
                
                {deviceInfo.recommendedAction !== 'newTab' && pdfPreviewUrl && (
                  <button
                    onClick={openInNewTab}
                    className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>新窗口打开</span>
                  </button>
                )}
              </div>
              
              {deviceInfo.isAndroid && (
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <div className="text-amber-600 dark:text-amber-400 text-lg">💡</div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                        安卓设备优化建议
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        {deviceInfo.browser.name === 'Chrome' 
                          ? '• 点击"新窗口打开"可在Chrome中查看PDF\n• 或直接下载到本地使用PDF阅读器打开'
                          : '• 建议下载PDF文件查看\n• 或使用Chrome浏览器访问本页面'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : pdfPreviewUrl ? (
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-[80vh] border-0 rounded-b-xl"
              title="PDF预览"
              style={{margin:0, padding:0}}
              onError={() => setShowDownloadFallback(true)}
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