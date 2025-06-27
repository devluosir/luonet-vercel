import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { embeddedResources } from '@/lib/embedded-resources';

// 扩展 jsPDF 类型
interface ExtendedJsPDF extends jsPDF {
  autoTable: (options: any) => void;
}

// 箱单数据接口
interface PackingItem {
  id: number;
  serialNo: string;
  description: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  netWeight: number;
  grossWeight: number;
  packageQty: number;
  dimensions: string;
  unit: string;
}

interface PackingData {
  orderNo: string;
  invoiceNo: string;
  date: string;
  consignee: {
    name: string;
  };
  markingNo: string;
  items: PackingItem[];
  currency: string;
  remarks: string;
  remarkOptions: {
    shipsSpares: boolean;
    customsPurpose: boolean;
  };
  showHsCode: boolean;
  showDimensions: boolean;
  showWeightAndPackage: boolean;
  showPrice: boolean;
  dimensionUnit: string;
  documentType: 'proforma' | 'packing' | 'both';
  templateConfig: {
    headerType: 'none' | 'bilingual' | 'english';
    stampType: 'none' | 'shanghai' | 'hongkong';
  };
}

// 函数重载签名
export async function generatePackingListPDF(data: PackingData, preview: true): Promise<string>;
export async function generatePackingListPDF(data: PackingData, preview?: false): Promise<void>;

// 生成箱单PDF - 实现
export async function generatePackingListPDF(data: PackingData, preview: boolean = false): Promise<string | void> {
  // 创建 PDF 文档
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    floatPrecision: 16
  }) as ExtendedJsPDF;

  try {
    // 添加字体
    doc.addFileToVFS('NotoSansSC-Regular.ttf', embeddedResources.notoSansSCRegular);
    doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
    doc.addFileToVFS('NotoSansSC-Bold.ttf', embeddedResources.notoSansSCBold);
    doc.addFont('NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');
    doc.setFont('NotoSansSC', 'normal');

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    let currentY = margin;

    // 添加表头
    if (data.templateConfig.headerType !== 'none') {
      try {
        const headerImage = `data:image/png;base64,${embeddedResources.headerImage}`;
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
        doc.setFontSize(16);
        doc.setFont('NotoSansSC', 'bold');
        const title = getPackingListTitle(data);
        const titleWidth = doc.getTextWidth(title);
        const titleY = margin + imgHeight + 5;  // 标题Y坐标
        doc.text(title, (pageWidth - titleWidth) / 2, titleY);
        currentY = titleY + 15;
      } catch (error) {
        console.error('Error processing header:', error);
        currentY = handleHeaderError(doc, data, margin, pageWidth);
      }
    } else {
      currentY = handleNoHeader(doc, data, margin, pageWidth);
    }

    // 基本信息区域（包含 SHIP'S SPARES IN TRANSIT）
    currentY = renderBasicInfo(doc, data, currentY, pageWidth, margin);

    // 运输标记
    if (data.markingNo) {
      currentY = renderShippingMarks(doc, data, currentY, pageWidth, margin);
    }

    // 商品表格
    currentY = await renderPackingTable(doc, data, currentY);

    // 备注
    currentY = renderRemarks(doc, data, currentY, pageWidth, margin);

    // 添加印章
    await renderStamp(doc, data, currentY, margin);

    // 添加页码
    addPageNumbers(doc, pageWidth, pageHeight, margin);

    // 根据预览模式返回不同格式
    return preview ? doc.output('bloburl').toString() : savePackingListPDF(doc, data);

  } catch (error) {
    console.error('Error generating packing list PDF:', error);
    throw error;
  }
}

// 获取箱单标题
function getPackingListTitle(data: PackingData): string {
  switch (data.documentType) {
    case 'proforma':
      return 'PROFORMA INVOICE';
    case 'packing':
      return 'PACKING LIST';
    case 'both':
      return 'PROFORMA INVOICE & PACKING LIST';
    default:
      return 'PACKING LIST';
  }
}

// 渲染基本信息
function renderBasicInfo(doc: ExtendedJsPDF, data: PackingData, startY: number, pageWidth: number, margin: number): number {
  let currentY = startY;
  const rightMargin = pageWidth - margin;
  
  // 添加 SHIP'S SPARES IN TRANSIT（如果选中）- 放在Consignee上方
  if (data.remarkOptions.shipsSpares) {
    doc.setFontSize(10);
    doc.setFont('NotoSansSC', 'bold');
    const text = '"SHIP\'S SPARES IN TRANSIT"';
    doc.text(text, margin, currentY - 8);
    // currentY 保持不变，让 Consignee 与右侧同高
  }

  doc.setFontSize(10);
  doc.setFont('NotoSansSC', 'normal');

  // 左侧：收货人信息
  doc.setFont('NotoSansSC', 'bold');
  doc.text('Consignee:', margin, currentY);
  doc.setFont('NotoSansSC', 'normal');
  
  if (data.consignee.name.trim()) {
    const consigneeLines = doc.splitTextToSize(data.consignee.name.trim(), 100);
    consigneeLines.forEach((line: string, index: number) => {
      doc.text(String(line), margin, currentY + 5 + (index * 4));
    });
    currentY += 5 + (consigneeLines.length * 4);
  }

  // 右侧：订单信息
  let rightY = startY;
  const colonX = rightMargin - 15;

  if (data.orderNo) {
    doc.setFontSize(10);
    doc.setFont('NotoSansSC', 'bold');
    doc.text('Order No.', colonX - 2, rightY, { align: 'right' });
    doc.text(':', colonX, rightY);
    doc.setFont('NotoSansSC', 'normal');
    doc.text(data.orderNo, colonX + 3, rightY);
    rightY += 5;
  }

  if (data.invoiceNo) {
    doc.setFont('NotoSansSC', 'bold');
    doc.text('Invoice No.', colonX - 2, rightY, { align: 'right' });
    doc.text(':', colonX, rightY);
    doc.setFont('NotoSansSC', 'normal');
    doc.text(data.invoiceNo, colonX + 3, rightY);
    rightY += 5;
  }

  doc.setFont('NotoSansSC', 'bold');
  doc.text('Date', colonX - 2, rightY, { align: 'right' });
  doc.text(':', colonX, rightY);
  doc.setFont('NotoSansSC', 'normal');
  doc.text(data.date, colonX + 3, rightY);

  return Math.max(currentY + 10, rightY + 10);
}

// 渲染运输标记
function renderShippingMarks(doc: ExtendedJsPDF, data: PackingData, startY: number, pageWidth: number, margin: number): number {
  let currentY = startY;
  
  doc.setFontSize(10);
  doc.setFont('NotoSansSC', 'bold');
  doc.text('Shipping Marks:', margin, currentY);
  currentY += 5;
  
  doc.setFont('NotoSansSC', 'normal');
  const markingLines = doc.splitTextToSize(data.markingNo, pageWidth - (margin * 2));
  markingLines.forEach((line: string, index: number) => {
    doc.text(String(line), margin, currentY + (index * 4));
  });
  
  return currentY + (markingLines.length * 4) + 10;
}

// 渲染商品表格
async function renderPackingTable(doc: ExtendedJsPDF, data: PackingData, startY: number): Promise<number> {
  // 构建表头
  const tableHeaders = [
    'No.',
    'Description',
    ...(data.showHsCode ? ['HS Code'] : []),
    'Qty',
    ...(data.showPrice ? ['Unit Price', 'Amount'] : []),
    ...(data.showWeightAndPackage ? ['Net Weight (kg)', 'Gross Weight (kg)', 'Package Qty'] : []),
    ...(data.showDimensions ? [`Dimensions (${data.dimensionUnit})`] : [])
  ];

  // 构建表格数据
  const tableBody = data.items.map((item, index) => [
    index + 1,
    item.description,
    ...(data.showHsCode ? [item.hsCode] : []),
    item.quantity || '',
    ...(data.showPrice ? [
      item.unitPrice.toFixed(2),
      `${getCurrencySymbol(data.currency)}${item.totalPrice.toFixed(2)}`
    ] : []),
    ...(data.showWeightAndPackage ? [
      item.netWeight.toFixed(2),
      item.grossWeight.toFixed(2),
      item.packageQty || ''
    ] : []),
    ...(data.showDimensions ? [item.dimensions] : [])
  ]);

  // 添加总计行
  if (data.showPrice || data.showWeightAndPackage) {
    const totals = data.items.reduce((acc, item) => ({
      totalPrice: acc.totalPrice + item.totalPrice,
      netWeight: acc.netWeight + item.netWeight,
      grossWeight: acc.grossWeight + item.grossWeight,
      packageQty: acc.packageQty + item.packageQty
    }), { totalPrice: 0, netWeight: 0, grossWeight: 0, packageQty: 0 });

    const totalRow = [
      '',
      'Total:',
      ...(data.showHsCode ? [''] : []),
      '',
      ...(data.showPrice ? [
        '',
        `${getCurrencySymbol(data.currency)}${totals.totalPrice.toFixed(2)}`
      ] : []),
      ...(data.showWeightAndPackage ? [
        totals.netWeight.toFixed(2),
        totals.grossWeight.toFixed(2),
        totals.packageQty.toString()
      ] : []),
      ...(data.showDimensions ? [''] : [])
    ];

    tableBody.push(totalRow);
  }

  // 使用 autoTable 绘制表格
  doc.autoTable({
    startY: startY,
    head: [tableHeaders],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'NotoSansSC'
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 }, // No.
      1: { halign: 'left', cellWidth: 'auto' }, // Description
      ...(data.showPrice ? {
        [getColumnIndex(data, 'unitPrice')]: { halign: 'right' },
        [getColumnIndex(data, 'amount')]: { halign: 'right' }
      } : {}),
      ...(data.showWeightAndPackage ? {
        [getColumnIndex(data, 'netWeight')]: { halign: 'center' },
        [getColumnIndex(data, 'grossWeight')]: { halign: 'center' },
        [getColumnIndex(data, 'packageQty')]: { halign: 'center' }
      } : {})
    },
    margin: { left: 20, right: 20 },
    tableWidth: 'auto'
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

// 获取列索引
function getColumnIndex(data: PackingData, columnType: string): number {
  let index = 2; // No. + Description
  
  if (data.showHsCode) index++;
  index++; // Qty
  
  if (columnType === 'unitPrice' && data.showPrice) return index;
  if (data.showPrice) index += 2; // Unit Price + Amount
  
  if (columnType === 'netWeight' && data.showWeightAndPackage) return index;
  if (columnType === 'grossWeight' && data.showWeightAndPackage) return index + 1;
  if (columnType === 'packageQty' && data.showWeightAndPackage) return index + 2;
  
  return index;
}

// 获取货币符号
function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'CNY': return '¥';
    default: return '$';
  }
}

// 渲染备注
function renderRemarks(doc: ExtendedJsPDF, data: PackingData, startY: number, pageWidth: number, margin: number): number {
  let currentY = startY;
  
  // 检查是否有备注内容
  const hasFixedRemarks = data.remarkOptions.shipsSpares || data.remarkOptions.customsPurpose;
  const hasCustomRemarks = data.remarks.trim();
  
  if (!hasFixedRemarks && !hasCustomRemarks) {
    return currentY;
  }
  
  doc.setFontSize(10);
  doc.setFont('NotoSansSC', 'bold');
  doc.text('Remarks:', margin, currentY);
  currentY += 5;
  
  doc.setFont('NotoSansSC', 'normal');
  
  // 固定备注（SHIP'S SPARES IN TRANSIT 已在标题下方显示，这里不重复）
  if (data.remarkOptions.customsPurpose) {
    doc.text('• FOR CUSTOMS PURPOSE ONLY', margin, currentY);
    currentY += 5;
  }
  
  // 自定义备注
  if (hasCustomRemarks) {
    const remarksLines = doc.splitTextToSize(data.remarks, pageWidth - (margin * 2));
    remarksLines.forEach((line: string, index: number) => {
      doc.text(String(line), margin, currentY + (index * 4));
    });
    currentY += remarksLines.length * 4;
  }
  
  return currentY + 5;
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



// 处理表头错误的情况
function handleHeaderError(doc: ExtendedJsPDF, data: PackingData, margin: number, pageWidth: number): number {
  doc.setFontSize(16);
  doc.setFont('NotoSansSC', 'bold');
  const title = getPackingListTitle(data);
  const titleWidth = doc.getTextWidth(title);
  const titleY = margin + 5;
  doc.text(title, (pageWidth - titleWidth) / 2, titleY);
  return titleY + 15;
}

// 处理无表头的情况
function handleNoHeader(doc: ExtendedJsPDF, data: PackingData, margin: number, pageWidth: number): number {
  doc.setFontSize(16);
  doc.setFont('NotoSansSC', 'bold');
  const title = getPackingListTitle(data);
  const titleWidth = doc.getTextWidth(title);
  const titleY = margin + 5;
  doc.text(title, (pageWidth - titleWidth) / 2, titleY);
  return titleY + 15;
}

// 渲染印章
async function renderStamp(doc: ExtendedJsPDF, data: PackingData, startY: number, margin: number): Promise<void> {
  if (data.templateConfig.stampType !== 'none') {
    try {
      let stampImageBase64 = '';
      if (data.templateConfig.stampType === 'shanghai') {
        stampImageBase64 = embeddedResources.shanghaiStamp;
      } else if (data.templateConfig.stampType === 'hongkong') {
        stampImageBase64 = embeddedResources.hongkongStamp;
      }

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

// 保存 PDF
function savePackingListPDF(doc: ExtendedJsPDF, data: PackingData): void {
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
  const filename = `${getPackingListTitle(data)}-${data.orderNo || data.invoiceNo || 'DRAFT'}-${formattedDate}.pdf`;
  doc.save(filename);
} 