import jsPDF, { ImageProperties } from 'jspdf';
import 'jspdf-autotable';
import { PDFGeneratorData } from '@/types/pdf';
import { getInvoiceTitle } from '@/utils/pdfHelpers';
import { ensurePdfFont } from '@/utils/pdfFontRegistry';

/**
 * 统一字体设置工具 - 确保大小写一致且带兜底
 */
function setCnFont(doc: jsPDF, style: 'normal'|'bold'|'italic'|'bolditalic' = 'normal') {
  const s = (style || 'normal').toLowerCase() as any;
  try {
    doc.setFont('NotoSansSC', s);
  } catch (e) {
    console.warn('[PDF] 中文字体设置失败，回退:', e);
    doc.setFont('helvetica', s === 'bold' ? 'bold' : 'normal');
  }
}

interface AutoTableOptions {
  startY: number;
  head: string[][];
  body: (string | number | { 
    content: string | number | undefined; 
    colSpan?: number;
    styles?: { 
      halign?: string;
      textColor?: number[];
    }
  } | undefined)[][];
  theme: string;
  styles: {
    fontSize: number;
    cellPadding: number;
    lineColor: number[];
    lineWidth: number;
    textColor: number[];
    font: string;
    valign: string;
  };
  headStyles: {
    fontSize: number;
    fontStyle: string;
    halign: string;
    font: string;
    valign: string;
  };
  footStyles?: {
    fontSize: number;
    fontStyle: string;
    halign: string;
    font: string;
    valign: string;
    lineWidth: number;
    lineColor: number[];
  };
  columnStyles: Record<string, { halign: string; cellWidth: number | string }>;
  margin: { left: number; right: number; bottom?: number; top?: number };
  tableWidth: string;
  showFoot?: 'everyPage' | 'lastPage' | 'never';
  didDrawPage?: (data: { 
    table: { 
      body: Array<{ 
        cells: Array<{ 
          styles: { 
            lineWidth: number;
            lineColor: number[];
          } 
        }> 
      }> 
    } 
  }) => void;
  didDrawCell?: (data: { 
    cell: { 
      styles: { 
        lineWidth: number;
        lineColor: number[];
      } 
    };
    row: {
      index: number;
      section: {
        rows: Array<Record<string, unknown>>;
      }
    }
  }) => void;
  didParseCell?: (data: { cell: { styles: { lineWidth: number; lineColor: number[] } } }) => void;
  willDrawCell?: (data: { cell: { styles: { lineWidth: number; lineColor: number[] } } }) => void;
}

interface _AutoTableDoc extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: AutoTableOptions) => void;
}

interface ExtendedJsPDF extends jsPDF {
  getNumberOfPages: () => number;
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: AutoTableOptions) => void;
  getImageProperties: (image: string) => ImageProperties;
}

// 获取表头图片
async function getHeaderImageBase64(headerType: string): Promise<string> {
  const { embeddedResources } = await import('@/lib/embedded-resources');
  switch (headerType) {
    case 'bilingual':
      // 使用双语表头图片
      return embeddedResources.headerImage;
    case 'english':
      // 使用英文表头图片
      return embeddedResources.headerEnglish;
    default:
      return embeddedResources.headerImage;
  }
}

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

// 函数重载签名
export async function generateInvoicePDF(data: PDFGeneratorData): Promise<Blob>;

// 生成发票PDF - 实现
export async function generateInvoicePDF(data: PDFGeneratorData): Promise<Blob> {
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
    let startY = margin;  // 初始化起始位置

    // 添加表头
    if (data.templateConfig.headerType !== 'none') {
      try {
        const headerImageBase64 = await getHeaderImageBase64(data.templateConfig.headerType);
        const headerImage = `data:image/png;base64,${headerImageBase64}`;
        const imgProperties = doc.getImageProperties(headerImage);
        const imgWidth = pageWidth - 30;  // 左右各留15mm
        const imgHeight = (imgProperties.height * imgWidth) / imgProperties.width;
        doc.addImage(
          headerImage,
          'PNG',
          15,  // 左边距15mm
          15,  // 上边距15mm
          imgWidth,
          imgHeight,
          undefined,
          'FAST'  // 使用快速压缩
        );
        doc.setFontSize(14);
        setCnFont(doc, 'bold');
        const title = getInvoiceTitle(data);
        const titleWidth = doc.getTextWidth(title);
        const titleY = margin + imgHeight + 5;  // 标题Y坐标
        doc.text(String(title), (pageWidth - titleWidth) / 2, titleY);
        startY = titleY + 10;
      } catch (error) {
        console.error('Error processing header:', error);
        startY = handleHeaderError(doc, data, margin);
      }
    } else {
      startY = handleNoHeader(doc, data, margin);
    }

    // 设置字体和样式
    doc.setFontSize(8);
    setCnFont(doc, 'normal');
    
    // 客户信息区域
    startY = await renderCustomerInfo(doc, data, startY, pageWidth);

    // 表格区域
    const tableResult = await renderInvoiceTable(doc, data, startY);
    let finalY = tableResult.finalY;

    // 总金额区域
    finalY = renderTotalAmount(doc, data, finalY, pageWidth, margin);

    // 银行信息和付款条款
    finalY = await renderBankAndPaymentInfo(doc, data, finalY, pageWidth, margin);

    // 添加印章
    await renderStamp(doc, data, finalY, margin);

    // 添加页码
    addPageNumbers(doc, pageWidth, pageHeight, margin);

    // 统一返回 blob 对象，让调用方处理下载
    return doc.output('blob');

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// 处理表头错误的情况
function handleHeaderError(doc: ExtendedJsPDF, data: PDFGeneratorData, margin: number): number {
  doc.setFontSize(14);
  setCnFont(doc, 'bold');
  const title = getInvoiceTitle(data);
  const titleWidth = doc.getTextWidth(title);
  const titleY = margin + 5;
  doc.text(String(title), (doc.internal.pageSize.width - titleWidth) / 2, titleY);
  return titleY + 10;
}

// 处理无表头的情况
function handleNoHeader(doc: ExtendedJsPDF, data: PDFGeneratorData, margin: number): number {
  doc.setFontSize(14);
  setCnFont(doc, 'bold');
  const title = getInvoiceTitle(data);
  const titleWidth = doc.getTextWidth(title);
  const titleY = margin + 5;
  doc.text(String(title), (doc.internal.pageSize.width - titleWidth) / 2, titleY);
  return titleY + 10;
}

// 渲染客户信息
async function renderCustomerInfo(doc: ExtendedJsPDF, data: PDFGeneratorData, startY: number, pageWidth: number): Promise<number> {
  const leftMargin = 20;
  const maxTextWidth = pageWidth - leftMargin - 80;
  let currentY = startY;

  // 右上角信息区域
  const rightMargin = pageWidth - 25;  // 增加右边距，向左移动
  const rightInfoY = startY;
  const colonX = rightMargin - 15;  // 冒号的固定位置
  
  setCnFont(doc, 'bold');
  
  // Invoice No.
  doc.text('Invoice No.', colonX - 2, rightInfoY, { align: 'right' });
  doc.text(':', colonX, rightInfoY);
  doc.setTextColor(255, 0, 0); // 设置文字颜色为红色
  doc.text(data.invoiceNo || '', colonX + 3, rightInfoY);
  doc.setTextColor(0, 0, 0); // 恢复文字颜色为黑色

  // Date
  doc.text('Date', colonX - 2, rightInfoY + 5, { align: 'right' });
  doc.text(':', colonX, rightInfoY + 5);
  doc.text(data.date || '', colonX + 3, rightInfoY + 5);

  // Currency
  doc.text('Currency', colonX - 2, rightInfoY + 10, { align: 'right' });
  doc.text(':', colonX, rightInfoY + 10);
  doc.text(data.currency === 'USD' ? 'USD' : 'CNY', colonX + 3, rightInfoY + 10);

  // To 信息
  setCnFont(doc, 'bold');
  doc.text('To:', leftMargin, currentY);
  const toTextWidth = doc.getTextWidth('To: ');
  
  if (data.to.trim()) {
    const toLines = doc.splitTextToSize(data.to.trim(), maxTextWidth);
    toLines.forEach((line: string, index: number) => {
      doc.text(String(line), leftMargin + toTextWidth, currentY + (index * 4));
    });
    currentY += toLines.length * 4;
  }

  // Order No.
  currentY = Math.max(currentY + 2, startY + 10); // 确保最小起始位置
  setCnFont(doc, 'bold');
  doc.text('Order No.:', leftMargin, currentY);
  const orderNoX = leftMargin + doc.getTextWidth('Order No.: ');
  
  if (data.customerPO) {
    const orderLines = doc.splitTextToSize(data.customerPO.trim(), maxTextWidth);
    orderLines.forEach((line: string, index: number) => {
      doc.setTextColor(0, 0, 255); // 设置文字颜色为蓝色
      doc.text(String(line), orderNoX, currentY + (index * 4));
      doc.setTextColor(0, 0, 0); // 恢复文字颜色为黑色
    });
    currentY += orderLines.length * 4;
  }

  return currentY + 2;
}

// 渲染发票表格
async function renderInvoiceTable(doc: ExtendedJsPDF, data: PDFGeneratorData, startY: number): Promise<{ finalY: number }> {
  const tableHeaders = [
    'No.',
    ...(data.showHsCode ? ['HS Code'] : []),
    ...(data.showPartName ? ['Part Name'] : []),
    ...(data.showDescription ? ['Description'] : []),
    'Q\'TY',
    'Unit',
    'Unit Price',
    'Amount',
    ...(data.showRemarks ? ['Remarks'] : [])
  ];

  const tableBody = [
    ...data.items.map((item, index) => [
      index + 1,
      ...(data.showHsCode ? [{ content: item.hsCode, styles: item.highlight?.hsCode ? { textColor: [255, 0, 0] } : {} }] : []),
      ...(data.showPartName ? [{ content: item.partname, styles: item.highlight?.partname ? { textColor: [255, 0, 0] } : {} }] : []),
      ...(data.showDescription ? [{ content: item.description, styles: item.highlight?.description ? { textColor: [255, 0, 0] } : {} }] : []),
      { content: item.quantity || '', styles: item.highlight?.quantity ? { textColor: [255, 0, 0] } : {} },
      { content: item.quantity ? item.unit : '', styles: item.highlight?.unit ? { textColor: [255, 0, 0] } : {} },
      { content: Number(item.unitPrice).toFixed(2), styles: item.highlight?.unitPrice ? { textColor: [255, 0, 0] } : {} },
      { content: Number(item.amount).toFixed(2), styles: item.highlight?.amount ? { textColor: [255, 0, 0] } : {} },
      ...(data.showRemarks ? [{ content: item.remarks || '', styles: item.highlight?.remarks ? { textColor: [255, 0, 0] } : {} }] : [])
    ]),
    ...(data.otherFees || []).map(fee => [
      {
        content: fee.description,
        colSpan: (data.showHsCode ? 1 : 0) + (data.showPartName ? 1 : 0) + (data.showDescription ? 1 : 0) + 4,
        styles: { halign: 'center', ...(fee.highlight?.description ? { textColor: [255, 0, 0] } : {}) }
      },
      {
        content: fee.amount.toFixed(2),
        styles: fee.highlight?.amount ? { textColor: [255, 0, 0] } : {}
      },
      ...(data.showRemarks ? [{ content: fee.remarks || '', styles: fee.highlight?.remarks ? { textColor: [255, 0, 0] } : {} }] : [])
    ])
  ];

  // 计算表格宽度和边距
  const pageWidth = doc.internal.pageSize.width;
  const tableWidth = pageWidth - 30; // 左右各留15mm边距
  const margin = 15; // 减少边距到15mm

  doc.autoTable({
    startY,
    head: [tableHeaders],
    body: tableBody,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
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
    columnStyles: getColumnStyles(data, tableWidth),
    margin: { left: margin, right: margin, bottom: 20 },
    tableWidth: tableWidth.toString(),
    showFoot: 'lastPage',
    footStyles: {
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      font: 'NotoSansSC',
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [0, 0, 0]
    },
    didDrawCell: (data) => {
      if (data.cell && data.cell.styles) {
        data.cell.styles.lineWidth = 0.1;
        data.cell.styles.lineColor = [0, 0, 0];
      }
    },
    willDrawCell: (data) => {
      if (data.cell && data.cell.styles) {
        data.cell.styles.lineWidth = 0.1;
        data.cell.styles.lineColor = [0, 0, 0];
      }
    }
  });

  return { finalY: doc.lastAutoTable.finalY };
}

// 获取表格列样式
function getColumnStyles(data: PDFGeneratorData, tableWidth: number): Record<string, { halign: string; cellWidth: number }> {
  // 定义各列的相对宽度权重（参考包装清单PDF的设置）
  const baseWidths = {
    no: 3,           // No.
    hsCode: 8,       // HS Code - 增加宽度
    partName: 13,    // Part Name
    description: 16, // Description
    remarks: 12,     // Remarks - 增加宽度
    qty: 4,          // Q'TY
    unit: 4,         // Unit
    unitPrice: 6,    // Unit Price
    amount: 6        // Amount
  };

  // 计算实际显示的列数
  let totalWeight = baseWidths.no;
  if (data.showHsCode) totalWeight += baseWidths.hsCode;
  if (data.showPartName) totalWeight += baseWidths.partName;
  if (data.showDescription) totalWeight += baseWidths.description;
  if (data.showRemarks) totalWeight += baseWidths.remarks;
  totalWeight += baseWidths.qty + baseWidths.unit + baseWidths.unitPrice + baseWidths.amount;

  // 计算单位权重对应的宽度
  const unitWidth = tableWidth / totalWeight;

  // 设置每列的宽度和对齐方式
  const columnStyles: Record<string, { halign: string; cellWidth: number }> = {};
  
  // No. 列
  columnStyles[0] = { 
    halign: 'center', 
    cellWidth: baseWidths.no * unitWidth 
  };

  let currentColumnIndex = 1;

  // HS Code 列
  if (data.showHsCode) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center', 
      cellWidth: baseWidths.hsCode * unitWidth 
    };
    currentColumnIndex++;
  }

  // Part Name 列
  if (data.showPartName) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center', 
      cellWidth: baseWidths.partName * unitWidth 
    };
    currentColumnIndex++;
  }

  // Description 列
  if (data.showDescription) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center', 
      cellWidth: baseWidths.description * unitWidth 
    };
    currentColumnIndex++;
  }

  // Q'TY 列
  columnStyles[currentColumnIndex] = { 
    halign: 'center', 
    cellWidth: baseWidths.qty * unitWidth 
  };
  currentColumnIndex++;

  // Unit 列
  columnStyles[currentColumnIndex] = { 
    halign: 'center', 
    cellWidth: baseWidths.unit * unitWidth 
  };
  currentColumnIndex++;

  // Unit Price 列
  columnStyles[currentColumnIndex] = { 
    halign: 'center', 
    cellWidth: baseWidths.unitPrice * unitWidth 
  };
  currentColumnIndex++;

  // Amount 列
  columnStyles[currentColumnIndex] = { 
    halign: 'center', 
    cellWidth: baseWidths.amount * unitWidth 
  };
  currentColumnIndex++;

  // Remarks 列
  if (data.showRemarks) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center', 
      cellWidth: baseWidths.remarks * unitWidth 
    };
    currentColumnIndex++;
  }

  return columnStyles;
}



// 渲染总金额
function renderTotalAmount(doc: ExtendedJsPDF, data: PDFGeneratorData, finalY: number, pageWidth: number, margin: number): number {
      const itemsTotal = (data.items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  const feesTotal = (data.otherFees || []).reduce((sum, fee) => sum + fee.amount, 0);
  const totalAmount = itemsTotal + feesTotal;
  const totalAmountValue = `${data.currency === 'USD' ? '$' : '¥'}${totalAmount.toFixed(2)}`;
  
  const valueX = pageWidth - margin - 5;
  const labelX = valueX - doc.getTextWidth(totalAmountValue) - 28;

  setCnFont(doc, 'bold');
  doc.text('Total Amount:', labelX, finalY + 8);
  doc.text(totalAmountValue, valueX, finalY + 8, { align: 'right' });
  setCnFont(doc, 'normal');

  let currentY = finalY + 8;

  // 显示定金信息
  if (data.depositPercentage && data.depositPercentage > 0) {
    const depositAmount = data.depositAmount || (data.depositPercentage / 100) * totalAmount;
    const depositValue = `${data.currency === 'USD' ? '$' : '¥'}${depositAmount.toFixed(2)}`;
    const depositLabel = `${data.depositPercentage}% DEPOSIT:`;
    
    const depositValueX = pageWidth - margin - 5;
    const depositLabelX = depositValueX - doc.getTextWidth(depositValue) - 28;

    setCnFont(doc, 'bold');
    doc.text(depositLabel, depositLabelX, currentY + 8);
    doc.text(depositValue, depositValueX, currentY + 8, { align: 'right' });
    setCnFont(doc, 'normal');
    
    currentY += 8;
  }

  // 显示大写金额
  doc.setFontSize(8);
  setCnFont(doc, 'bold');
  
  // 根据是否有定金决定显示哪个金额的大写
  let amountInWords: string;
  if (data.depositPercentage && data.depositPercentage > 0 && data.depositAmount && data.depositAmount > 0) {
    // 显示定金金额的大写
    const { numberToWords } = require('../features/invoice/utils/calculations');
    const depositWords = numberToWords(data.depositAmount);
    amountInWords = `SAY ${data.depositPercentage}% Deposit ${data.currency === 'USD' ? 'US DOLLARS' : 'CHINESE YUAN'} ${depositWords.dollars}${depositWords.hasDecimals ? ` AND ${depositWords.cents}` : ' ONLY'}`;
  } else {
    // 显示总金额的大写
    amountInWords = `SAY TOTAL ${data.currency === 'USD' ? 'US DOLLARS' : 'CHINESE YUAN'} ${data.amountInWords.dollars}${data.amountInWords.hasDecimals ? ` AND ${data.amountInWords.cents}` : ' ONLY'}`;
  }
  
  const lines = doc.splitTextToSize(amountInWords, pageWidth - (margin * 2));
  lines.forEach((line: string, index: number) => {
    doc.text(String(line), margin, currentY + 15 + (index * 5));
  });

  return currentY + 15 + (lines.length * 5) + 8;
}

// 渲染银行信息和付款条款
async function renderBankAndPaymentInfo(doc: ExtendedJsPDF, data: PDFGeneratorData, startY: number, pageWidth: number, margin: number): Promise<number> {
  let currentY = startY;

  if (data.showBank) {
    setCnFont(doc, 'bold');
    doc.text('Bank Information:', margin, currentY);
    setCnFont(doc, 'normal');
    currentY += 5;

    // 硬编码银行信息，与UI保持一致
    const bankInfoLines = [
      'Bank Name: The Hongkong and Shanghai Banking Corporation Limited',
      'Swift Code: HSBCHKHHHKH',
      'Bank Address: Head Office 1 Queen\'s Road Central Hong Kong',
      'A/C No.: 801470337838',
      'Beneficiary: Luo & Company Co., Limited'
    ];

    bankInfoLines.forEach((line, index) => {
      doc.text(String(line), margin, currentY + (index * 5));
    });
    currentY += bankInfoLines.length * 5 + 8;
  }

  // 付款条款
  if (data.showPaymentTerms || 
      (data.additionalPaymentTerms && data.additionalPaymentTerms.trim()) || 
      data.showInvoiceReminder) {
    currentY = await renderPaymentTerms(doc, data, currentY, pageWidth, margin);
  }

  return currentY;
}

// 渲染付款条款
async function renderPaymentTerms(doc: ExtendedJsPDF, data: PDFGeneratorData, startY: number, pageWidth: number, margin: number): Promise<number> {
  let currentY = startY;

  // 计算条款总数
  let totalTerms = 0;
  if (data.showPaymentTerms) totalTerms++;
  if (data.additionalPaymentTerms && data.additionalPaymentTerms.trim()) {
    totalTerms += data.additionalPaymentTerms.trim().split('\n').filter(line => line.trim()).length || 0;
  }
  if (data.showInvoiceReminder) totalTerms++;

  // 根据条款数量决定使用单数还是复数形式
  const titleText = totalTerms === 1 ? 'Payment Term: ' : 'Payment Terms:';
  
    if (totalTerms === 1) {
    // 单条付款条款的情况，标题和内容在同一行
    if (data.additionalPaymentTerms && data.additionalPaymentTerms.trim()) {
      // 显示额外的付款条款
      const additionalTerm = data.additionalPaymentTerms.trim();
      
      // 标题使用粗体
      setCnFont(doc, 'bold');
      doc.text(titleText, margin, currentY);
      
      // 其他内容使用普通字体
      setCnFont(doc, 'normal');
      
      const titleWidth = doc.getTextWidth(titleText);
      const spacing = 5; // 设置合适的间距
      doc.text(additionalTerm, margin + titleWidth + spacing, currentY);
      currentY += 5;
    } else if (data.showPaymentTerms) {
      // 如果有日期，使用日期；否则使用默认文本
      const paymentDate = data.paymentDate && data.paymentDate.trim() ? data.paymentDate : 'TBD';
      const term = `Full payment not later than ${paymentDate} by telegraphic transfer (T/T).`;
      const parts = term.split(paymentDate);
      
      // 标题使用粗体
      setCnFont(doc, 'bold');
      doc.text(titleText, margin, currentY);
      
      // 其他内容使用普通字体
      setCnFont(doc, 'normal');
      
      // 增加标题和内容之间的间距
      const titleWidth = doc.getTextWidth(titleText);
      const spacing = 5; // 设置合适的间距
      
      if (parts[0]) {
        doc.text(parts[0], margin + titleWidth + spacing, currentY);
        const firstWidth = doc.getTextWidth(parts[0]);
        
        // 日期显示为红色
        doc.setTextColor(255, 0, 0);
        doc.text(paymentDate, margin + titleWidth + spacing + firstWidth, currentY);
        doc.setTextColor(0, 0, 0);
        
        if (parts[1]) {
          const dateWidth = doc.getTextWidth(paymentDate);
          doc.text(parts[1], margin + titleWidth + spacing + firstWidth + dateWidth, currentY);
        }
      }
      currentY += 5;
    } else if (data.showInvoiceReminder) {
      // 只有发票号提醒时的布局
      const invoiceNo = data.invoiceNo && data.invoiceNo.trim() ? data.invoiceNo : 'TBD';
      const reminderPrefix = `Please state our invoice no. "`;
      const reminderSuffix = `" on your payment documents.`;
      
      // 标题使用粗体
      setCnFont(doc, 'bold');
      doc.text(titleText, margin, currentY);
      
      // 其他内容使用普通字体
      setCnFont(doc, 'normal');
      
      // 计算各部分的宽度
      const titleWidth = doc.getTextWidth(titleText);
      const spacing = 5; // 设置合适的间距
      const prefixWidth = doc.getTextWidth(reminderPrefix);
      const invoiceNoWidth = doc.getTextWidth(invoiceNo);
      
      // 绘制前缀（黑色）
      doc.text(reminderPrefix, margin + titleWidth + spacing, currentY);
      
      // 绘制发票号（红色）
      doc.setTextColor(255, 0, 0);
      doc.text(invoiceNo, margin + titleWidth + spacing + prefixWidth, currentY);
      
      // 绘制后缀（黑色）
      doc.setTextColor(0, 0, 0);
      doc.text(reminderSuffix, margin + titleWidth + spacing + prefixWidth + invoiceNoWidth, currentY);
      
      currentY += 5;
    }
  } else {
    // 多条付款条款的情况，使用编号列表格式
    // 标题使用粗体
    setCnFont(doc, 'bold');
    doc.text(titleText, margin, currentY);
    currentY += 5;  // 标题和第一条之间的间距
    
    // 其他内容使用普通字体
    setCnFont(doc, 'normal');
    
    const termRightMargin = 15;
    const numberWidth = doc.getTextWidth('1. '); // 获取序号的标准宽度
    const maxWidth = pageWidth - margin - numberWidth - termRightMargin;
    const termSpacing = 5;  // 条款之间的固定间距
    let termIndex = 1;

    // 显示额外的付款条款
    if (data.additionalPaymentTerms && data.additionalPaymentTerms.trim()) {
      const terms = data.additionalPaymentTerms.split('\n').filter(term => term.trim());
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
    if (data.showPaymentTerms) {
      // 绘制条款编号
      doc.text(`${termIndex}.`, margin, currentY);
      
      // 如果有日期，使用日期；否则使用默认文本
      const paymentDate = data.paymentDate && data.paymentDate.trim() ? data.paymentDate : 'TBD';
      const term = `Full payment not later than ${paymentDate} by telegraphic transfer (T/T).`;
      const parts = term.split(paymentDate);
      
      if (parts[0]) {
        // 处理长文本自动换行
        const wrappedText = doc.splitTextToSize(parts[0], maxWidth);
        doc.text(wrappedText[0], margin + numberWidth, currentY);
        
        // 日期显示为红色
        doc.setTextColor(255, 0, 0);
        doc.text(paymentDate, margin + numberWidth + doc.getTextWidth(parts[0]), currentY);
        doc.setTextColor(0, 0, 0);
        
        if (parts[1]) {
          const dateWidth = doc.getTextWidth(paymentDate);
          doc.text(parts[1], margin + numberWidth + doc.getTextWidth(parts[0]) + dateWidth, currentY);
        }
      }
      currentY += termSpacing;
      termIndex++;
    }

    // 显示发票号提醒
    if (data.showInvoiceReminder) {
      const invoiceNo = data.invoiceNo && data.invoiceNo.trim() ? data.invoiceNo : 'TBD';
      const reminderPrefix = `${termIndex}. Please state our invoice no. "`;
      const reminderSuffix = `" on your payment documents.`;
      
      // 计算各部分的宽度
      const prefixWidth = doc.getTextWidth(reminderPrefix);
      const invoiceNoWidth = doc.getTextWidth(invoiceNo);
      
      // 处理长文本自动换行，使用定义好的 maxWidth
      const wrappedPrefix = doc.splitTextToSize(reminderPrefix, maxWidth);
      
      // 绘制前缀（黑色）
      doc.text(wrappedPrefix, margin, currentY);
      
      // 绘制发票号（红色）
      doc.setTextColor(255, 0, 0);
      doc.text(invoiceNo, margin + prefixWidth, currentY);
      
      // 绘制后缀（黑色）
      doc.setTextColor(0, 0, 0);
      doc.text(reminderSuffix, margin + prefixWidth + invoiceNoWidth, currentY);
      
      currentY += 5;
    }
  }

  return currentY + 10;
}

// 渲染印章
async function renderStamp(doc: ExtendedJsPDF, data: PDFGeneratorData, startY: number, margin: number): Promise<void> {
  if (data.templateConfig.stampType !== 'none') {
    try {
      // 使用优化的印章图片
      const stampImageBase64 = await getStampImage(data.templateConfig.stampType);
      
      if (stampImageBase64) {
        const stampImage = `data:image/png;base64,${stampImageBase64}`;
        if (data.templateConfig.stampType === 'shanghai') {
          doc.addImage(stampImage, 'PNG', margin, startY, 40, 40);
        } else {
          doc.addImage(stampImage, 'PNG', margin, startY, 73, 34);
        }
      }
    } catch (error) {
      console.error('Error loading stamp image:', error);
    }
  }
}

// 添加页码
function addPageNumbers(doc: ExtendedJsPDF, pageWidth: number, pageHeight: number, margin: number): void {
  const totalPages = doc.getNumberOfPages();
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    
    doc.setFontSize(8);
    setCnFont(doc, 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
  }
} 