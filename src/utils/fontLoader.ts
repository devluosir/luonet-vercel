// 字体加载工具 - 用于PDF生成时按需加载字体
import { embeddedResources } from '@/lib/embedded-resources';

/**
 * 为PDF文档添加中文字体
 * @param doc jsPDF文档实例
 */
export function addChineseFontsToPDF(doc: any) {
  // 添加字体文件到虚拟文件系统
  doc.addFileToVFS('NotoSansSC-Regular.ttf', embeddedResources.notoSansSCRegular);
  doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
  doc.addFileToVFS('NotoSansSC-Bold.ttf', embeddedResources.notoSansSCBold);
  doc.addFont('NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');
  
  // 设置默认字体
  doc.setFont('NotoSansSC', 'normal');
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