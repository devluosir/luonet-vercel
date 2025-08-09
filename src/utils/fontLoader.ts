'use client';

import jsPDF from 'jspdf';
import { registerChineseFonts, warmupFontRegistration } from './pdfFontRegistry';
import { getChineseFontBytes } from './fontCache';

// 全局单例Promise，只加载一次
let fontBytesPromise: Promise<{regular: Uint8Array; bold: Uint8Array}> | null = null;
// 预热字体的 single-flight 锁
let inflight: Promise<void> | null = null;

// 获取字体字节（只加载一次）
async function getFontBytesOnce() {
  if (!fontBytesPromise) {
    fontBytesPromise = getChineseFontBytes();
  }
  return fontBytesPromise; // 微秒级返回
}

// 模块级预热函数（带防并发）
export function preloadFonts() {
  if (inflight) return inflight;
  inflight = (async () => {
    console.time('[fontLoader] 预热');
    try {
      const { regular, bold } = await getChineseFontBytes();
      console.log(`[fontLoader] 预热完成: regular ${regular.byteLength} bytes, bold ${bold.byteLength} bytes`);
    } catch (error) {
      console.error('[fontLoader] 预热失败:', error);
      throw error;
    } finally {
      console.timeEnd('[fontLoader] 预热');
    }
  })().finally(() => { inflight = null; });
  return inflight;
}

// 性能监控
const performanceMonitor = {
  start: (name: string) => {
    const startTime = performance.now();
    return { name, startTime };
  },
  end: (metric: { name: string; startTime: number }) => {
    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    console.log(`字体加载监控 [${metric.name}]: ${duration.toFixed(2)}ms`);
    return duration;
  }
};

// 文档级WeakMap缓存，避免重复注册
const fontRegistrationCache = new WeakMap<jsPDF, boolean>();

export async function addChineseFontsToPDF(doc: jsPDF): Promise<void> {
  const totalStart = performanceMonitor.start('字体注册总耗时');
  
  try {
    // 检查是否已注册
    if (fontRegistrationCache.has(doc)) {
      console.log('字体已注册，跳过重复注册');
      return;
    }

    // 使用新的硬化注册器（直接传入doc）
    const fontRegistration = performanceMonitor.start('硬化字体注册');
    await registerChineseFonts(doc);
    performanceMonitor.end(fontRegistration);

    // 标记为已注册
    fontRegistrationCache.set(doc, true);
    
    performanceMonitor.end(totalStart);
  } catch (error) {
    console.error('字体加载失败:', error);
    performanceMonitor.end(totalStart);
    throw error;
  }
}

// 导出字体字节串获取函数（用于测试）
export { getFontBytesOnce };

// 导出预热函数
export { warmupFontRegistration }; 