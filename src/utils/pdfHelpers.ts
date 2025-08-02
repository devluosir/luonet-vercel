/// <reference types="node" />
/// <reference lib="dom" />

import { PDFGeneratorData } from '@/types/pdf';
import jsPDF from 'jspdf';
import { embeddedResources } from '@/lib/embedded-resources';

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
  
  // 检测iOS设备
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  
  // 检测Safari浏览器
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  
  // 检测Chrome浏览器
  const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
  
  // 检测Firefox浏览器
  const isFirefox = /Firefox/.test(userAgent);
  
  // 检测Edge浏览器
  const isEdge = /Edge/.test(userAgent);
  
  // 检测Opera浏览器
  const isOpera = /Opera|OPR/.test(userAgent);
  
  // 检测版本号
  const getVersion = (browser: string) => {
    const match = userAgent.match(new RegExp(`${browser}\\/(\\d+)`));
    return match ? parseInt(match[1], 10) : 0;
  };
  
  const chromeVersion = getVersion('Chrome');
  const firefoxVersion = getVersion('Firefox');
  const safariVersion = getVersion('Safari');
  const edgeVersion = getVersion('Edge');
  
  // 判断是否支持PDF预览
  // 移动设备通常支持较差
  if (isMobile) {
    // iOS Safari 11+ 支持PDF预览
    if (isIOS && isSafari && safariVersion >= 11) {
      return true;
    }
    // Android Chrome 60+ 支持PDF预览，但体验不佳
    if (isAndroid && isChrome && chromeVersion >= 60) {
      return true;
    }
    return false;
  }
  
  // 桌面设备支持较好
  if (isChrome && chromeVersion >= 60) return true;
  if (isFirefox && firefoxVersion >= 60) return true;
  if (isSafari && safariVersion >= 11) return true;
  if (isEdge && edgeVersion >= 79) return true;
  if (isOpera) return true;
  
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
    return { name: 'unknown', version: 0, isMobile: false };
  }
  
  const userAgent = navigator.userAgent;
  
  // 检测浏览器类型和版本
  let name = 'unknown';
  let version = 0;
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  } else if (userAgent.includes('Firefox')) {
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  } else if (userAgent.includes('Edge')) {
    name = 'Edge';
    const match = userAgent.match(/Edge\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    name = 'Opera';
    const match = userAgent.match(/(?:Opera|OPR)\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  return { name, version, isMobile };
};

// 获取设备信息
export const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isAndroid: false,
      isIOS: false,
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isEdge: false,
      canPreviewPDF: false,
      browser: { name: 'unknown', version: 0, isMobile: false }
    };
  }
  
  const userAgent = navigator.userAgent;
  const browser = getBrowserInfo();
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  const isEdge = /Edge/.test(userAgent);
  
  // 判断是否支持PDF预览
  let canPreviewPDF = false;
  
  if (isMobile) {
    // iOS Safari 11+ 支持PDF预览
    if (isIOS && isSafari && browser.version >= 11) {
      canPreviewPDF = true;
    }
    // Android Chrome 60+ 支持PDF预览，但体验不佳
    else if (isAndroid && isChrome && browser.version >= 60) {
      canPreviewPDF = true;
    }
  } else {
    // 桌面设备支持较好
    if (isChrome && browser.version >= 60) canPreviewPDF = true;
    else if (isFirefox && browser.version >= 60) canPreviewPDF = true;
    else if (isSafari && browser.version >= 11) canPreviewPDF = true;
    else if (isEdge && browser.version >= 79) canPreviewPDF = true;
    else if (browser.name === 'Opera') canPreviewPDF = true;
  }
  
  return {
    isMobile,
    isAndroid,
    isIOS,
    isSafari,
    isChrome,
    isFirefox,
    isEdge,
    canPreviewPDF,
    browser
  };
};

// PDF预览选项接口
export interface PDFPreviewOptions {
  _fallbackToDownload?: boolean;
  _showDownloadButton?: boolean;
  _showOpenInNewTab?: boolean;
  autoDetectDevice?: boolean;
  forceAndroidFallback?: boolean;
}

// 处理PDF预览
export const handlePDFPreview = (
  pdfUrl: string | null, 
  options: PDFPreviewOptions = {}
) => {
  const {
    _fallbackToDownload = false,
    _showDownloadButton = true,
    _showOpenInNewTab = true,
    autoDetectDevice = true,
    forceAndroidFallback = false
  } = options;
  
  const deviceInfo = getDeviceInfo();
  
  // 如果强制使用Android fallback
  if (forceAndroidFallback && deviceInfo.isAndroid) {
    return {
      canPreview: false,
      shouldUseFallback: true,
      fallbackType: 'download',
      message: getAndroidFallbackMessage(deviceInfo.browser),
      showDownloadButton: _showDownloadButton,
      showOpenInNewTab: _showOpenInNewTab
    };
  }
  
  // 如果自动检测设备
  if (autoDetectDevice) {
    // Android设备建议使用fallback
    if (deviceInfo.isAndroid) {
      return {
        canPreview: false,
        shouldUseFallback: true,
        fallbackType: 'download',
        message: getAndroidFallbackMessage(deviceInfo.browser),
        showDownloadButton: _showDownloadButton,
        showOpenInNewTab: _showOpenInNewTab
      };
    }
    
    // iOS设备可以尝试预览
    if (deviceInfo.isIOS) {
      return {
        canPreview: deviceInfo.canPreviewPDF,
        shouldUseFallback: !deviceInfo.canPreviewPDF,
        fallbackType: 'download',
        message: deviceInfo.canPreviewPDF ? '' : 'iOS设备PDF预览可能不稳定，建议下载查看',
        showDownloadButton: _showDownloadButton,
        showOpenInNewTab: _showOpenInNewTab
      };
    }
  }
  
  // 桌面设备
  if (!deviceInfo.isMobile) {
    return {
      canPreview: deviceInfo.canPreviewPDF,
      shouldUseFallback: !deviceInfo.canPreviewPDF,
      fallbackType: 'download',
      message: deviceInfo.canPreviewPDF ? '' : '当前浏览器不支持PDF预览，请下载查看',
      showDownloadButton: _showDownloadButton,
      showOpenInNewTab: _showOpenInNewTab
    };
  }
  
  // 默认情况
  return {
    canPreview: false,
    shouldUseFallback: true,
    fallbackType: 'download',
    message: '设备不支持PDF预览，请下载查看',
    showDownloadButton: _showDownloadButton,
    showOpenInNewTab: _showOpenInNewTab
  };
};

// 获取Android设备的fallback消息
const getAndroidFallbackMessage = (browser: { name: string; version: number }) => {
  if (browser.name === 'Chrome' && browser.version >= 60) {
    return 'Android Chrome支持PDF预览，但体验不佳，建议下载查看';
  }
  return 'Android设备PDF预览体验不佳，建议下载查看';
};

// 在新标签页中打开PDF
export const openPDFInNewTab = (pdfUrl: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    const newWindow = window.open(pdfUrl, '_blank');
    if (!newWindow) {
      // 如果弹窗被阻止，尝试使用location.href
      window.location.href = pdfUrl;
    }
  } catch (error) {
    console.error('打开PDF失败:', error);
    // 降级到location.href
    window.location.href = pdfUrl;
  }
};

// 创建PDF下载链接
export const createPDFDownloadLink = (pdfBlob: Blob, filename: string) => {
  if (typeof window === 'undefined') return null;
  
  try {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 清理URL
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
    
    return url;
  } catch (error) {
    console.error('创建下载链接失败:', error);
    return null;
  }
};

// 清理PDF URL
export const cleanupPDFUrl = (url: string | null) => {
  if (url && typeof window !== 'undefined') {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('清理PDF URL失败:', error);
    }
  }
};

// 压缩图片
export const compressImage = async (base64Image: string, maxWidth: number = 200, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      // 计算新的尺寸 - 保持宽高比
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const newWidth = Math.round(img.width * ratio);
      const newHeight = Math.round(img.height * ratio);

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
    if (stampType === 'shanghai') {
      return embeddedResources.shanghaiStamp;
    } else if (stampType === 'hongkong') {
      return embeddedResources.hongkongStamp;
    }
    return '';
  }
}; 