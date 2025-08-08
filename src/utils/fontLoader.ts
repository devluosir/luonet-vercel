import jsPDF from 'jspdf';

// 全局单例Promise，只加载一次
let fontBytesPromise: Promise<{regular: string; bold: string}> | null = null;

// 字体版本控制
const FONT_VERSION = '1.0.0';
const CACHE_KEY = `PDF_FONT_v${FONT_VERSION}`;

// 获取字体字节串（只加载一次）
async function getFontBytesOnce() {
  if (!fontBytesPromise) {
    fontBytesPromise = (async () => {
      // 只加载一次，后续内存命中
      const { embeddedResources } = await import('@/lib/embedded-resources');
      return {
        regular: embeddedResources.notoSansSCRegular,
        bold: embeddedResources.notoSansSCBold
      };
    })();
  }
  return fontBytesPromise; // 微秒级返回
}

// 模块级预热函数
export function preloadFonts() {
  getFontBytesOnce().catch(console.error);
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

    // 获取字体字节串
    const fontLoading = performanceMonitor.start('获取字体字节串');
    const fonts = await getFontBytesOnce();
    performanceMonitor.end(fontLoading);

    // 注册字体到PDF
    const fontRegistration = performanceMonitor.start('注册字体到VFS');
    doc.addFileToVFS('NotoSansSC-Regular.ttf', fonts.regular);
    doc.addFileToVFS('NotoSansSC-Bold.ttf', fonts.bold);
    performanceMonitor.end(fontRegistration);

    // 设置字体
    const fontSetting = performanceMonitor.start('设置字体');
    doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
    doc.addFont('NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');
    performanceMonitor.end(fontSetting);

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