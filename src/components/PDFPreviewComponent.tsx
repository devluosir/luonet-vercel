'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Download, ExternalLink } from 'lucide-react';
import { supportsPDFPreview, getDeviceInfo, openPDFInNewTab, handlePDFPreview } from '@/utils/pdfHelpers';
import { generateQuotationPDF } from '@/utils/quotationPdfGenerator';
import { generateOrderConfirmationPDF } from '@/utils/orderConfirmationPdfGenerator';
import { generateInvoicePDF } from '@/utils/invoicePdfGenerator';
import { generatePurchaseOrderPDF } from '@/utils/purchasePdfGenerator';
import { generatePackingListPDF } from '@/utils/packingPdfGenerator';

interface PDFPreviewComponentProps {
  pdfUrl: string | null;
  onClose: () => void;
  title?: string;
  data?: any;
  itemType?: 'quotation' | 'confirmation' | 'invoice' | 'purchase' | 'packing';
  showDownloadButton?: boolean;
  showOpenInNewTab?: boolean;
}

export default function PDFPreviewComponent({
  pdfUrl,
  onClose,
  title = 'PDF Preview',
  data,
  itemType,
  showDownloadButton = true,
  showOpenInNewTab = true
}: PDFPreviewComponentProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  
  const deviceInfo = getDeviceInfo();
  const previewInfo = handlePDFPreview(pdfUrl, {
    autoDetectDevice: true,
    showDownloadButton,
    showOpenInNewTab
  });

  // 检测iframe加载失败
  const handleIframeError = () => {
    setShowFallback(true);
  };

  // 下载PDF
  const handleDownload = async () => {
    if (!data || !itemType) {
      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
      }
      return;
    }

    setIsDownloading(true);
    try {
      // 根据类型生成并下载PDF
      if (itemType === 'quotation') {
        await generateQuotationPDF(data, false);
      } else if (itemType === 'confirmation') {
        await generateOrderConfirmationPDF(data, false);
      } else if (itemType === 'invoice') {
        await generateInvoicePDF(data, false);
      } else if (itemType === 'purchase') {
        await generatePurchaseOrderPDF(data, false);
      } else if (itemType === 'packing') {
        await generatePackingListPDF(data, false);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('PDF下载失败，请重试');
    } finally {
      setIsDownloading(false);
    }
  };

  // 在新窗口打开
  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      openPDFInNewTab(pdfUrl);
    }
  };

  if (!pdfUrl) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#2C2C2E] w-full max-w-5xl h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#3A3A3C]">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
              {title}
            </h3>
            {deviceInfo.isAndroid && (
              <span className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                安卓设备
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* 新窗口打开按钮 */}
            {showOpenInNewTab && previewInfo.canPreview && (
              <button
                onClick={handleOpenInNewTab}
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="在新窗口打开"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            )}
            
            {/* 下载按钮 */}
            {showDownloadButton && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                title="下载PDF"
              >
                <Download className={`w-5 h-5 ${isDownloading ? 'animate-pulse' : ''}`} />
              </button>
            )}
            
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 p-4">
          {previewInfo.shouldShowFallback || showFallback ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <FileText className="w-16 h-16 mx-auto mb-4 text-blue-500 opacity-70" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">PDF预览</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                  {previewInfo.message || '无法在此处预览PDF，请下载文件查看'}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDownloading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>生成中...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>下载PDF</span>
                      </>
                    )}
                  </button>
                  
                  {previewInfo.canPreview && (
                    <button
                      onClick={handleOpenInNewTab}
                      className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>新窗口打开</span>
                    </button>
                  )}
                </div>
                
                {deviceInfo.isAndroid && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      💡 提示：安卓设备建议下载PDF后使用专业阅读器查看
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg border border-gray-200 dark:border-[#3A3A3C]"
              title="PDF预览"
              onError={handleIframeError}
              onLoad={() => {
                // 检测iframe是否成功加载PDF
                const iframe = document.querySelector('iframe[src="' + pdfUrl + '"]') as HTMLIFrameElement;
                if (iframe) {
                  try {
                    // 尝试访问iframe内容，如果失败则显示fallback
                    setTimeout(() => {
                      if (iframe.contentDocument === null) {
                        setShowFallback(true);
                      }
                    }, 2000);
                  } catch (e) {
                    setShowFallback(true);
                  }
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
} 