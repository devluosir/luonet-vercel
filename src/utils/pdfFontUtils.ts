import jsPDF from 'jspdf';

/**
 * 统一字体设置工具 - 确保大小写一致且带兜底
 * 在所有 PDF 生成器中使用，避免 "Unable to look up font label" 错误
 */
export function setCnFont(doc: jsPDF, style: 'normal'|'bold'|'italic'|'bolditalic' = 'normal') {
  const s = (style || 'normal').toLowerCase() as any;
  try {
    doc.setFont('NotoSansSC', s);
  } catch (e) {
    console.warn('[PDF] 中文字体设置失败，回退:', e);
    doc.setFont('helvetica', s === 'bold' ? 'bold' : 'normal');
  }
}

/**
 * 开发期字体注册验证
 */
export function validateFontRegistration(doc: jsPDF, context: string = 'PDF') {
  if (process.env.NODE_ENV === 'development') {
    const fonts = doc.getFontList();
    if (!fonts['NotoSansSC'] || !fonts['NotoSansSC']?.includes('normal')) {
      console.error(`[${context}] NotoSansSC 未在当前 doc 注册完整`, fonts);
    } else {
      console.log(`[${context}] 字体注册验证通过:`, fonts['NotoSansSC']);
    }
  }
}
