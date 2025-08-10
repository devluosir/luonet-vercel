/**
 * 安全字体设置工具 - 彻底消除预览模式字体告警
 */

import jsPDF from 'jspdf';

/**
 * 安全设置字体，根据模式选择最佳策略
 * @param doc jsPDF文档实例
 * @param name 字体名称
 * @param style 字体样式
 * @param mode 模式：preview 强制 Helvetica，export 尝试指定字体
 */
export function safeSetFont(
  doc: jsPDF, 
  name: string, 
  style: string, 
  mode: 'preview' | 'export'
): void {
  // 预览和导出模式都尝试使用指定字体，确保中文正常显示
  try {
    const list = doc.getFontList?.() as Record<string, string[]> | undefined;
    const available = !!list && list[name]?.includes(style);
    
    if (!available) {
      console.warn(`[PDF] font "${name}" (${style}) not available, fallback to helvetica`);
      doc.setFont('helvetica', style === 'bold' ? 'bold' : 'normal');
      return;
    }
    
    doc.setFont(name, style);
  } catch (error) {
    console.warn(`[PDF] Failed to set font "${name}" (${style}):`, error);
    doc.setFont('helvetica', style === 'bold' ? 'bold' : 'normal');
  }
}

/**
 * 安全设置中文字体（常用简化接口）
 * @param doc jsPDF文档实例
 * @param style 字体样式
 * @param mode 模式
 */
export function safeSetCnFont(
  doc: jsPDF, 
  style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal', 
  mode: 'preview' | 'export' = 'export'
): void {
  safeSetFont(doc, 'NotoSansSC', style, mode);
}

/**
 * 获取适合当前模式的字体名称
 * @param mode 模式
 * @param chineseFont 中文字体名称（默认NotoSansSC）
 * @returns 字体名称
 */
export function getFontName(mode: 'preview' | 'export', chineseFont = 'NotoSansSC'): string {
  // 预览和导出模式都使用中文字体，确保中文正常显示
  return chineseFont;
}
