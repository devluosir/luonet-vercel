import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { embeddedResources } from '@/lib/embedded-resources';

// 格式化货币
function formatCurrency(value: number): string {
  return value.toFixed(2);
}

// 格式化数字
function formatNumber(value: number): string {
  return value.toFixed(2);
}

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
  };
}

interface TableRow {
  index: number;
  cells: any[];
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
        // 根据headerType选择对应的表头图片
        const headerImageBase64 = getHeaderImage(data.templateConfig.headerType);

        if (headerImageBase64) {
          const headerImage = `data:image/png;base64,${headerImageBase64}`;
          const imgProperties = (doc as any).getImageProperties(headerImage);
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
          const title = getPackingListTitle(data);
          const titleWidth = doc.getTextWidth(title);
          const titleY = margin + imgHeight + 5;  // 标题Y坐标
          doc.text(title, (pageWidth - titleWidth) / 2, titleY);
          currentY = titleY + 10;
        } else {
          // 如果没有找到对应的表头图片，使用无表头的处理方式
          currentY = handleNoHeader(doc, data, margin, pageWidth);
        }
      } catch (error) {
        console.error('Error processing header:', error);
        currentY = handleHeaderError(doc, data, margin, pageWidth);
      }
    } else {
      currentY = handleNoHeader(doc, data, margin, pageWidth);
    }

    // 基本信息区域（包含 SHIP'S SPARES IN TRANSIT）
    currentY = renderBasicInfo(doc, data, currentY, pageWidth, margin);

    // 运输标记 - 已取消显示
    // if (data.markingNo) {
    //   currentY = renderShippingMarks(doc, data, currentY, pageWidth, margin);
    // }

    // 商品表格 - 紧跟在基本信息后
    currentY = await renderPackingTable(doc, data, currentY);

    // 备注
    currentY = renderRemarks(doc, data, currentY, pageWidth, margin);

    // 添加页码
    addPageNumbers(doc, pageWidth, pageHeight, margin);

    // 根据预览模式返回不同格式
    return preview ? doc.output('bloburl').toString() : savePackingListPDF(doc, data);

  } catch (error) {
    console.error('Error generating packing list PDF:', error);
    throw error;
  }
}

// 获取表头图片
function getHeaderImage(headerType: 'none' | 'bilingual' | 'english'): string {
  switch (headerType) {
    case 'bilingual':
      // 使用双语表头图片
      return embeddedResources.headerImage;
    case 'english':
      // 使用英文表头图片
      return embeddedResources.headerEnglish;
    default:
      return '';
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
  const contentIndent = 5; // 收货人信息的缩进值
  const orderNoIndent = 15; // Order No. 内容的缩进值，设置更大的缩进
  
  // 添加 SHIP'S SPARES IN TRANSIT（如果选中）- 放在Consignee上方
  if (data.remarkOptions.shipsSpares) {
    doc.setFontSize(8);
    doc.setFont('NotoSansSC', 'bold');
    const text = '"SHIP\'S SPARES IN TRANSIT"';
    doc.text(text, margin, currentY);
    currentY += 5; // 项目间距5px
  }

  doc.setFontSize(8);
  doc.setFont('NotoSansSC', 'normal');

  // 左侧：收货人信息
  doc.setFont('NotoSansSC', 'bold');
  doc.text('Consignee:', margin, currentY);
  doc.setFont('NotoSansSC', 'normal');
  
  let leftY = currentY;
  if (data.consignee.name.trim()) {
    const consigneeLines = doc.splitTextToSize(data.consignee.name.trim(), 130);
    consigneeLines.forEach((line: string, index: number) => {
      doc.text(String(line), margin + contentIndent, leftY + 4 + (index * 4)); // 内容行间距4px
    });
    leftY += 4 + (consigneeLines.length * 4) + 5; // 最后加5px作为项目间距
  } else {
    leftY += 15; // 项目间距5px
  }

  // 左侧：Order No.
  doc.setFont('NotoSansSC', 'bold');
  doc.text('Order No.:', margin, leftY);
  doc.setFont('NotoSansSC', 'bold');
  doc.setTextColor(0, 0, 255); // 设置为蓝色
  const orderNoText = data.orderNo || '';
  const orderNoLines = doc.splitTextToSize(orderNoText, 130);
  orderNoLines.forEach((line: string, index: number) => {
    doc.text(String(line), margin + orderNoIndent, leftY + (index * 4)); // 内容行间距4px
  });
  doc.setTextColor(0, 0, 0); // 重置为黑色
  leftY += (orderNoLines.length * 4) + 5; // 最后加5px作为项目间距

  // 右侧：Invoice No. + Date
  let rightY = data.remarkOptions.shipsSpares ? startY + 5 : startY; // 调整右侧起始位置，使用5px间距
  const rightStartX = pageWidth * 0.65;
  const colonX = rightStartX + 30;

  // Invoice No. - 始终显示
  doc.setFont('NotoSansSC', 'bold');
  doc.text('Invoice No.', colonX - 2, rightY, { align: 'right' });
  doc.text(':', colonX, rightY);
  doc.setFont('NotoSansSC', 'bold');
  doc.setTextColor(255, 0, 0); // 设置为红色，与发票一致
  doc.text(data.invoiceNo || '', colonX + 3, rightY);
  doc.setTextColor(0, 0, 0); // 重置为黑色
  rightY += 5; // 项目间距5px

  doc.setFont('NotoSansSC', 'bold');
  doc.text('Date', colonX - 2, rightY, { align: 'right' });
  doc.text(':', colonX, rightY);
  doc.setFont('NotoSansSC', 'normal');
  doc.text(data.date, colonX + 3, rightY);

  // 如果显示价格，则显示币种
  if (data.showPrice) {
    rightY += 5; // 项目间距5px
    doc.setFont('NotoSansSC', 'bold');
    doc.text('Currency', colonX - 2, rightY, { align: 'right' });
    doc.text(':', colonX, rightY);
    doc.setFont('NotoSansSC', 'normal');
    doc.text(data.currency, colonX + 3, rightY);
  }

  return Math.max(leftY, rightY);
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
  
  return currentY + (markingLines.length * 4) + 15;
}

// 定义表格单元格类型
interface TableCell {
  colSpan?: number;
  rowSpan?: number;
  styles?: any;
  text?: string[];
  raw?: any;
}

interface TableData {
  cell: TableCell;
  row: TableRow;
  column: { index: number };
  section: string;
  pageCount?: number;
  cursor?: { y: number };
}

// 获取表格头部
function getTableHeaders(data: PackingData): string[] {
  return [
    'No.',
    'Description',
    ...(data.showHsCode ? ['HS Code'] : []),
    'Qty',
    'Unit',
    ...(data.showPrice ? ['U/Price', 'Amount'] : []),
    ...(data.showWeightAndPackage ? ['N.W.(kg)', 'G.W.(kg)', 'Pkgs'] : []),
    ...(data.showDimensions ? [`Dimensions(${data.dimensionUnit})`] : [])
  ];
}

// 获取表格主体
function getTableBody(data: PackingData): TableRow[] {
  return data.items.map((item, index) => {
    const quantity = item.quantity || 0;
    const baseUnit = item.unit.replace(/s$/, '');
    const unit = defaultUnits.includes(baseUnit as typeof defaultUnits[number]) ? getUnitDisplay(baseUnit, quantity) : item.unit;

    return {
      index,
      cells: [
        index + 1,
        item.description,
        ...(data.showHsCode ? [item.hsCode] : []),
        quantity || '',
        unit,
        ...(data.showPrice ? [
          { content: item.unitPrice.toFixed(2), styles: { halign: 'right' } },
          { content: `${getCurrencySymbol(data.currency)}${item.totalPrice.toFixed(2)}`, styles: { halign: 'right' } }
        ] : []),
        ...(data.showWeightAndPackage ? [
          { content: item.netWeight.toFixed(2), styles: { halign: 'right' } },
          { content: item.grossWeight.toFixed(2), styles: { halign: 'right' } },
          { content: item.packageQty || '', styles: { halign: 'center' } }
        ] : []),
        ...(data.showDimensions ? [item.dimensions] : [])
      ]
    };
  });
}

// 获取表格页脚
function getTableFooter(data: PackingData): any[] {
  const footer: any[] = [];
  
  // 计算总计
  const totals = data.items.reduce((acc, item) => ({
    totalPrice: acc.totalPrice + item.totalPrice,
    netWeight: acc.netWeight + item.netWeight,
    grossWeight: acc.grossWeight + item.grossWeight,
    packageQty: acc.packageQty + item.packageQty
  }), { totalPrice: 0, netWeight: 0, grossWeight: 0, packageQty: 0 });

  // 创建总计行
  const totalRow: any[] = [];

  // 计算要合并的列数（从 No. 到 U/Price）
  let colSpanCount = 2; // 基础列数：No., Description
  if (data.showHsCode) colSpanCount++;
  colSpanCount += 3; // Qty, Unit, U/Price

  // 合并从 No. 到 U/Price 的列显示 Total
  totalRow.push({
    content: 'Total:',
    colSpan: colSpanCount,
    styles: { halign: 'left', fontStyle: 'bold' }
  });

  // Amount 列
  if (data.showPrice) {
    totalRow.push({ 
      content: `${getCurrencySymbol(data.currency)}${formatCurrency(totals.totalPrice)}`,
      styles: { halign: 'right', fontStyle: 'bold' }
    });
  }

  // Weight 和 Package 相关列
  if (data.showWeightAndPackage) {
    totalRow.push({ 
      content: formatNumber(totals.netWeight),
      styles: { halign: 'right', fontStyle: 'bold' }
    });
    totalRow.push({ 
      content: formatNumber(totals.grossWeight),
      styles: { halign: 'right', fontStyle: 'bold' }
    });
    totalRow.push({ 
      content: totals.packageQty,
      styles: { halign: 'center', fontStyle: 'bold' }
    });
  }

  // Dimensions 列
  if (data.showDimensions) {
    totalRow.push({ content: '', styles: { fontStyle: 'bold' } });
  }

  footer.push(totalRow);
  return footer;
}

// 默认单位列表（需要单复数变化的单位）
const defaultUnits = ['pc', 'set', 'length'] as const;

// 处理单位的单复数
function getUnitDisplay(baseUnit: string, quantity: number): string {
  if (defaultUnits.includes(baseUnit as typeof defaultUnits[number])) {
    return quantity > 1 ? `${baseUnit}s` : baseUnit;
  }
  return baseUnit;
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
  const hasCustomRemarks = data.remarks.trim();
  
  // 如果没有任何备注内容，直接返回
  if (!hasCustomRemarks) {
    return currentY;
  }
  
  doc.setFontSize(10);
  doc.setFont('NotoSansSC', 'normal');
  
  // 显示Notes标题和编号
  doc.setFont('NotoSansSC', 'bold');
  doc.text('Notes:', margin, currentY);
  currentY += 5;
  
  doc.setFont('NotoSansSC', 'normal');
  
  // 添加自定义备注（按行分割）
  if (hasCustomRemarks) {
    const customRemarkLines = data.remarks.split('\n').filter(line => line.trim());
    customRemarkLines.forEach((item, index) => {
    const numberedText = `${index + 1}. ${item.trim()}`;
    const itemLines = doc.splitTextToSize(numberedText, pageWidth - (margin * 2));
    itemLines.forEach((line: string, lineIndex: number) => {
      doc.text(String(line), margin, currentY + (lineIndex * 4));
    });
    currentY += itemLines.length * 4 + 2; // 每个项目间增加2mm间距
  });
  }
  
  return currentY + 3;
}

// 添加页码
function addPageNumbers(doc: ExtendedJsPDF, pageWidth: number, pageHeight: number, margin: number): void {
  const totalPages = (doc as any).getNumberOfPages();
  
  for (let i = 1; i <= totalPages; i++) {
    (doc as any).setPage(i);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    
    doc.setFontSize(8);
    doc.setFont('NotoSansSC', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
  }
}

// 处理表头错误的情况
function handleHeaderError(doc: ExtendedJsPDF, data: PackingData, margin: number, pageWidth: number): number {
  doc.setFontSize(14);
  doc.setFont('NotoSansSC', 'bold');
  const title = getPackingListTitle(data);
  const titleWidth = doc.getTextWidth(title);
  const titleY = margin + 5;
  doc.text(title, (pageWidth - titleWidth) / 2, titleY);
  return titleY + 10;
}

// 处理无表头的情况
function handleNoHeader(doc: ExtendedJsPDF, data: PackingData, margin: number, pageWidth: number): number {
  doc.setFontSize(14);
  doc.setFont('NotoSansSC', 'bold');
  const title = getPackingListTitle(data);
  const titleWidth = doc.getTextWidth(title);
  const titleY = margin + 5;
  doc.text(title, (pageWidth - titleWidth) / 2, titleY);
  return titleY + 10;
}

// 保存 PDF
function savePackingListPDF(doc: ExtendedJsPDF, data: PackingData): void {
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
  const filename = `${getPackingListTitle(data)}-${data.orderNo || data.invoiceNo || 'DRAFT'}-${formattedDate}.pdf`;
  doc.save(filename);
}

// 渲染商品表格
async function renderPackingTable(doc: ExtendedJsPDF, data: PackingData, startY: number): Promise<number> {
  // 计算页面宽度和边距
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15; // 左右边距各15mm
  const tableWidth = pageWidth - (margin * 2); // 表格实际可用宽度

  // 设置列宽度和对齐方式
  const columnStyles: Record<string, { halign: string; cellWidth: number }> = {};
  
  // 计算实际显示的列数
  let visibleColumns = 2; // No. + Description
  if (data.showHsCode) visibleColumns++;
  visibleColumns += 2; // Qty + Unit
  if (data.showPrice) visibleColumns += 2;
  if (data.showWeightAndPackage) visibleColumns += 3;
  if (data.showDimensions) visibleColumns++;

  // 定义各列的相对宽度权重
  const baseWidths = {
    no: 3,
    description: data.showHsCode ? 12 : 15,
    hsCode: 6,
    qty: 4,
    unit: 4,
    unitPrice: 5,
    amount: 6,
    netWeight: 5,
    grossWeight: 5,
    pkgs: 4,
    dimensions: 6
  };

  // 计算总权重
  let totalWeight = baseWidths.no + baseWidths.description;
  if (data.showHsCode) totalWeight += baseWidths.hsCode;
  totalWeight += baseWidths.qty + baseWidths.unit;
  if (data.showPrice) totalWeight += baseWidths.unitPrice + baseWidths.amount;
  if (data.showWeightAndPackage) totalWeight += baseWidths.netWeight + baseWidths.grossWeight + baseWidths.pkgs;
  if (data.showDimensions) totalWeight += baseWidths.dimensions;

  // 计算单位权重对应的宽度
  const unitWidth = tableWidth / totalWeight;

  // 设置每列的宽度和对齐方式
  columnStyles[0] = { 
    halign: 'center', 
    cellWidth: baseWidths.no * unitWidth 
  };
  columnStyles[1] = { 
    halign: 'left', 
    cellWidth: baseWidths.description * unitWidth 
  };

  let currentColumnIndex = 2;

  if (data.showHsCode) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center', 
      cellWidth: baseWidths.hsCode * unitWidth 
    };
    currentColumnIndex++;
  }

  // Quantity 和 Unit 列
  columnStyles[currentColumnIndex] = { 
    halign: 'center', 
    cellWidth: baseWidths.qty * unitWidth 
  };
  currentColumnIndex++;
  columnStyles[currentColumnIndex] = { 
    halign: 'center', 
    cellWidth: baseWidths.unit * unitWidth 
  };
  currentColumnIndex++;

  // Price 相关列
  if (data.showPrice) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center', 
      cellWidth: baseWidths.unitPrice * unitWidth 
    };
    currentColumnIndex++;
    columnStyles[currentColumnIndex] = { 
      halign: 'center', 
      cellWidth: baseWidths.amount * unitWidth 
    };
    currentColumnIndex++;
  }

  // Weight 和 Package 相关列
  if (data.showWeightAndPackage) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center', 
      cellWidth: baseWidths.netWeight * unitWidth 
    };
    currentColumnIndex++;
    columnStyles[currentColumnIndex] = { 
      halign: 'center', 
      cellWidth: baseWidths.grossWeight * unitWidth 
    };
    currentColumnIndex++;
    columnStyles[currentColumnIndex] = { 
      halign: 'center', 
      cellWidth: baseWidths.pkgs * unitWidth 
    };
    currentColumnIndex++;
  }

  // Dimensions 列
  if (data.showDimensions) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center', 
      cellWidth: baseWidths.dimensions * unitWidth 
    };
  }

  // 表格基础样式
  const tableStyles = {
    fontSize: 8,
    cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
    lineColor: [0, 0, 0],
    lineWidth: 0.1,
    font: 'NotoSansSC',
    valign: 'middle',
    minCellHeight: 8
  };

  // 表头样式
  const headStyles = {
    fillColor: false,
    textColor: [0, 0, 0],
    fontSize: 8,
    fontStyle: 'bold',
    halign: 'center',
    font: 'NotoSansSC',
    valign: 'middle',
    cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
    minCellHeight: 12 // 增加表头高度以适应换行
  };

  // 准备表头
  const headers = [['No.', 'Description']];
  if (data.showHsCode) headers[0].push('HS Code');
  headers[0].push('Qty', 'Unit');
  if (data.showPrice) headers[0].push('U/Price', 'Amount');
  if (data.showWeightAndPackage) {
    headers[0].push(
      'N.W.\n(kg)',
      'G.W.\n(kg)',
      'Pkgs'
    );
  }
  if (data.showDimensions) {
    headers[0].push(`Dimensions\n(${data.dimensionUnit})`);
  }

  // 准备数据行
  const body = data.items.map(item => {
    const row = [
      item.serialNo,
      item.description
    ];
    
    if (data.showHsCode) row.push(item.hsCode);
    
    row.push(
      item.quantity.toString(),
      item.unit
    );
    
    if (data.showPrice) {
      row.push(
        item.unitPrice.toFixed(2),
        item.totalPrice.toFixed(2)
      );
    }
    
    if (data.showWeightAndPackage) {
      row.push(
        item.netWeight.toFixed(2),
        item.grossWeight.toFixed(2),
        item.packageQty.toString()
      );
    }
    
    if (data.showDimensions) row.push(item.dimensions);
    
    return row;
  });

  // 计算总计行
  const totals = data.items.reduce((acc, item) => ({
    totalPrice: acc.totalPrice + item.totalPrice,
    netWeight: acc.netWeight + item.netWeight,
    grossWeight: acc.grossWeight + item.grossWeight,
    packageQty: acc.packageQty + item.packageQty
  }), { totalPrice: 0, netWeight: 0, grossWeight: 0, packageQty: 0 });

  // 添加总计行
  const totalRow = ['Total:'];

  // 计算需要合并的列数（从No.到Unit列，如果显示U/Price则包含）
  const mergeColCount = 2 + (data.showHsCode ? 1 : 0) + 2 + (data.showPrice ? 1 : 0); // No., Description, [HS Code], Qty, Unit, [U/Price]
  const emptySpaces = new Array(mergeColCount - 1).fill('');
  totalRow.push(...emptySpaces);

  if (data.showPrice) {
    // 只添加Amount列的值，U/Price已经包含在合并单元格中
    totalRow.push(totals.totalPrice.toFixed(2));
  }

  if (data.showWeightAndPackage) {
    totalRow.push(
      totals.netWeight.toFixed(2),
      totals.grossWeight.toFixed(2),
      totals.packageQty.toString()
    );
  }

  if (data.showDimensions) totalRow.push('');

  body.push(totalRow);

  // 设置总计行样式
  const totalRowIndex = body.length - 1;
  const totalStyles: Record<string, { font: string; fontStyle: string }> = {};
  for (let i = 0; i < headers[0].length; i++) {
    totalStyles[`${totalRowIndex}-${i}`] = {
      font: 'NotoSansSC-bold',
      fontStyle: 'bold'
    };
  }

  // 合并总计行的单元格
  const totalCellSpans = [{
    row: totalRowIndex,
    col: 0,
    colSpan: mergeColCount,
    rowSpan: 1,
    styles: { 
      halign: 'center', // 将 Total 文本居中显示
      font: 'NotoSansSC-bold',
      fontStyle: 'bold'
    }
  }];

  // 渲染表格
  const finalY = (doc.autoTable({
    head: headers,
    body: body,
    startY: startY, // 设置负值使表格向上移动
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: tableStyles,
    headStyles: headStyles,
    columnStyles: columnStyles,
    cellStyles: totalStyles,
    didParseCell: function(data: TableData) {
      if (data.row.index === totalRowIndex) {
        const span = totalCellSpans.find(span => 
          span.row === data.row.index && 
          span.col === data.column.index
        );
        if (span) {
          data.cell.colSpan = span.colSpan;
          data.cell.styles = { ...data.cell.styles, ...span.styles };
        }
        // 为数值列设置居中对齐（除了合并的单元格）
        if (data.column.index >= mergeColCount) {
          data.cell.styles.halign = 'center';
        }
      }
    },
    didDrawPage: function(data: TableData) {
      if (data.pageCount === (doc as any).getNumberOfPages()) {
        const text = 'FOR CUSTOMS PURPOSE ONLY';
        const fontSize = 8;
        doc.setFont('NotoSansSC-bold');
        doc.setFontSize(fontSize);
        doc.text(text, margin +5, data.cursor?.y ? data.cursor.y + 6 : startY + 6);
      }
    }
  }) as unknown) as number;

  return finalY;
} 