import jsPDF, { ImageProperties } from 'jspdf';
import 'jspdf-autotable';
import { QuotationData } from '@/types/quotation';
import { UserOptions } from 'jspdf-autotable';
import { generateTableConfig } from './pdfTableGenerator';
import { ensureCnFonts } from '@/utils/pdfFonts';
import { ensurePdfFont } from './pdfFontRegistry';
import { getHeaderImage } from './imageLoader';
import { sanitizeQuotation } from './sanitizeQuotation';
import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { safeSetCnFont } from './pdf/ensureFont';

// 扩展jsPDF类型
type ExtendedJsPDF = jsPDF & {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: UserOptions) => void;
  saveGraphicsState: () => jsPDF;
  restoreGraphicsState: () => jsPDF;
  GState: new (options: { opacity: number }) => unknown;
  setGState: (gState: unknown) => void;
  getNumberOfPages: () => number;
  getImageProperties: (image: string) => ImageProperties;
}

// 货币符号映射
const currencySymbols: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  CNY: '¥'
};

// 默认单位列表（需要单复数变化的单位）
const defaultUnits = ['pc', 'set', 'length'];

// 处理单位的单复数
const _getUnitDisplay = (baseUnit: string, quantity: number) => {
  const singularUnit = baseUnit.replace(/s$/, '');
  if (defaultUnits.includes(singularUnit)) {
    return quantity > 1 ? `${singularUnit}s` : singularUnit;
  }
  return baseUnit; // 自定义单位不变化单复数
};

// 获取印章图片的简化版本
async function getStampImage(stampType: string): Promise<string> {
  const { embeddedResources } = await import('@/lib/embedded-resources');
  if (stampType === 'shanghai') {
    return embeddedResources.shanghaiStamp;
  } else if (stampType === 'hongkong') {
    return embeddedResources.hongkongStamp;
  }
  return '';
}

// 生成订单确认PDF
export const generateOrderConfirmationPDF = async (
  data: QuotationData, 
  preview = false, 
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
  },
  savedVisibleCols?: string[] // 🆕 新增：保存时的列显示设置
): Promise<Blob> => {
  // 检查是否在客户端环境
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in client-side environment');
  }

  // 创建 PDF 文档
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    floatPrecision: 16
  }) as ExtendedJsPDF;

  try {
    // 确保字体在当前 doc 实例注册（带回退保护）
    await ensurePdfFont(doc);

    // 开发期自检断言
    if (process.env.NODE_ENV === 'development') {
      const fonts = doc.getFontList();
      if (!fonts['NotoSansSC'] || !fonts['NotoSansSC']?.includes('normal')) {
        console.error('[PDF] NotoSansSC 未在当前 doc 注册完整', fonts);
      } else {
        console.log('[PDF] 字体注册验证通过:', fonts['NotoSansSC']);
      }
    }

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;  // 页面边距
  
  // 分页检查函数
  const checkAndAddPage = (y: number, needed = 20) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      return margin;
    }
    return y;
  };
    let startY = margin;

    // 读取页面列显示偏好，与页面表格保持一致
    let visibleCols: string[] | undefined;
    
    // 🆕 优先使用保存时的列显示设置，如果没有则使用当前的localStorage设置
    if (savedVisibleCols) {
      visibleCols = savedVisibleCols;
    } else {
      try {
        visibleCols = JSON.parse(localStorage.getItem('qt.visibleCols') || 'null');
      } catch (e) {
        console.warn('Failed to read table column preferences:', e);
      }
    }

    // 添加头部图片
    const headerType = data.templateConfig?.headerType || 'bilingual';
    if (headerType !== 'none') {
      try {
        const headerImage = await getHeaderImage(headerType as 'bilingual' | 'english');
        
        // 使用jsPDF的getImageProperties方法获取图片尺寸，避免创建Image对象
        const imgProperties = doc.getImageProperties(headerImage);
        const aspectRatio = imgProperties.width / imgProperties.height;
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = 40;
        let imgWidth = maxWidth;
        let imgHeight = imgWidth / aspectRatio;
        
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * aspectRatio;
        }
        
        const xPosition = margin + (maxWidth - imgWidth) / 2;
        doc.addImage(headerImage, 'PNG', xPosition, startY, imgWidth, imgHeight);
        startY += imgHeight + 10;
      } catch (error) {
        console.error('头部图片加载失败，跳过:', error);
      }
    }

    // 添加标题
    doc.setFontSize(14);
    safeSetCnFont(doc, 'bold', preview ? 'preview' : 'export');
    const title = 'SALES CONFIRMATION';
    const titleWidth = doc.getTextWidth(title);
    const titleX = margin + (pageWidth - 2 * margin - titleWidth) / 2;
    doc.text(title, titleX, startY);
    startY += 10;

    // 添加客户信息
    doc.setFontSize(8);
    safeSetCnFont(doc, 'normal', preview ? 'preview' : 'export');
    
    let currentY = startY;
    const leftMargin = 20;
    const rightMargin = pageWidth - 20;
    const colonX = rightMargin - 20;  // 冒号的固定位置
    
    // 右上角信息区域
    safeSetCnFont(doc, 'bold', preview ? 'preview' : 'export');
    
    // Contract No.
    doc.text('Contract No.', colonX - 2, currentY, { align: 'right' });
    doc.text(':', colonX, currentY);
    doc.setTextColor(255, 0, 0); // 设置文字颜色为红色
    doc.text(data.contractNo || '', colonX + 3, currentY);
    doc.setTextColor(0, 0, 0); // 恢复文字颜色为黑色
    
    // Date
    doc.text('Date', colonX - 2, currentY + 5, { align: 'right' });
    doc.text(':', colonX, currentY + 5);
    doc.text(data.date || '', colonX + 3, currentY + 5);

    // From
    doc.text('From', colonX - 2, currentY + 10, { align: 'right' });
    doc.text(':', colonX, currentY + 10);
    doc.text(data.from || '', colonX + 3, currentY + 10);
    
    // Currency
    doc.text('Currency', colonX - 2, currentY + 15, { align: 'right' });
    doc.text(':', colonX, currentY + 15);
    doc.text(data.currency || '', colonX + 3, currentY + 15);

    // 客户信息区域
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
    safeSetCnFont(doc, 'normal', preview ? 'preview' : 'export'); // 设置为正常体
    doc.text('Thank you for your order. We confirm the following details:', leftMargin, currentY);

    // 确保表格与感谢语有3mm的固定间距
    currentY += 3;

    // 添加表格
    if (data.items && data.items.length > 0) {
      doc.autoTable(generateTableConfig(
        data, 
        doc, 
        currentY, 
        margin, 
        pageWidth, 
        'export', 
        visibleCols, 
        descriptionMergeMode,
        remarksMergeMode,
        manualMergedCells
      ));
    }

    // 获取表格结束的Y坐标
    const finalY = doc.lastAutoTable.finalY || currentY;
    currentY = finalY + 3; // 减少主表与总额表格之间的间距

    // 检查剩余空间是否足够显示总金额
    const requiredSpace = 20; // 显示总金额所需的最小空间(mm)
    
    // 如果当前页剩余空间不足，添加新页面
    if (pageHeight - currentY < requiredSpace) {
      doc.addPage();
      currentY = margin + 7;
    }

    // 添加总金额、定金和余额信息（使用表格样式，参考发票模块）
    const itemsTotal = (data.items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    const feesTotal = (data.otherFees || []).reduce((sum, fee) => sum + fee.amount, 0);
    const total = itemsTotal + feesTotal;
    
    // 准备表格数据
    const tableData: any[][] = [];
    
    // 添加总金额行
    const totalAmountValue = `${currencySymbols[data.currency]}${total.toFixed(2)}`;
    tableData.push([
      { content: 'Total Amount:', styles: { fontStyle: 'bold', fontSize: 9 } },
      { content: totalAmountValue, styles: { fontStyle: 'bold', fontSize: 9 } }
    ]);
    
    // 添加定金和余额信息
    if (data.depositPercentage && data.depositPercentage > 0 && data.depositAmount && data.depositAmount > 0) {
      const depositAmount = data.depositAmount || (data.depositPercentage / 100) * total;
      const depositValue = `${currencySymbols[data.currency]}${depositAmount.toFixed(2)}`;
      const depositLabel = `${data.depositPercentage}% Deposit:`;
      
      // 根据是否显示余额来决定定金金额的颜色
      const depositColor = data.showBalance ? [0, 0, 0] : [0, 0, 255]; // 显示余额时定金为黑色，否则为蓝色
      
      tableData.push([
        { content: depositLabel, styles: { fontStyle: 'bold', fontSize: 9 } },
        { content: depositValue, styles: { fontStyle: 'bold', fontSize: 9, textColor: depositColor } }
      ]);
      
      if (data.showBalance) {
        const balanceAmount = data.balanceAmount || (total - depositAmount);
        const balanceValue = `${currencySymbols[data.currency]}${balanceAmount.toFixed(2)}`;
        const balanceLabel = `${100 - data.depositPercentage}% Balance:`;
        tableData.push([
          { content: balanceLabel, styles: { fontStyle: 'bold', fontSize: 9 } },
          { content: balanceValue, styles: { fontStyle: 'bold', fontSize: 9, textColor: [0, 0, 255] } }
        ]);
      }
    }
    
    // 计算表格宽度和位置
    const tableWidth = 58; // 表格宽度58mm
    const tableX = pageWidth - margin - tableWidth; // 右对齐
    
    // 使用autoTable创建摘要表格
    doc.autoTable({
      startY: currentY + 2, // 减少间距，让总额表格更靠近主表
      head: [], // 无表头
      body: tableData,
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: 2, // 与主表格保持一致
        lineColor: [255, 255, 255], // 白色线条，相当于隐藏
        lineWidth: 0, // 线条宽度设为0
        textColor: [0, 0, 0],
        font: 'NotoSansSC',
        valign: 'middle'
      },
      headStyles: {
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        font: 'NotoSansSC',
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'right', cellWidth: 30 }, // 标签列居右对齐，宽度30mm
        1: { halign: 'left', cellWidth: 28 } // 金额列居左对齐，宽度28mm
      },
      margin: { left: tableX, right: margin },
      tableWidth: tableWidth,
      showFoot: 'never',
      didDrawCell: (data: any) => {
        // 隐藏单元格边框
        if (data.cell && data.cell.styles) {
          data.cell.styles.lineWidth = 0;
          data.cell.styles.lineColor = [255, 255, 255]; // 白色，相当于隐藏
        }
        
        // 为每个单元格添加下划线
        if (data.cell && data.cell.x && data.cell.y && data.cell.width) {
          const cellX = data.cell.x;
          const cellY = data.cell.y;
          const cellWidth = data.cell.width;
          const cellHeight = data.cell.height || 8; // 默认高度8mm
          
          // 在单元格底部绘制下划线
          doc.setDrawColor(0, 0, 0); // 黑色
          doc.setLineWidth(0.1); // 线条宽度0.1mm
          doc.line(cellX, cellY + cellHeight - 1, cellX + cellWidth, cellY + cellHeight - 1);
        }
      },
      willDrawCell: (data: any) => {
        // 隐藏单元格边框
        if (data.cell && data.cell.styles) {
          data.cell.styles.lineWidth = 0;
          data.cell.styles.lineColor = [255, 255, 255]; // 白色，相当于隐藏
        }
      }
    });
    
    currentY = doc.lastAutoTable.finalY + 2;

    // 显示大写金额 - 根据内容类型优化间距
    // 根据是否有定金/尾款调整间距
    if (data.depositPercentage && data.depositPercentage > 0 && data.depositAmount && data.depositAmount > 0) {
      if (data.showBalance) {
        currentY += 4; // 有尾款时，减少间距
      } else {
        currentY += 4; // 只有定金时，减少间距
      }
    } else {
      currentY += 4; // 无定金时，保持原有间距
    }
    
    doc.setFontSize(8);
    safeSetCnFont(doc, 'bold', preview ? 'preview' : 'export');
    
    // 根据是否有定金决定显示哪个金额的大写
    let amountInWords: string;
    if (data.depositPercentage && data.depositPercentage > 0 && data.depositAmount && data.depositAmount > 0) {
      const { numberToWords } = require('../features/invoice/utils/calculations');
      
      if (data.showBalance) {
        // 显示尾款金额的大写
        const balanceAmount = data.balanceAmount || (total - data.depositAmount);
        const balanceWords = numberToWords(balanceAmount);
        amountInWords = `SAY ${100 - data.depositPercentage}% Balance ${data.currency === 'USD' ? 'US DOLLARS' : data.currency === 'EUR' ? 'EUROS' : 'CHINESE YUAN'} ${balanceWords.dollars}${balanceWords.hasDecimals ? ` AND ${balanceWords.cents}` : ' ONLY'}`;
      } else {
        // 显示定金金额的大写
        const depositWords = numberToWords(data.depositAmount);
        amountInWords = `SAY ${data.depositPercentage}% Deposit ${data.currency === 'USD' ? 'US DOLLARS' : data.currency === 'EUR' ? 'EUROS' : 'CHINESE YUAN'} ${depositWords.dollars}${depositWords.hasDecimals ? ` AND ${depositWords.cents}` : ' ONLY'}`;
      }
    } else {
      // 显示总金额的大写
      amountInWords = `SAY TOTAL ${data.currency === 'USD' ? 'US DOLLARS' : data.currency === 'EUR' ? 'EUROS' : 'CHINESE YUAN'} ${data.amountInWords.dollars}${data.amountInWords.hasDecimals ? ` AND ${data.amountInWords.cents}` : ' ONLY'}`;
    }
    
    const lines = doc.splitTextToSize(amountInWords, pageWidth - (margin * 2));
    
    // 检查大写金额是否需要换页
    const requiredHeight = lines.length * 5 + 10; // 大写金额所需高度 + 额外间距
    currentY = checkAndAddPage(currentY, requiredHeight);
    
    lines.forEach((line: string, index: number) => {
      doc.text(String(line), margin, currentY + (index * 5));
    });

    // 大写金额后的间距 - 根据后续内容动态调整
    currentY += (lines.length * 5);
    
    // 检查是否有其他内容（银行信息或付款条款）
    const hasBankInfo = data.showBank;
    const hasPaymentTerms = data.showMainPaymentTerm || data.additionalPaymentTerms || data.showInvoiceReminder;
    const hasOtherContent = hasBankInfo || hasPaymentTerms;
    
    // 根据内容类型调整间距
    if (hasBankInfo) {
      currentY += 5; // 有银行信息时减少间距
    } else if (hasPaymentTerms) {
      currentY += 5; // 只有付款条款时使用较小间距
    } else {
      currentY += 5; // 只有Notes时使用较小间距
    }

    // 计算印章尺寸
    const stampWidth = 73;  // 香港印章宽度：73mm
    const stampHeight = 34; // 香港印章高度：34mm
    const stampX = pageWidth - stampWidth - margin - 10;  // 靠右对齐，留出10mm右边距

    // 检查Notes和其他内容是否会导致印章单独出现在下一页
    const validNotes = data.notes?.filter(note => note.trim() !== '') || [];
    const estimatedLineHeight = 5; // 每行文本的估计高度
    
    // 更准确地估算Notes所需高度
    let notesHeight = 0;
    if (validNotes.length > 0) {
      notesHeight = 13; // Notes标题的高度
      validNotes.forEach(note => {
        const wrappedText = doc.splitTextToSize(note, pageWidth - (margin * 2) - doc.getTextWidth('1. '));
        notesHeight += wrappedText.length * estimatedLineHeight;
      });
    }

    // 更准确地估算银行信息高度
    const bankInfoHeight = data.showBank ? 45 : 0; // 考虑到标题和5行信息

    // 更准确地估算付款条款高度
    let paymentTermsHeight = 0;
    if (data.showMainPaymentTerm || data.additionalPaymentTerms || data.showInvoiceReminder) {
      paymentTermsHeight = 10; // 标题高度
      if (data.showMainPaymentTerm) {
        paymentTermsHeight += estimatedLineHeight;
      }
      if (data.additionalPaymentTerms) {
        const terms = data.additionalPaymentTerms?.split('\n').filter(term => term?.trim()) || [];
        terms.forEach(term => {
          const wrappedText = doc.splitTextToSize(term, pageWidth - (margin * 2) - doc.getTextWidth('1. '));
          paymentTermsHeight += wrappedText.length * estimatedLineHeight;
        });
      }
      if (data.showInvoiceReminder) {
        paymentTermsHeight += estimatedLineHeight;
      }
    }

    const totalContentHeight = notesHeight + bankInfoHeight + paymentTermsHeight + 15; // 添加15mm作为内容间距
    
    // 检查当前页剩余空间
    const remainingSpace = pageHeight - currentY;
    const stampWithContentHeight = stampHeight + 10; // 印章高度加上10mm边距
    
    // 如果剩余空间不足以容纳所有内容和印章，但足够容纳内容，则先添加内容
    const contentFitsCurrentPage = remainingSpace >= totalContentHeight;
    const stampNeedsNewPage = remainingSpace < (totalContentHeight + stampWithContentHeight);
    
    // 如果内容可以放在当前页，但加上印章后空间不够，则印章需要放到下一页
    const stampWillBeAlone = contentFitsCurrentPage && stampNeedsNewPage;

    // 如果印章会单独出现在下一页，则先放置印章
    if (data.showStamp && stampWillBeAlone) {
      try {
        // 使用优化的印章图片
        const stampImageBase64 = await getStampImage('hongkong');
        const stampImage = `data:image/png;base64,${stampImageBase64}`;
        const imgProperties = doc.getImageProperties(stampImage);
        if (!imgProperties) {
          throw new Error('Failed to load stamp image');
        }

        // 设置印章透明度为0.9
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.9 }));
        
        // 在总金额下方添加印章
        doc.addImage(
          stampImage,
          'PNG',
          stampX,
          currentY - 10, // 稍微上移一点，与总金额更紧凑
          stampWidth,
          stampHeight
        );

        // 恢复透明度
        doc.restoreGraphicsState();

      } catch (error) {
        console.error('Error loading stamp:', error);
      }
    }

    // 检查 Notes 部分是否需要新页面
    if (remainingSpace < 40) {
      doc.addPage();
      currentY = 20; // 在新页面上重置Y坐标
    }

    // 添加备注
    if (validNotes.length > 0) {
      // 根据是否有其他内容调整Notes开始时的间距
      if (hasBankInfo) {
        currentY += 0; // 有银行信息时减少间距
      } else if (hasPaymentTerms) {
        currentY += 0; // 只有付款条款时不增加额外间距
      } else {
        currentY += 0; // 只有Notes时不增加额外间距
      }
      doc.setFontSize(9);
      doc.setFont('NotoSansSC', 'bold');
      doc.text('Notes:', leftMargin, currentY);
      currentY += 5;
      
      doc.setFont('NotoSansSC', 'normal');
      // 使用页面宽度减去左右边距作为 Notes 的最大宽度
      const notesMaxWidth = pageWidth - (margin * 2);
      
      // 过滤掉空行，并重新计算序号
      const validNotes = data.notes?.filter(line => line?.trim() !== '') || [];
      
      validNotes.forEach((line: string, index: number) => {
        // 添加编号
        const numberText = `${index + 1}. `;
        const numberWidth = doc.getTextWidth(numberText);
        doc.text(numberText, leftMargin, currentY);
        
        // 处理长文本自动换行，考虑编号的宽度
        const wrappedText = doc.splitTextToSize(line, notesMaxWidth - numberWidth);
        wrappedText.forEach((textLine: string, lineIndex: number) => {
          doc.text(textLine, leftMargin + numberWidth, currentY + (lineIndex * 5));
        });
        
        // 更新Y坐标到最后一行之后
        currentY += wrappedText.length * 5;
      });
    }

    // 添加银行信息
    if (data.showBank) {
      // 检查剩余空间是否足够显示银行信息
      const remainingSpace = pageHeight - currentY;
      if (remainingSpace < 40) {
        doc.addPage();
        currentY = 20;
      }

      currentY += 5; // 减少银行信息标题前的间距
      doc.setFontSize(9);
      doc.setFont('NotoSansSC', 'bold');
      doc.text('Bank Information:', leftMargin, currentY);
      currentY += 5;
      
      const bankInfo = [
        { label: 'Bank Name:', value: 'The Hongkong and Shanghai Banking Corporation Limited' },
        { label: 'Swift code:', value: 'HSBCHKHHHKH' },
        { label: 'Bank address:', value: 'Head Office 1 Queen\'s Road Central Hong Kong' },
        { label: 'A/C No.:', value: '801470337838' },
        { label: 'Beneficiary:', value: 'Luo & Company Co., Limited' }
      ];

      bankInfo.forEach(info => {
        doc.setFont('NotoSansSC', 'bold');
        doc.text(info.label, leftMargin, currentY);
        doc.setFont('NotoSansSC', 'normal');
        doc.text(info.value, leftMargin + doc.getTextWidth(info.label) + 2, currentY);
        currentY += 5;
      });
      currentY += 3; // 增加银行信息与付款条款之间的间距
    }

    // 添加付款条款
    if (data.showMainPaymentTerm || data.additionalPaymentTerms || data.showInvoiceReminder) {
      // 检查剩余空间，如果不足则添加新页面
      if (pageHeight - currentY < 40) {
        doc.addPage();
        currentY = margin;
      }

      // 计算条款总数
      let totalTerms = 0;
      if (data.showMainPaymentTerm) totalTerms++;
          if (data.additionalPaymentTerms && data.additionalPaymentTerms?.trim()) {
      totalTerms += data.additionalPaymentTerms?.trim().split('\n').filter(line => line?.trim()).length || 0;
      }
      if (data.showInvoiceReminder) totalTerms++;

      currentY += 5;
      doc.setFontSize(9);
      doc.setFont('NotoSansSC', 'bold');

      // 根据条款数量决定使用单数还是复数形式
      const titleText = totalTerms === 1 ? 'Payment Term: ' : 'Payment Terms:';
      doc.text(titleText, margin, currentY);

      doc.setFontSize(8);
      doc.setFont('NotoSansSC', 'normal');
      let termIndex = 1;

      if (totalTerms === 1) {
        // 单条付款条款的情况，使用单行格式
        if (data.additionalPaymentTerms && data.additionalPaymentTerms?.trim()) {
          // 显示额外的付款条款
          const additionalTerm = data.additionalPaymentTerms?.trim() || '';
          const titleWidth = doc.getTextWidth('Payment Term:');
          const spacing = 5; // 设置合适的间距
          doc.text(additionalTerm, margin + titleWidth + spacing, currentY);
          currentY += 5;
        } else if (data.showMainPaymentTerm) {
          // 构建付款方式文本
          const methodMap: Record<string, string> = {
            'T/T': 'telegraphic transfer (T/T)',
            'L/C': 'irrevocable L/C at sight',
            'D/P': 'D/P (Documents against Payment)',
            'D/A': 'D/A (Documents against Acceptance)',
            'Open Account': 'open account'
          };
          const paymentMethodText = methodMap[data.paymentMethod || 'T/T'] || 'telegraphic transfer (T/T)';
          const term1Text = `Full payment not later than ${data.paymentDate} by ${paymentMethodText}.`;
          const term1Parts = term1Text.split(data.paymentDate);
          const firstPartWidth = doc.getTextWidth(term1Parts[0]);
          
          // 增加标题和内容之间的间距
          const titleWidth = doc.getTextWidth('Payment Term:');
          const spacing = 5; // 设置合适的间距
          
          doc.text(term1Parts[0], margin + titleWidth + spacing, currentY);
          
          // 日期显示为红色
          doc.setTextColor(255, 0, 0);
          doc.text(data.paymentDate, margin + titleWidth + spacing + firstPartWidth, currentY);
          
          // 恢复黑色并绘制剩余部分
          doc.setTextColor(0, 0, 0);
          doc.text(term1Parts[1], margin + titleWidth + spacing + firstPartWidth + doc.getTextWidth(data.paymentDate), currentY);
          
          currentY += 5;
        } else if (data.showInvoiceReminder) {
          // 只有合同号提醒时的布局
          const contractNo = data.contractNo && data.contractNo.trim() ? data.contractNo : 'TBD';
          const reminderPrefix = `Please state our contract no. "`;
          const reminderSuffix = `" on your payment documents.`;
          
          // 计算各部分的宽度
          const titleWidth = doc.getTextWidth('Payment Term:');
          const spacing = 5; // 设置合适的间距
          const prefixWidth = doc.getTextWidth(reminderPrefix);
          const contractNoWidth = doc.getTextWidth(contractNo);
          
          // 绘制前缀（黑色）
          doc.text(reminderPrefix, margin + titleWidth + spacing, currentY);
          
          // 绘制合同号（红色）
          doc.setTextColor(255, 0, 0);
          doc.text(contractNo, margin + titleWidth + spacing + prefixWidth, currentY);
          
          // 绘制后缀（黑色）
          doc.setTextColor(0, 0, 0);
          doc.text(reminderSuffix, margin + titleWidth + spacing + prefixWidth + contractNoWidth, currentY);
          
          currentY += 5;
        }
      } else {
        // 多条付款条款的情况，使用编号列表格式
        currentY += 5;  // 标题和第一条之间的间距
        
        const termRightMargin = 15;
        const numberWidth = doc.getTextWidth('1. '); // 获取序号的标准宽度
        const maxWidth = pageWidth - margin - numberWidth - termRightMargin;
        const termSpacing = 5;  // 条款之间的固定间距

        // 显示额外的付款条款
        if (data.additionalPaymentTerms) {
          const terms = data.additionalPaymentTerms?.split('\n').filter(term => term?.trim()) || [];
          terms.forEach(term => {
            const numberText = `${termIndex}. `;
            const numberWidth = doc.getTextWidth(numberText);

            // 添加序号
            doc.text(numberText, margin, currentY);

            // 处理长文本自动换行，使用定义好的 maxWidth
            const wrappedText = doc.splitTextToSize(term, maxWidth - numberWidth);
            wrappedText.forEach((line: string, lineIndex: number) => {
              doc.text(line, margin + numberWidth, currentY + (lineIndex * 5));
            });

            // 更新Y坐标，并增加额外的行间距
            currentY += wrappedText.length * 5;
            termIndex++;
          });
        }

        // 显示标准付款条款
        if (data.showMainPaymentTerm) {
          // 绘制条款编号
          doc.text(`${termIndex}.`, margin, currentY);
          
          // 绘制第一部分文本
          // 构建付款方式文本
          const methodMap: Record<string, string> = {
            'T/T': 'telegraphic transfer (T/T)',
            'L/C': 'irrevocable L/C at sight',
            'D/P': 'D/P (Documents against Payment)',
            'D/A': 'D/A (Documents against Acceptance)',
            'Open Account': 'open account'
          };
          const paymentMethodText = methodMap[data.paymentMethod || 'T/T'] || 'telegraphic transfer (T/T)';
          const term1Text = `Full payment not later than ${data.paymentDate} by ${paymentMethodText}.`;
          const term1Parts = term1Text.split(data.paymentDate);
          const firstPartWidth = doc.getTextWidth(term1Parts[0]);
          
          // 处理长文本自动换行
          const wrappedText = doc.splitTextToSize(term1Parts[0], maxWidth - firstPartWidth);
          doc.text(wrappedText[0], margin + numberWidth, currentY);
          
          // 日期显示为红色
          doc.setTextColor(255, 0, 0);
          doc.text(data.paymentDate, margin + numberWidth + firstPartWidth, currentY);
          
          // 恢复黑色并绘制剩余部分
          doc.setTextColor(0, 0, 0);
          doc.text(term1Parts[1], margin + numberWidth + firstPartWidth + doc.getTextWidth(data.paymentDate), currentY);
          
          currentY += termSpacing;
          termIndex++;
        }

        // 显示合同号提醒
        if (data.showInvoiceReminder) {
          const contractNo = data.contractNo && data.contractNo.trim() ? data.contractNo : 'TBD';
          const reminderPrefix = `${termIndex}. Please state our contract no. "`;
          const reminderSuffix = `" on your payment documents.`;
          
          // 计算各部分的宽度
          const prefixWidth = doc.getTextWidth(reminderPrefix);
          const contractNoWidth = doc.getTextWidth(contractNo);
          
          // 处理长文本自动换行，使用定义好的 maxWidth
          const wrappedPrefix = doc.splitTextToSize(reminderPrefix, maxWidth);
          
          // 绘制前缀（黑色）
          doc.text(wrappedPrefix, margin, currentY);
          
          // 绘制合同号（红色）
          doc.setTextColor(255, 0, 0);
          doc.text(contractNo, margin + prefixWidth, currentY);
          
          // 绘制后缀（黑色）
          doc.setTextColor(0, 0, 0);
          doc.text(reminderSuffix, margin + prefixWidth + contractNoWidth, currentY);
          
          currentY += 5;
        }
      }
    }

    // 添加签名区域 - 仅在印章没有被提前放置时添加
    if (data.showStamp && !stampWillBeAlone) {
      try {
        // 使用优化的印章图片
        const stampImageBase64 = await getStampImage('hongkong');
        const stampImage = `data:image/png;base64,${stampImageBase64}`;
        const imgProperties = doc.getImageProperties(stampImage);
        if (!imgProperties) {
          throw new Error('Failed to load stamp image');
        }

        // 计算页面底部边界和当前页剩余空间
        const pageBottom = doc.internal.pageSize.height - margin;
        const remainingSpace = pageBottom - currentY;
        
        // 如果当前页剩余空间不足以放置印章，且当前页已经有其他内容，则将印章放在上一部分内容的旁边
        if (remainingSpace < stampHeight && currentY > margin + 50) {
          // 找到合适的Y坐标，通常是在总金额附近
          let adjustedY = currentY - stampHeight - 20; // 从当前位置向上偏移
          
          // 确保不会太靠近页面顶部
          adjustedY = Math.max(adjustedY, margin + 50);
          
          // 设置印章透明度为0.9
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.9 }));
          
          doc.addImage(
            stampImage,
            'PNG',
            stampX,
            adjustedY,
            stampWidth,
            stampHeight
          );
          
          // 恢复透明度
          doc.restoreGraphicsState();
        } else {
          // 正常情况下的印章位置处理
          let stampY = currentY + 5;
          
          // 如果印章会超出页面底部，添加新页面
          if (stampY + stampHeight > pageBottom) {
            // 在添加新页面之前，检查当前页是否已经有内容
            if (currentY > margin + 20) {
              // 如果有内容，将印章放在当前页的合适位置
              stampY = Math.max(margin + 50, currentY - stampHeight - 20);
            } else {
              doc.addPage();
              stampY = margin;
              currentY = margin;
            }
          }
          
          // 设置印章透明度为0.9
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.9 }));
          
          doc.addImage(
            stampImage,
            'PNG',
            stampX,
            stampY,
            stampWidth,
            stampHeight
          );
          
          // 恢复透明度
          doc.restoreGraphicsState();
          
          // 更新当前Y坐标
          currentY = stampY + stampHeight + 5;
        }
      } catch (error) {
        console.error('Error loading stamp:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // 如果是预览模式，返回 blob
    if (preview) {
      // 确保所有页面都有页码
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // 清除页面底部区域
        doc.setFillColor(255, 255, 255);
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        
        // 添加页码
        const str = `Page ${i} of ${totalPages}`;
        doc.setFontSize(8);
        doc.setFont('NotoSansSC', 'normal');
        doc.text(str, pageWidth - margin, pageHeight - 12, { align: 'right' });
      }
      return doc.output('blob');
    }
    
    // 确保所有页面都有页码（非预览模式下也需要）
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // 清除页面底部区域
      doc.setFillColor(255, 255, 255);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      
      // 添加页码
      const str = `Page ${i} of ${totalPages}`;
      doc.setFontSize(8);
      doc.setFont('NotoSansSC', 'normal');
      doc.text(str, pageWidth - margin, pageHeight - 12, { align: 'right' });
    }

    // 返回 blob 对象，让调用方处理下载
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}; 