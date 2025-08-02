import jsPDF, { ImageProperties } from 'jspdf';
import 'jspdf-autotable';
import { PDFGeneratorData } from '@/types/pdf';
import { getInvoiceTitle } from '@/utils/pdfHelpers';
import { embeddedResources } from '@/lib/embedded-resources';
import { getOptimizedStampImage } from './pdfHelpers';
import { addChineseFontsToPDF } from '@/utils/fontLoader';

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
function getHeaderImageBase64(headerType: string): string {
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

// 函数重载签名
export async function generateInvoicePDF(data: PDFGeneratorData, preview: true): Promise<string>;
export async function generateInvoicePDF(data: PDFGeneratorData, preview?: false): Promise<void>;

// 生成发票PDF - 实现
export async function generateInvoicePDF(data: PDFGeneratorData, preview: boolean = false): Promise<string | void> {
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
    // 添加中文字体
    addChineseFontsToPDF(doc);

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;  // 页面边距
    let startY = margin;  // 初始化起始位置

    // 添加表头
    if (data.templateConfig.headerType !== 'none') {
      try {
        const headerImageBase64 = getHeaderImageBase64(data.templateConfig.headerType);
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
        doc.setFont('NotoSansSC', 'bold');
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
    doc.setFont('NotoSansSC', 'normal');
    
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

    // 根据预览模式返回不同格式
    return preview ? doc.output('bloburl').toString() : saveInvoicePDF(doc, data);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// 处理表头错误的情况
function handleHeaderError(doc: ExtendedJsPDF, data: PDFGeneratorData, margin: number): number {
  doc.setFontSize(14);
  doc.setFont('NotoSansSC', 'bold');
  const title = getInvoiceTitle(data);
  const titleWidth = doc.getTextWidth(title);
  const titleY = margin + 5;
  doc.text(String(title), (doc.internal.pageSize.width - titleWidth) / 2, titleY);
  return titleY + 10;
}

// 处理无表头的情况
function handleNoHeader(doc: ExtendedJsPDF, data: PDFGeneratorData, margin: number): number {
  doc.setFontSize(14);
  doc.setFont('NotoSansSC', 'bold');
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
  
  doc.setFont('NotoSansSC', 'bold');
  
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
  doc.setFont('NotoSansSC', 'bold');
  doc.text('To:', leftMargin, currentY);
  const toTextWidth = doc.getTextWidth('To: ');
  
  if (data.to.trim()) {
    const toLines = doc.splitTextToSize(data.to.trim(), maxTextWidth);
    toLines.forEach((line: string, index: number) => {
      doc.text(String(line), leftMargin + toTextWidth, currentY + (index * 3.5));
    });
    currentY += toLines.length * 3.5;
  }

  // Order No.
  currentY = Math.max(currentY + 2, startY + 10); // 确保最小起始位置
  doc.setFont('NotoSansSC', 'bold');
  doc.text('Order No.:', leftMargin, currentY);
  const orderNoX = leftMargin + doc.getTextWidth('Order No.: ');
  
  if (data.customerPO) {
    const orderLines = doc.splitTextToSize(data.customerPO.trim(), maxTextWidth);
    orderLines.forEach((line: string, index: number) => {
      doc.setTextColor(0, 0, 255); // 设置文字颜色为蓝色
      doc.text(String(line), orderNoX, currentY + (index * 3.5));
      doc.setTextColor(0, 0, 0); // 恢复文字颜色为黑色
    });
    currentY += orderLines.length * 3.5;
  }

  return currentY + 2;
}

// 渲染发票表格
async function renderInvoiceTable(doc: ExtendedJsPDF, data: PDFGeneratorData, startY: number): Promise<{ finalY: number }> {
  const tableHeaders = [
    'No.',
    ...(data.showHsCode ? ['HS Code'] : []),
    'Part Name',
    ...(data.showDescription ? ['Description'] : []),
    'Q\'TY',
    'Unit',
    'Unit Price',
    'Amount'
  ];

  const tableBody = [
    ...data.items.map((item, index) => [
      index + 1,
      ...(data.showHsCode ? [{ content: item.hsCode, styles: item.highlight?.hsCode ? { textColor: [255, 0, 0] } : {} }] : []),
      { content: item.partname, styles: item.highlight?.partname ? { textColor: [255, 0, 0] } : {} },
      ...(data.showDescription ? [{ content: item.description, styles: item.highlight?.description ? { textColor: [255, 0, 0] } : {} }] : []),
      { content: item.quantity || '', styles: item.highlight?.quantity ? { textColor: [255, 0, 0] } : {} },
      { content: item.quantity ? item.unit : '', styles: item.highlight?.unit ? { textColor: [255, 0, 0] } : {} },
      { content: Number(item.unitPrice).toFixed(2), styles: item.highlight?.unitPrice ? { textColor: [255, 0, 0] } : {} },
      { content: Number(item.amount).toFixed(2), styles: item.highlight?.amount ? { textColor: [255, 0, 0] } : {} }
    ]),
    ...(data.otherFees || []).map(fee => [
      {
        content: fee.description,
        colSpan: (data.showHsCode ? 1 : 0) + (data.showDescription ? 1 : 0) + 5,
        styles: { halign: 'center', ...(fee.highlight?.description ? { textColor: [255, 0, 0] } : {}) }
      },
      {
        content: fee.amount.toFixed(2),
        styles: fee.highlight?.amount ? { textColor: [255, 0, 0] } : {}
      }
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
    hsCode: 6,       // HS Code
    partName: 13,    // Part Name
    description: 16, // Description
    qty: 4,          // Q'TY
    unit: 4,         // Unit
    unitPrice: 6,    // Unit Price
    amount: 6        // Amount
  };

  // 计算实际显示的列数
  let visibleColumns = 1; // No.
  if (data.showHsCode) visibleColumns++;
  visibleColumns += 1; // Part Name
  if (data.showDescription) visibleColumns++;
  visibleColumns += 3; // Q'TY + Unit + Unit Price + Amount

  // 计算总权重
  let totalWeight = baseWidths.no;
  if (data.showHsCode) totalWeight += baseWidths.hsCode;
  totalWeight += baseWidths.partName;
  if (data.showDescription) totalWeight += baseWidths.description;
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
  columnStyles[currentColumnIndex] = { 
    halign: 'center', 
    cellWidth: baseWidths.partName * unitWidth 
  };
  currentColumnIndex++;

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

  return columnStyles;
}



// 渲染总金额
function renderTotalAmount(doc: ExtendedJsPDF, data: PDFGeneratorData, finalY: number, pageWidth: number, margin: number): number {
  const itemsTotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const feesTotal = (data.otherFees || []).reduce((sum, fee) => sum + fee.amount, 0);
  const totalAmount = itemsTotal + feesTotal;
  const totalAmountValue = `${data.currency === 'USD' ? '$' : '¥'}${totalAmount.toFixed(2)}`;
  
  const valueX = pageWidth - margin - 5;
  const labelX = valueX - doc.getTextWidth(totalAmountValue) - 28;

  doc.setFont('NotoSansSC', 'bold');
  doc.text('Total Amount:', labelX, finalY + 8);
  doc.text(totalAmountValue, valueX, finalY + 8, { align: 'right' });
  doc.setFont('NotoSansSC', 'normal');

  // 显示大写金额
  doc.setFontSize(8);
  doc.setFont('NotoSansSC', 'bold');
  const amountInWords = `SAY TOTAL ${data.currency === 'USD' ? 'US DOLLARS' : 'CHINESE YUAN'} ${data.amountInWords.dollars}${data.amountInWords.hasDecimals ? ` AND ${data.amountInWords.cents}` : ' ONLY'}`;
  const lines = doc.splitTextToSize(amountInWords, pageWidth - (margin * 2));
  lines.forEach((line: string, index: number) => {
    doc.text(String(line), margin, finalY + 15 + (index * 5));
  });

  return finalY + 15 + (lines.length * 5) + 8;
}

// 渲染银行信息和付款条款
async function renderBankAndPaymentInfo(doc: ExtendedJsPDF, data: PDFGeneratorData, startY: number, pageWidth: number, margin: number): Promise<number> {
  let currentY = startY;

  if (data.showBank) {
    doc.setFont('NotoSansSC', 'bold');
    doc.text('Bank Information:', margin, currentY);
    doc.setFont('NotoSansSC', 'normal');
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
  if (data.showPaymentTerms || data.additionalPaymentTerms || data.showInvoiceReminder) {
    currentY = await renderPaymentTerms(doc, data, currentY, pageWidth, margin);
  }

  return currentY;
}

// 渲染付款条款
async function renderPaymentTerms(doc: ExtendedJsPDF, data: PDFGeneratorData, startY: number, pageWidth: number, margin: number): Promise<number> {
  let currentY = startY;
  const termLeftMargin = 25;
  const maxWidth = pageWidth - termLeftMargin - 15;
  let termCount = 1;

  // 标题使用粗体
  doc.setFont('NotoSansSC', 'bold');
  doc.text('Payment Terms:', margin, currentY);
  currentY += 5;

  // 其他内容使用普通字体
  doc.setFont('NotoSansSC', 'normal');

  if (data.showPaymentTerms && data.paymentDate) {
    const termNumber = `${termCount}.`;
    doc.text(termNumber, 20, currentY);
    
    const term = `Full paid not later than ${data.paymentDate} by telegraphic transfer.`;
    const parts = term.split(data.paymentDate);
    
    if (parts[0]) {
      doc.text(parts[0], termLeftMargin, currentY);
      const firstWidth = doc.getTextWidth(parts[0]);
      
      if (data.paymentDate) {
        doc.setTextColor(255, 0, 0);
        doc.text(data.paymentDate, termLeftMargin + firstWidth, currentY);
        doc.setTextColor(0, 0, 0);
      }
      
      if (parts[1]) {
        const dateWidth = doc.getTextWidth(data.paymentDate || '');
        doc.text(parts[1], termLeftMargin + firstWidth + dateWidth, currentY);
      }
    }
    currentY += 5;
    termCount++;
  }

  if (data.additionalPaymentTerms) {
    const terms = data.additionalPaymentTerms.split('\n').filter(t => t.trim());
    for (const term of terms) {
      if (term) {
        const termNumber = `${termCount}.`;
        doc.text(termNumber, 20, currentY);
        
        const lines = doc.splitTextToSize(term, maxWidth);
        if (lines && lines.length > 0) {
          lines.forEach((line: string, index: number) => {
            if (line) {
              doc.text(line, termLeftMargin, currentY + (index * 5));
            }
          });
          currentY += lines.length * 5;
          termCount++;
        }
      }
    }
  }

  if (data.showInvoiceReminder && data.invoiceNo) {
    const termNumber = `${termCount}.`;
    doc.text(termNumber, 20, currentY);
    
    const reminder = 'Please state our invoice no. "' + data.invoiceNo + '" on your payment documents.';
    const parts = reminder.split('"' + data.invoiceNo + '"');
    
    if (parts[0]) {
      doc.text(parts[0], termLeftMargin, currentY);
      const firstWidth = doc.getTextWidth(parts[0]);
      
      doc.setTextColor(255, 0, 0);
      doc.text('"' + data.invoiceNo + '"', termLeftMargin + firstWidth, currentY);
      doc.setTextColor(0, 0, 0);
      
      if (parts[1]) {
        const invoiceWidth = doc.getTextWidth('"' + data.invoiceNo + '"');
        doc.text(parts[1], termLeftMargin + firstWidth + invoiceWidth, currentY);
      }
    }
    currentY += 5;
  }

  return currentY + 10;
}

// 渲染印章
async function renderStamp(doc: ExtendedJsPDF, data: PDFGeneratorData, startY: number, margin: number): Promise<void> {
  if (data.templateConfig.stampType !== 'none') {
    try {
      // 使用优化的印章图片
      const stampImageBase64 = await getOptimizedStampImage(data.templateConfig.stampType);
      
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
    doc.setFont('NotoSansSC', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
  }
}

// 保存 PDF
function saveInvoicePDF(doc: ExtendedJsPDF, data: PDFGeneratorData): void {
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
  doc.save(`${getInvoiceTitle(data)}-${data.invoiceNo}-${formattedDate}.pdf`);
} 