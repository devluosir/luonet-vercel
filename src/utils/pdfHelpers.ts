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
export type ExtendedJsPDF = jsPDF & {
  addFileToVFS?: (filename: string, content: string) => void;
};

// 检测设备是否支持PDF内嵌预览
export const supportsPDFPreview = () => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  
  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // 检测Android设备 - 安卓设备对PDF内嵌预览支持很差，建议直接使用fallback
  const isAndroid = /Android/i.test(userAgent);
  if (isAndroid) {
    // 安卓设备即使是Chrome浏览器，iframe PDF预览也经常失败
    // 为了更好的用户体验，建议安卓设备直接使用下载/新窗口打开方式
    return false;
  }
  
  // 检测iOS设备 - Safari支持PDF预览
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  if (isIOS) {
    return true;
  }
  
  // 桌面端浏览器通常支持PDF预览
  if (!isMobile) {
    return true;
  }
  
  // 其他移动设备，保守处理
  return false;
};

// 检测是否为移动设备
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// 获取浏览器信息
export const getBrowserInfo = () => {
  if (typeof window === 'undefined') {
    return { name: 'unknown', version: 0 };
  }
  
  const userAgent = navigator.userAgent;
  
  // 检测Chrome
  const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
  if (chromeMatch) {
    return { name: 'Chrome', version: parseInt(chromeMatch[1]) };
  }
  
  // 检测Firefox
  const firefoxMatch = userAgent.match(/Firefox\/(\d+)/);
  if (firefoxMatch) {
    return { name: 'Firefox', version: parseInt(firefoxMatch[1]) };
  }
  
  // 检测Safari
  const safariMatch = userAgent.match(/Safari\/(\d+)/);
  if (safariMatch && !userAgent.includes('Chrome')) {
    return { name: 'Safari', version: parseInt(safariMatch[1]) };
  }
  
  // 检测Edge
  const edgeMatch = userAgent.match(/Edge\/(\d+)/);
  if (edgeMatch) {
    return { name: 'Edge', version: parseInt(edgeMatch[1]) };
  }
  
  return { name: 'unknown', version: 0 };
};

// 获取设备信息
export const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isAndroid: false,
      isIOS: false,
      isDesktop: true,
      canPreviewPDF: false,
      browser: { name: 'unknown', version: 0 },
      recommendedAction: 'download'
    };
  }
  
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isDesktop = !isMobile;
  const browser = getBrowserInfo();
  
  // 获取推荐操作
  let recommendedAction: 'preview' | 'download' | 'newTab' = 'preview';
  
  if (isAndroid) {
    // 安卓设备推荐下载或新窗口打开
    recommendedAction = browser.name === 'Chrome' ? 'newTab' : 'download';
  } else if (isIOS) {
    // iOS设备可以预览
    recommendedAction = 'preview';
  } else if (isDesktop) {
    // 桌面端可以预览
    recommendedAction = 'preview';
  } else {
    // 其他移动设备推荐下载
    recommendedAction = 'download';
  }
  
  return {
    isMobile,
    isAndroid,
    isIOS,
    isDesktop,
    canPreviewPDF: supportsPDFPreview(),
    browser,
    recommendedAction
  };
};

// PDF预览选项
export interface PDFPreviewOptions {
  _fallbackToDownload?: boolean;
  _showDownloadButton?: boolean;
  _showOpenInNewTab?: boolean;
  autoDetectDevice?: boolean;
  forceAndroidFallback?: boolean;
}

// 处理PDF预览的通用函数
export const handlePDFPreview = (
  pdfUrl: string | null, 
  options: PDFPreviewOptions = {}
) => {
  const {
    _fallbackToDownload = true,
    _showDownloadButton = true,
    _showOpenInNewTab = true,
    autoDetectDevice = true,
    forceAndroidFallback = true
  } = options;
  
  const deviceInfo = getDeviceInfo();
  
  if (!pdfUrl) {
    return {
      shouldShowIframe: false,
      shouldShowFallback: true,
      deviceInfo,
      canPreview: false,
      message: '无法生成PDF预览'
    };
  }
  
  // 安卓设备强制使用fallback模式
  if (forceAndroidFallback && deviceInfo.isAndroid) {
    return {
      shouldShowIframe: false,
      shouldShowFallback: true,
      deviceInfo,
      canPreview: false,
      message: getAndroidFallbackMessage(deviceInfo.browser)
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
        ? getAndroidFallbackMessage(deviceInfo.browser)
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

// 获取安卓设备的fallback提示信息
const getAndroidFallbackMessage = (browser: { name: string; version: number }) => {
  if (browser.name === 'Chrome') {
    return '安卓Chrome浏览器建议在新窗口中打开PDF，或直接下载查看以获得最佳体验';
  } else if (browser.name === 'Firefox') {
    return '安卓Firefox浏览器建议下载PDF文件查看，或尝试在新窗口中打开';
  } else {
    return '安卓设备建议下载PDF文件查看，或使用Chrome浏览器在新窗口中打开';
  }
};

// 在新窗口中打开PDF
export const openPDFInNewTab = (pdfUrl: string) => {
  if (pdfUrl) {
    // 安卓设备在新窗口打开时使用特殊处理
    const deviceInfo = getDeviceInfo();
    if (deviceInfo.isAndroid) {
      // 安卓设备添加下载提示
      const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        // 如果弹窗被阻止，提示用户
        alert('弹窗被阻止，请允许弹窗或直接下载PDF文件查看');
      }
    } else {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
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

// 图片压缩和优化工具
export const compressImage = async (base64Image: string, maxWidth: number = 200, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // 计算新的尺寸，保持宽高比
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const newWidth = img.width * ratio;
      const newHeight = img.height * ratio;

      canvas.width = newWidth;
      canvas.height = newHeight;

      // 绘制并压缩图片
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // 转换为base64，使用指定的质量
      const compressedBase64 = canvas.toDataURL('image/png', quality);
      resolve(compressedBase64);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64Image;
  });
};

// 简化的图片优化方案 - 通过调整尺寸和质量来减少文件大小
export const getOptimizedStampImageSimple = async (stampType: string): Promise<string> => {
  const { embeddedResources } = await import('@/lib/embedded-resources');
  
  let base64Image = '';
  if (stampType === 'shanghai') {
    base64Image = embeddedResources.shanghaiStamp;
  } else if (stampType === 'hongkong') {
    base64Image = embeddedResources.hongkongStamp;
  } else {
    throw new Error(`Unknown stamp type: ${stampType}`);
  }

  // 在浏览器环境中，尝试使用Canvas进行简单压缩
  if (typeof window !== 'undefined') {
    try {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(base64Image); // 如果Canvas不可用，返回原始图片
            return;
          }

          // 根据印章类型使用不同的压缩参数
          let maxSize, quality;
          
          if (stampType === 'shanghai') {
            // 上海印章：使用更精细的压缩参数
            maxSize = 280; // 稍微减小尺寸
            quality = 0.75; // 稍微降低质量
          } else {
            // 香港印章：保持当前参数
            maxSize = 300;
            quality = 0.8;
          }

          // 计算新的尺寸 - 保持宽高比
          const ratio = Math.min(maxSize / img.width, maxSize / img.height);
          const newWidth = Math.round(img.width * ratio);
          const newHeight = Math.round(img.height * ratio);

          canvas.width = newWidth;
          canvas.height = newHeight;

          // 绘制并压缩图片
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          // 转换为base64，使用指定的质量
          const compressedBase64 = canvas.toDataURL('image/png', quality);
          resolve(compressedBase64.replace('data:image/png;base64,', ''));
        };
        
        img.onerror = () => resolve(base64Image); // 如果加载失败，返回原始图片
        img.src = `data:image/png;base64,${base64Image}`;
      });
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
      return base64Image;
    }
  }
  
  // 在服务器环境中，返回原始图片
  return base64Image;
};

// 获取优化后的印章图片 - 使用简化版本
export const getOptimizedStampImage = async (stampType: string): Promise<string> => {
  try {
    return await getOptimizedStampImageSimple(stampType);
  } catch (error) {
    console.error('Failed to optimize stamp image:', error);
    // 返回原始图片作为后备
    const { embeddedResources } = await import('@/lib/embedded-resources');
    if (stampType === 'shanghai') {
      return embeddedResources.shanghaiStamp;
    } else if (stampType === 'hongkong') {
      return embeddedResources.hongkongStamp;
    }
    return '';
  }
}; 