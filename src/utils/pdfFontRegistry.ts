import jsPDF from 'jspdf';
import { getChineseFontBase64 } from './fontCache';
import { logFontRegistered, logFontFallback, logPerformance } from './pdfLogger';

// 字体配置
const FONT_NAME = 'NotoSansSC';
const FONT_VERSION = '1.0.0'; // 升级字体时改它，自动失效旧缓存

// 仅用于缓存解码/编码结果（全局一次性）
let fontDataPromise: Promise<{ regB64: string; boldB64: string }> | null = null;

// 记录"已经在这些 jsPDF 实例上注册过"
const registeredDocs = new WeakSet<jsPDF>();

// 字体字节类型
export type FontBytes = { regular: Uint8Array; bold: Uint8Array };

/**
 * 最稳的 Base64 编码：不使用 btoa，不使用 TextDecoder，不会展开大数组
 * @param buf ArrayBuffer 或 Uint8Array
 * @returns base64 字符串
 */
export function bytesToBase64(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const len = u8.length;
  if (len === 0) return '';

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  let i = 0;

  // 主循环：每3字节 -> 4个 base64 字符
  for (; i + 2 < len; i += 3) {
    const n = (u8[i] << 16) | (u8[i + 1] << 8) | u8[i + 2];
    base64 +=
      alphabet[(n >>> 18) & 63] +
      alphabet[(n >>> 12) & 63] +
      alphabet[(n >>> 6) & 63] +
      alphabet[n & 63];
  }

  // 处理尾部 1 或 2 字节
  if (i < len) {
    const a = u8[i];
    const b = i + 1 < len ? u8[i + 1] : 0;
    const n = (a << 16) | (b << 8);

    // 前两位总是有
    base64 += alphabet[(n >>> 18) & 63];
    base64 += alphabet[(n >>> 12) & 63];

    if (i + 1 < len) {
      // 还有第2字节：输出第3个字符，末尾补 '='
      base64 += alphabet[(n >>> 6) & 63];
      base64 += '=';
    } else {
      // 只有1字节：第3、4字符都补 '='
      base64 += '==';
    }
  }

  return base64;
}

/**
 * 一次性加载并编码字体数据
 */
export async function loadFontDataOnce(): Promise<{ regB64: string; boldB64: string }> {
  if (!fontDataPromise) {
    fontDataPromise = (async () => {
      const { regular, bold } = await getChineseFontBase64();
      return {
        regB64: regular,
        boldB64: bold,
      };
    })();
  }
  return fontDataPromise;
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
    console.log(`字体注册监控 [${metric.name}]: ${duration.toFixed(2)}ms`);
    return duration;
  }
};

/**
 * 在指定的 jsPDF 实例上注册字体（幂等：同一 doc 只注册一次）
 * @param doc jsPDF文档实例
 */
export async function registerChineseFonts(doc: jsPDF): Promise<void> {
  if (registeredDocs.has(doc)) {
    console.log('[PDF] 字体已在该 jsPDF 实例注册，跳过');
    return;
  }

  const t0 = performance.now();
  try {
    console.log('[PDF] 开始字体注册(实例级)...');
    
    // 1) 获取预处理的字体数据
    const { regB64, boldB64 } = await loadFontDataOnce();

    // 2) 在当前 doc 实例上注册
    doc.addFileToVFS('NotoSansSC-Regular.ttf', regB64);
    doc.addFileToVFS('NotoSansSC-Bold.ttf', boldB64);
    doc.addFont('NotoSansSC-Regular.ttf', FONT_NAME, 'normal');
    doc.addFont('NotoSansSC-Bold.ttf', FONT_NAME, 'bold');

    // 3) 验证注册结果
    const list = doc.getFontList();
    const styles = list[FONT_NAME] || [];
    
    if (!styles.includes('normal') || !styles.includes('bold')) {
      throw new Error(`字体 ${FONT_NAME} 注册不完整: ${styles.join(', ')}`);
    }

    // 4) 设置默认字体
    doc.setFont(FONT_NAME, 'normal');

    // 5) 标记该实例已注册
    registeredDocs.add(doc);

    const t1 = performance.now();
    logFontRegistered(t1 - t0);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[PDF] 可用字体列表:', list);
    }
    
  } catch (err) {
    console.error('[PDF] 字体注册失败:', err);
    throw err;
  }
}

/**
 * 预热字体数据 - 仅做数据预热（不创建 jsPDF 实例、不向 VFS 写入）
 */
export async function warmupFontRegistration(): Promise<void> {
  try {
    console.log('[PDF] 开始字体数据预热...');
    const t0 = performance.now();
    
    // 仅加载和编码字体数据，不注册到任何实例
    const { regB64, boldB64 } = await loadFontDataOnce();
    
    const t1 = performance.now();
    logPerformance('字体数据预热', t1 - t0, { 
      regSize: `${Math.round(regB64.length/1024)}KB`, 
      boldSize: `${Math.round(boldB64.length/1024)}KB` 
    });
    
  } catch (error) {
    console.error('[PDF] 字体数据预热失败:', error);
    throw error;
  }
}

/**
 * 检查字体是否已在指定实例注册
 */
export function isFontRegistered(doc: jsPDF): boolean {
  return registeredDocs.has(doc);
}

/**
 * 获取字体注册状态
 */
export function getFontRegistrationStatus(): { dataLoaded: boolean; fontVersion: string } {
  return {
    dataLoaded: fontDataPromise !== null,
    fontVersion: FONT_VERSION
  };
}

/**
 * 确保 PDF 实例可用字体（带回退保护）
 * @param doc jsPDF文档实例
 */
export async function ensurePdfFont(doc: jsPDF): Promise<void> {
  try {
    await registerChineseFonts(doc);
    doc.setFont('NotoSansSC', 'normal');
    console.log('[PDF] 中文字体已就绪');
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    logFontFallback(`中文字体注册失败: ${errorMsg}`);
    doc.setFont('helvetica', 'normal'); // 软回退，保证不中断
  }
}
