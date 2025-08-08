// 字体加载工具 - 用于PDF生成时按需加载字体
import { embeddedResources } from '@/lib/embedded-resources';

// 缓存机制
let cachedFonts: any = null;
let fontsLoading = false;
let fontsLoadPromise: Promise<any> | null = null;

/**
 * 按需加载字体资源
 */
export async function loadFontsOnDemand() {
  // 如果已经有缓存的字体，直接返回
  if (cachedFonts) {
    return cachedFonts;
  }

  // 如果正在加载，返回现有的Promise
  if (fontsLoading && fontsLoadPromise) {
    return fontsLoadPromise;
  }

  // 开始加载字体
  fontsLoading = true;
  fontsLoadPromise = new Promise(async (resolve, reject) => {
    try {
      // 动态导入字体资源
      const { embeddedResources } = await import('@/lib/embedded-resources');
      
      const fonts = {
        notoSansSCRegular: embeddedResources.notoSansSCRegular,
        notoSansSCBold: embeddedResources.notoSansSCBold
      };
      
      // 缓存字体资源
      cachedFonts = fonts;
      resolve(fonts);
    } catch (error) {
      console.error('字体加载失败:', error);
      reject(error);
    } finally {
      fontsLoading = false;
    }
  });

  return fontsLoadPromise;
}

/**
 * 为PDF文档添加中文字体
 * @param doc jsPDF文档实例
 */
export async function addChineseFontsToPDF(doc: any) {
  try {
    // 按需加载字体
    const fonts = await loadFontsOnDemand();
    
    // 添加字体文件到虚拟文件系统
    doc.addFileToVFS('NotoSansSC-Regular.ttf', fonts.notoSansSCRegular);
    doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
    doc.addFileToVFS('NotoSansSC-Bold.ttf', fonts.notoSansSCBold);
    doc.addFont('NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');
    
    // 设置默认字体
    doc.setFont('NotoSansSC', 'normal');
  } catch (error) {
    console.error('添加中文字体失败:', error);
    throw error;
  }
}

/**
 * 预热字体资源
 */
export async function preloadFonts() {
  try {
    await loadFontsOnDemand();
    console.log('字体资源预热完成');
  } catch (error) {
    console.error('字体资源预热失败:', error);
  }
}

/**
 * 清除字体缓存
 */
export function clearFontCache() {
  cachedFonts = null;
  fontsLoading = false;
  fontsLoadPromise = null;
  console.log('字体缓存已清除');
}

/**
 * 检查字体是否已加载
 * @param doc jsPDF文档实例
 * @returns 是否已加载字体
 */
export function isChineseFontsLoaded(doc: any): boolean {
  try {
    // 尝试获取字体信息，如果失败说明字体未加载
    const fontInfo = doc.getFont();
    return fontInfo.fontName === 'NotoSansSC';
  } catch {
    return false;
  }
} 