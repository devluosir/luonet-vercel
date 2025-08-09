/**
 * 全局字体注册管理器 - 应用级单例
 * 在应用启动时预注册字体，避免每次PDF生成时重复注册
 */

import jsPDF from 'jspdf';
import { loadFontDataOnce } from './pdfFontRegistry';

// 全局字体预注册状态
let globalFontReady: Promise<{ regB64: string; boldB64: string }> | null = null;
let isGlobalRegistrationComplete = false;

/**
 * 应用启动时预注册字体（全局一次性）
 * 这个函数应该在 App 组件挂载时调用
 */
export async function initializeGlobalFonts(): Promise<void> {
  if (globalFontReady) {
    console.log('[GlobalFont] 字体已经预注册，跳过重复初始化');
    return globalFontReady.then(() => {});
  }

  console.log('[GlobalFont] 开始应用级字体预注册...');
  const startTime = performance.now();

  globalFontReady = (async () => {
    try {
      // 加载并预处理字体数据（只做一次）
      const fontData = await loadFontDataOnce();
      
      isGlobalRegistrationComplete = true;
      const duration = performance.now() - startTime;
      
      console.log(`[GlobalFont] 应用级字体预注册完成: ${duration.toFixed(2)}ms`);
      
      return fontData;
    } catch (error) {
      console.error('[GlobalFont] 应用级字体预注册失败:', error);
      globalFontReady = null; // 重置，允许重试
      throw error;
    }
  })();

  await globalFontReady;
}

/**
 * 快速注册字体到指定 jsPDF 实例
 * 由于字体数据已经全局预加载，这个操作应该很快（<50ms）
 */
export async function fastRegisterFonts(doc: jsPDF): Promise<void> {
  if (!globalFontReady || !isGlobalRegistrationComplete) {
    console.warn('[GlobalFont] 全局字体未就绪，回退到标准注册流程');
    // 回退到标准流程
    const { registerChineseFonts } = await import('./pdfFontRegistry');
    return registerChineseFonts(doc);
  }

  const startTime = performance.now();
  
  try {
    // 使用预加载的字体数据，快速注册到实例
    const { regB64, boldB64 } = await globalFontReady;
    
    // jsPDF实例级注册（应该很快，因为数据已准备好）
    doc.addFileToVFS('NotoSansSC-Regular.ttf', regB64);
    doc.addFileToVFS('NotoSansSC-Bold.ttf', boldB64);
    doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
    doc.addFont('NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');
    
    // 设置默认字体
    doc.setFont('NotoSansSC', 'normal');
    
    const duration = performance.now() - startTime;
    console.log(`[GlobalFont] 快速注册完成: ${duration.toFixed(2)}ms`);
    
  } catch (error) {
    console.error('[GlobalFont] 快速注册失败，回退到标准流程:', error);
    // 回退
    const { registerChineseFonts } = await import('./pdfFontRegistry');
    return registerChineseFonts(doc);
  }
}

/**
 * 检查全局字体是否就绪
 */
export function isGlobalFontReady(): boolean {
  return isGlobalRegistrationComplete;
}

/**
 * 获取全局字体注册状态（用于调试）
 */
export function getGlobalFontStatus(): {
  ready: boolean;
  pending: boolean;
} {
  return {
    ready: isGlobalRegistrationComplete,
    pending: !!globalFontReady && !isGlobalRegistrationComplete
  };
}

/**
 * 重置全局字体状态（用于测试或强制重新初始化）
 */
export function resetGlobalFontState(): void {
  globalFontReady = null;
  isGlobalRegistrationComplete = false;
  console.log('[GlobalFont] 全局字体状态已重置');
}
