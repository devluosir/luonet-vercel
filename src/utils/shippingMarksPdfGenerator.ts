import jsPDF from 'jspdf';
import { UserOptions } from 'jspdf-autotable';
import { addChineseFontsToPDF } from '@/utils/fontLoader';

// 扩展 jsPDF 类型
interface ExtendedJsPDF extends jsPDF {
  autoTable?: (options: UserOptions) => void;
}

// 生成运输标记PDF
export async function generateShippingMarksPDF(
  shippingMarks: string,
  _preview: boolean = false,
  orientation: 'portrait' | 'landscape' = 'portrait',
  fontSize: number = 12,
  fontStyle: 'normal' | 'bold' = 'bold',
  textColor: string = '#000000'
): Promise<Blob> {
  if (!shippingMarks.trim()) {
    throw new Error('Shipping marks content is required');
  }

  // 创建 PDF 文档
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    floatPrecision: 16
  }) as ExtendedJsPDF;

  try {
    // 添加中文字体
    addChineseFontsToPDF(doc);
    doc.setFont('NotoSansSC', fontStyle);

    // 设置文字颜色
    const hexColor = textColor.replace('#', '');
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);
    doc.setTextColor(r, g, b);

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    let currentY = margin + 10; // 从页面顶部开始，留少量边距

    // 设置字号
    doc.setFontSize(fontSize);
    
    // 处理文本内容，支持换行
    const maxWidth = pageWidth - (margin * 2);
    const lines = shippingMarks.split('\n');
    const lineHeight = fontSize * 0.5 + 2; // 调整行高计算，增加基础间距
    
    for (const line of lines) {
      if (line.trim()) {
        // 如果行太长，自动换行
        const wrappedLines = doc.splitTextToSize(line, maxWidth);
        for (const wrappedLine of wrappedLines) {
          // 检查是否需要新页面
          if (currentY > pageHeight - margin - 10) {
            doc.addPage();
            currentY = margin + 10;
          }
          doc.text(String(wrappedLine), margin, currentY);
          currentY += lineHeight;
        }
      } else {
        // 空行使用稍大的间距
        currentY += lineHeight * 1.2;
      }
    }

    // 统一返回 blob 对象，让调用方处理下载
    return doc.output('blob');

  } catch (error) {
    console.error('Error generating shipping marks PDF:', error);
    throw error;
  }
} 