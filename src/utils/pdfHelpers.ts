/// <reference types="node" />
/// <reference lib="dom" />

import { PDFGeneratorData } from '@/types/pdf';
import jsPDF from 'jspdf';

export interface ImageLoader {
  (src: string): Promise<HTMLImageElement>;
}

export interface HeaderImageGetter {
  (headerType: string): Promise<HTMLImageElement | null>;
}

export interface StampImageGetter {
  (stampType: string): string | null;
}

export interface InvoiceTitleGetter {
  (data: PDFGeneratorData): string;
}

// 加载图片
export const loadImage: ImageLoader = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// 获取表头图片路径
export const getHeaderImage: HeaderImageGetter = async (headerType) => {
  switch (headerType) {
    case 'bilingual':
      return loadImage('/images/header-bilingual.png');
    case 'english':
      return loadImage('/images/header-english.png');
    case 'chinese':
      return loadImage('/images/header-chinese.png');
    default:
      return null;
  }
};

// 获取印章图片路径
export const getStampImage = (stampType: string) => {
  switch (stampType) {
    case 'shanghai':
      return '/images/stamp-shanghai.png';
    case 'hongkong':
      return '/images/stamp-hongkong.png';
    case 'english':
      return '/images/stamp-english.png';
    case 'chinese':
      return '/images/stamp-chinese.png';
    default:
      return null;
  }
};

// 获取发票标题
export const getInvoiceTitle: InvoiceTitleGetter = (data) => {
  const invoiceType = data.templateConfig.invoiceType || 'invoice';
  switch (invoiceType) {
    case 'commercial':
      return data.currency === 'USD' ? 'COMMERCIAL INVOICE' : 'COMMERCIAL INVOICE';
    case 'proforma':
      return data.currency === 'USD' ? 'PROFORMA INVOICE' : 'PROFORMA INVOICE';
    case 'invoice':
    default:
      return data.currency === 'USD' ? 'INVOICE' : 'INVOICE';
  }
};

// 计算总金额
export function getTotalAmount(items: PDFGeneratorData['items']) {
  return items.reduce((sum, item) => sum + item.amount, 0);
} 

// 错误处理
export const handlePdfError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return '未知错误';
};

// 扩展jsPDF类型以支持新字体
export interface ExtendedJsPDF extends jsPDF {
  addFileToVFS(filename: string, content: string): void;
}

// 检测设备是否支持PDF内嵌预览
export const supportsPDFPreview = () => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  
  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // 检测Android设备 - 现代Android Chrome浏览器支持PDF预览
  const isAndroid = /Android/i.test(userAgent);
  if (isAndroid) {
    // 检测是否为Chrome浏览器（支持PDF预览）
    const isChrome = /Chrome/i.test(userAgent);
    const isFirefox = /Firefox/i.test(userAgent);
    const isEdge = /Edge/i.test(userAgent);
    
    // Chrome、Firefox、Edge通常支持PDF预览
    return isChrome || isFirefox || isEdge;
  }
  
  // 检测iOS设备 - Safari支持PDF预览
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  if (isIOS) {
    return true;
  }
  
  // 桌面端浏览器通常支持PDF预览
  if (!isMobile) {
    // 检测是否为现代浏览器
    return 'PDFObject' in window || 'navigator' in window;
  }
  
  // 其他移动设备，保守处理
  return false;
};

// 检测是否为移动设备
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// 获取设备信息
export const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isAndroid: false,
      isIOS: false,
      isDesktop: true,
      canPreviewPDF: false
    };
  }
  
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isDesktop = !isMobile;
  
  return {
    isMobile,
    isAndroid,
    isIOS,
    isDesktop,
    canPreviewPDF: supportsPDFPreview()
  };
};

// PDF预览选项
export interface PDFPreviewOptions {
  fallbackToDownload?: boolean;
  showDownloadButton?: boolean;
  showOpenInNewTab?: boolean;
  autoDetectDevice?: boolean;
}

// 处理PDF预览的通用函数
export const handlePDFPreview = (
  pdfUrl: string | null, 
  options: PDFPreviewOptions = {}
) => {
  const {
    fallbackToDownload = true,
    showDownloadButton = true,
    showOpenInNewTab = true,
    autoDetectDevice = true
  } = options;
  
  const deviceInfo = getDeviceInfo();
  
  if (!pdfUrl) {
    return {
      shouldShowIframe: false,
      shouldShowFallback: true,
      deviceInfo,
      canPreview: false
    };
  }
  
  // 如果启用自动检测且设备不支持预览
  if (autoDetectDevice && !deviceInfo.canPreviewPDF) {
    return {
      shouldShowIframe: false,
      shouldShowFallback: true,
      deviceInfo,
      canPreview: false,
      message: deviceInfo.isAndroid 
        ? '当前浏览器不支持在线PDF预览，请下载文件查看或尝试使用Chrome浏览器'
        : '您的设备不支持在线PDF预览，请下载文件查看'
    };
  }
  
  return {
    shouldShowIframe: true,
    shouldShowFallback: false,
    deviceInfo,
    canPreview: true
  };
};

// 在新窗口中打开PDF
export const openPDFInNewTab = (pdfUrl: string) => {
  if (pdfUrl) {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  }
};

// 创建PDF下载链接
export const createPDFDownloadLink = (pdfBlob: Blob, filename: string) => {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 清理PDF URL
export const cleanupPDFUrl = (url: string | null) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}; 