import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { QuotationData } from '@/types/quotation';
import { fastRegisterFonts } from './globalFontRegistry';
import { getHeaderImage } from './imageCache';
import { startTimer, endTimer } from './performanceMonitor';
import { safeSetFont, safeSetCnFont, getFontName } from './pdf/ensureFont';

// 使用统一的安全字体工具，原有setCnFont函数已移至 pdf/ensureFont.ts

// 扩展jsPDF类型以支持autotable
interface ExtendedJsPDF extends jsPDF {
  autoTable: (options: any) => void;
  lastAutoTable: {
    finalY: number;
  };
  getFont: () => { fontName: string; fontStyle: string };
  getNumberOfPages: () => number;
}

export const generateQuotationPDF = async (rawData: unknown, mode: 'preview' | 'export' = 'export'): Promise<Blob> => {
  const totalId = startTimer('pdf-generation');
  
  try {
    // 数据验证和准备
    const dataValidationId = startTimer('data-validation');
    if (!rawData || typeof rawData !== 'object') {
      throw new Error('无效的数据格式');
    }
    const data = rawData as QuotationData;
    endTimer(dataValidationId, 'data-validation');

    // 创建PDF文档
    const docCreationId = startTimer('doc-creation');
    const doc = new jsPDF() as ExtendedJsPDF;
    endTimer(docCreationId, 'doc-creation');

    // 字体策略：预览走Helvetica（零成本），导出走中文字体
    const fontLoadingId = startTimer('font-loading');
    if (mode === 'preview') {
      // 预览模式：使用系统内置字体，零注册成本
      doc.setFont('helvetica', 'normal');
      console.log('[PDF] 预览模式使用Helvetica字体，跳过中文字体注册');
    } else {
      // 导出模式：使用中文字体
      await fastRegisterFonts(doc);
      console.log('[PDF] 导出模式使用中文字体');
    }
    endTimer(fontLoadingId, 'font-loading');

    // 验证字体设置
    const fontVerificationId = startTimer('font-verification');
    safeSetCnFont(doc, 'normal', mode);
    if (process.env.NODE_ENV === 'development') {
      const fontInfo = doc.getFont();
      console.log('当前字体信息:', fontInfo);
    }
    endTimer(fontVerificationId, 'font-verification');

    // 设置页面参数
    const pageSetupId = startTimer('page-setup');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    endTimer(pageSetupId, 'page-setup');

    let yPosition = margin;

    // 添加头部图片
    const headerType = data.templateConfig?.headerType || 'none';
    if (headerType !== 'none') {
      const headerLoadingId = startTimer('header-loading');
      try {
        const headerImage = await getHeaderImage(headerType as 'bilingual' | 'english');
        
        // 计算图片尺寸
        const img = new Image();
        img.src = headerImage;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        
        const aspectRatio = img.width / img.height;
        const maxWidth = contentWidth;
        const maxHeight = 40;
        let imgWidth = maxWidth;
        let imgHeight = imgWidth / aspectRatio;
        
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * aspectRatio;
        }
        
        const xPosition = margin + (contentWidth - imgWidth) / 2;
        doc.addImage(headerImage, 'PNG', xPosition, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
        endTimer(headerLoadingId, 'header-loading');
      } catch (error) {
        console.error('头部图片加载失败，跳过:', error);
        endTimer(headerLoadingId, 'header-loading');
      }
    }

    // 添加标题
    const titleSetupId = startTimer('title-setup');
    doc.setFontSize(14);
    safeSetCnFont(doc, 'bold', mode);
    const title = 'QUOTATION';
    const titleWidth = doc.getTextWidth(title);
    const titleX = margin + (contentWidth - titleWidth) / 2;
    doc.text(title, titleX, yPosition);
    yPosition += 10;
    endTimer(titleSetupId, 'title-setup');

    // 添加客户信息
    const customerInfoId = startTimer('customer-info');
    doc.setFontSize(8);
    safeSetCnFont(doc, 'normal', mode);
    
    let currentY = yPosition;
    const startY = yPosition; // 保存起始Y位置作为基准

    // 右上角信息区域
    const rightMargin = pageWidth - 20;
    const rightInfoY = startY;
    const colonX = rightMargin - 20;  // 冒号的固定位置，向左移5px
    
    safeSetCnFont(doc, 'bold', mode);
    
    // Quotation No.
    doc.text('Quotation No.', colonX - 2, rightInfoY, { align: 'right' });
    doc.text(':', colonX, rightInfoY);
    doc.setTextColor(255, 0, 0); // 设置文字颜色为红色
    doc.text(data.quotationNo || '', colonX + 3, rightInfoY);
    doc.setTextColor(0, 0, 0); // 恢复文字颜色为黑色
    
    // Date
    doc.text('Date', colonX - 2, rightInfoY + 5, { align: 'right' });
    doc.text(':', colonX, rightInfoY + 5);
    doc.text(data.date || '', colonX + 3, rightInfoY + 5);

    // From
    doc.text('From', colonX - 2, rightInfoY + 10, { align: 'right' });
    doc.text(':', colonX, rightInfoY + 10);
    doc.text(data.from || '', colonX + 3, rightInfoY + 10);
    
    // Currency
    doc.text('Currency', colonX - 2, rightInfoY + 15, { align: 'right' });
    doc.text(':', colonX, rightInfoY + 15);
    doc.text(data.currency || '', colonX + 3, rightInfoY + 15);

    // 客户信息区域
    const leftMargin = 20;
    
    // To: 区域
    doc.text('To:', leftMargin, currentY);
    const toTextWidth = doc.getTextWidth('To: ');
    
    // 计算右侧信息区域的起始位置（从右边缘减去合适的宽度）
    const rightColumnWidth = 50; // 右侧信息列的宽度（mm）
    const rightColumnStart = pageWidth - rightColumnWidth - margin;

    // 计算左侧文本的最大宽度（考虑右侧信息区域）
    const maxWidth = rightColumnStart - leftMargin - toTextWidth - 5; // 5mm作为安全间距
    
    // 处理客户信息自动换行
    const toText = data.to?.trim() || '';
    if (toText) {
      const wrappedLines = doc.splitTextToSize(toText, maxWidth);
      wrappedLines.forEach((line: string) => {
        doc.text(line, leftMargin + toTextWidth, currentY);
        currentY += 3.5;
      });
    }

    // Inquiry No. 区域 - 设置固定的起始位置
    currentY = Math.max(currentY + 2, startY + 10);  // 确保最小起始位置
    doc.text('Inquiry No.:', leftMargin, currentY);
    const inquiryNoX = leftMargin + doc.getTextWidth('Inquiry No.: ');
    
    // 处理询价编号自动换行，使用相同的最大宽度
    const inquiryNoText = data.inquiryNo?.trim() || '';
    if (inquiryNoText) {
      const wrappedInquiryNo = doc.splitTextToSize(inquiryNoText, maxWidth);
      wrappedInquiryNo.forEach((line: string, index: number) => {
        // 设置询价编号为蓝色
        doc.setTextColor(0, 0, 255);
        doc.text(line, inquiryNoX, currentY + (index * 3.5));
        // 恢复黑色
        doc.setTextColor(0, 0, 0);
      });
      currentY += (wrappedInquiryNo.length - 1) * 3.5;
    }
    
    // 恢复普通字体
    safeSetCnFont(doc, 'normal', mode);
    
    // 添加感谢语，增加与上方Inquiry No.的间距
    currentY = Math.max(currentY + 8, startY + 20);  // 设置最小起始位置
    doc.setFontSize(8);
    doc.text('Thanks for your inquiry, and our best offer is as follows:', leftMargin, currentY);

    // 确保表格与感谢语有3mm的固定间距
    currentY += 3;
    
    yPosition = currentY;
    endTimer(customerInfoId, 'customer-info');

    // 添加表格
    const tableSetupId = startTimer('table-generation');
    if (data.items && data.items.length > 0) {
      // 使用共享的表格配置
      const { generateTableConfig } = await import('./pdfTableGenerator');
      const tableConfig = generateTableConfig(data, doc, yPosition, margin, pageWidth, mode);
      
      doc.autoTable(tableConfig);
      yPosition = doc.lastAutoTable.finalY + 10;
    }
    endTimer(tableSetupId, 'table-generation');

    // 添加总计
    const totalSetupId = startTimer('total-calculation');
    if (data.items && data.items.length > 0) {
      const itemsTotal = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const feesTotal = (data.otherFees || []).reduce((sum, fee) => sum + (fee.amount || 0), 0);
      const totalAmount = itemsTotal + feesTotal;

      // 显示总金额
      doc.setFontSize(10);
      safeSetCnFont(doc, 'bold', mode);
      const totalAmountLabel = 'Total Amount:';
      const totalAmountValue = `$${totalAmount.toFixed(2)}`;
      const valueX = pageWidth - margin - 5;
      const labelX = valueX - doc.getTextWidth(totalAmountValue) - 28;

      doc.text(totalAmountLabel, labelX, yPosition);
      doc.text(totalAmountValue, valueX, yPosition, { align: 'right' });
      yPosition += 10;
    }
    endTimer(totalSetupId, 'total-calculation');

    // 添加备注
    const notesSetupId = startTimer('notes-setup');
    if (data.notes && data.notes.length > 0) {
      // 检查剩余空间是否足够显示 Notes
      const pageHeight = doc.internal.pageSize.getHeight();
      const remainingSpace = pageHeight - yPosition;
      if (remainingSpace < 40) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(8);
      safeSetCnFont(doc, 'bold', mode);
      doc.text('Notes:', margin, yPosition);
      
      // 设置普通字体用于条款内容
      safeSetCnFont(doc, 'normal', mode);
      
      const numberWidth = doc.getTextWidth('10.'); // 预留序号宽度
      const contentMaxWidth = pageWidth - margin - margin - numberWidth - 5; // 内容最大宽度
      
      // 显示所有有效条款
      data.notes.forEach((note, index) => {
        yPosition += 5;
        // 显示序号
        doc.text(`${index + 1}.`, margin, yPosition);
        
        // 确保note是有效的字符串
        const noteText = typeof note === 'string' ? note.trim() : '';
        if (noteText) {
          // 处理长文本自动换行
          const wrappedText = doc.splitTextToSize(noteText, contentMaxWidth);
          wrappedText.forEach((line: string, lineIndex: number) => {
            const lineY = yPosition + (lineIndex * 4);
            doc.text(line, margin + numberWidth, lineY);
          });
          
          // 更新Y坐标，确保下一条款在当前条款所有行之后
          yPosition += (wrappedText.length - 1) * 4;
        }
      });
    }
    endTimer(notesSetupId, 'notes-setup');

    // 生成PDF
    const pdfGenerationId = startTimer('pdf-blob-generation');
    const pdfBlob = doc.output('blob');
    endTimer(pdfGenerationId, 'pdf-blob-generation');

    endTimer(totalId, 'pdf-generation');
    return pdfBlob;
  } catch (error) {
    console.error('PDF生成失败:', error);
    endTimer(totalId, 'pdf-generation');
    throw error;
  }
}; 