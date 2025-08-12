import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { QuotationData } from '@/types/quotation';
import { fastRegisterFonts } from './globalFontRegistry';
import { getHeaderImage } from './imageCache';
import { startTimer, endTimer } from './performanceMonitor';
import { safeSetFont, safeSetCnFont, getFontName } from './pdf/ensureFont';
import { getLocalStorageJSON } from '@/utils/safeLocalStorage';

// 使用统一的安全字体工具，原有setCnFont函数已移至 pdf/ensureFont.ts

// 扩展jsPDF类型以支持autotable
interface ExtendedJsPDF extends Omit<jsPDF, 'getFont' | 'getImageProperties'> {
  autoTable: (options: any) => void;
  lastAutoTable: {
    finalY: number;
  };
  getFont: () => { fontName: string; fontStyle: string };
  getNumberOfPages: () => number;
  getImageProperties: (image: string) => { width: number; height: number };
}

export const generateQuotationPDF = async (
  rawData: unknown, 
  mode: 'preview' | 'export' = 'export', 
  descriptionMergeMode: 'auto' | 'manual' = 'auto',
  remarksMergeMode: 'auto' | 'manual' = 'auto',
  manualMergedCells?: {
    description: Array<{
      startRow: number;
      endRow: number;
      content: string;
      isMerged: boolean;
    }>;
    remarks: Array<{
      startRow: number;
      endRow: number;
      content: string;
      isMerged: boolean;
    }>;
  }
): Promise<Blob> => {
  const totalId = startTimer('pdf-generation');
  
  try {
    // 数据验证和准备
    const dataValidationId = startTimer('data-validation');
    if (!rawData || typeof rawData !== 'object') {
      throw new Error('无效的数据格式');
    }
    const data = rawData as QuotationData;
    
    // 读取页面列显示偏好，与页面表格保持一致
    let visibleCols: string[] | undefined;
    if (typeof window !== 'undefined') {
      visibleCols = getLocalStorageJSON('qt.visibleCols', []);
    }
    
    endTimer(dataValidationId, 'data-validation');

    // 创建PDF文档
    const docCreationId = startTimer('doc-creation');
    const doc = new jsPDF() as any;
    endTimer(docCreationId, 'doc-creation');

    // 字体策略：预览和导出都使用中文字体，确保中文正常显示
    const fontLoadingId = startTimer('font-loading');
    try {
      await fastRegisterFonts(doc);
      
      // 验证字体注册是否成功
      const fontList = doc.getFontList();
      const notoSansSC = fontList['NotoSansSC'];
      if (!notoSansSC || !notoSansSC.includes('normal')) {
        console.warn('[PDF] 中文字体注册失败，回退到 Helvetica');
        doc.setFont('helvetica', 'normal');
      } else {
        doc.setFont('NotoSansSC', 'normal');
      }
    } catch (error) {
      console.error('[PDF] 字体注册失败，回退到 Helvetica:', error);
      doc.setFont('helvetica', 'normal');
    }
    endTimer(fontLoadingId, 'font-loading');

    // 验证字体设置
    const fontVerificationId = startTimer('font-verification');
    safeSetCnFont(doc, 'normal', mode);
    endTimer(fontVerificationId, 'font-verification');

    // 设置页面参数
    const pageSetupId = startTimer('page-setup');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    endTimer(pageSetupId, 'page-setup');

    let yPosition = margin;

    // 添加头部图片
    const headerType = data.templateConfig?.headerType || 'bilingual';
    if (headerType !== 'none') {
      const headerLoadingId = startTimer('header-loading');
      try {
        const headerImage = await getHeaderImage(headerType as 'bilingual' | 'english');
        
        // 直接使用base64数据，不创建Image对象避免HTTP请求
        const imgProperties = doc.getImageProperties(headerImage);
        const aspectRatio = imgProperties.width / imgProperties.height;
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
    
    // 处理To字段的多行文本
    const toLines = (data.to || '').split('\n');
    toLines.forEach((line, index) => {
      const lineY = currentY + (index * 4);
      doc.text(line, leftMargin + toTextWidth, lineY);
    });
    currentY += Math.max(toLines.length * 4, 8);

    // Inquiry No. 区域 - 优化间距
    currentY += 3; // To字段与Inquiry No.之间的间距：3mm
    const inquiryLabelWidth = doc.getTextWidth('Inquiry No.: ');
    doc.text('Inquiry No.:', leftMargin, currentY);
    doc.setTextColor(0, 0, 255); // 设置文字颜色为蓝色
    doc.text(data.inquiryNo || '', leftMargin + inquiryLabelWidth, currentY);
    doc.setTextColor(0, 0, 0); // 恢复文字颜色为黑色
    currentY += 5; // Inquiry No.与感谢语之间的间距：5mm
    doc.setFontSize(8);
    safeSetCnFont(doc, 'normal', mode); // 设置为正常体
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
      const tableConfig = generateTableConfig(
        data, 
        doc, 
        yPosition, 
        margin, 
        pageWidth, 
        mode, 
        visibleCols, 
        descriptionMergeMode,
        remarksMergeMode,
        manualMergedCells
      );
      
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