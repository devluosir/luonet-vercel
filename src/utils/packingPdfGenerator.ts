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
  groupId?: string;
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
export async function generatePackingListPDF(data: PackingData, preview?: false, totals?: { netWeight: number; grossWeight: number; packageQty: number; totalPrice: number }): Promise<void>;

// 新增：导出PDF时可传入页面统计行 totals
export async function generatePackingListPDF(
  data: PackingData,
  preview: boolean = false,
  totals?: { netWeight: number; grossWeight: number; packageQty: number; totalPrice: number }
): Promise<string | void> {
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
    currentY = await renderPackingTable(doc, data, currentY, totals);

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
        { content: item.description, styles: { halign: 'center' } },
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
  
  // 计算总计行（与页面一致：组内只统计合并单元格）
  let totalPrice = 0;
  let netWeight = 0;
  let grossWeight = 0;
  let packageQty = 0;
  const processedGroups = new Set<string>();
  data.items.forEach((item, idx) => {
    totalPrice += item.totalPrice;
    const isInGroup = !!item.groupId;
    const groupItems = isInGroup ? data.items.filter(i => i.groupId === item.groupId) : [];
    const isFirstInGroup = isInGroup && groupItems[0]?.id === item.id;
    if (isInGroup) {
      if (isFirstInGroup) {
        netWeight += item.netWeight;
        grossWeight += item.grossWeight;
        packageQty += item.packageQty;
        processedGroups.add(item.groupId!);
      }
    } else {
      netWeight += item.netWeight;
      grossWeight += item.grossWeight;
      packageQty += item.packageQty;
    }
  });
  // 添加总计行
  const totalRow = ['Total:'];
  const mergeColCount = 2 + (data.showHsCode ? 1 : 0) + 2 + (data.showPrice ? 1 : 0);
  const emptySpaces = new Array(mergeColCount - 1).fill('');
  totalRow.push(...emptySpaces);
  if (data.showPrice) {
    totalRow.push(totalPrice.toFixed(2));
  }
  if (data.showWeightAndPackage) {
    totalRow.push(
      netWeight.toFixed(2),
      grossWeight.toFixed(2),
      packageQty.toString()
    );
  }
  if (data.showDimensions) totalRow.push('');
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
async function renderPackingTable(
  doc: ExtendedJsPDF,
  data: PackingData,
  startY: number,
  totals?: { netWeight: number; grossWeight: number; packageQty: number; totalPrice: number }
): Promise<number> {
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
    halign: 'center', 
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

  // 准备数据行（支持分组合并单元格）
  const body: any[] = [];
  const groupMap: Record<string, PackingItem[]> = {};
  data.items.forEach(item => {
    if (item.groupId) {
      if (!groupMap[item.groupId]) groupMap[item.groupId] = [];
      groupMap[item.groupId].push(item);
    }
  });
  const handledGroupIds = new Set<string>();
  data.items.forEach((item, idx) => {
    const isInGroup = !!item.groupId;
    if (isInGroup) {
      if (handledGroupIds.has(item.groupId!)) return; // 只处理组内第一行
      const groupItems = groupMap[item.groupId!];
      handledGroupIds.add(item.groupId!);
      // 组内第一行
      const row: any[] = [
        groupItems[0].serialNo,
        groupItems[0].description
      ];
      if (data.showHsCode) row.push(groupItems[0].hsCode);
      row.push(
        groupItems[0].quantity.toString(),
        groupItems[0].unit
      );
      if (data.showPrice) {
        row.push(
          groupItems[0].unitPrice.toFixed(2),
          groupItems[0].totalPrice.toFixed(2)
        );
      }
      if (data.showWeightAndPackage) {
        // 合并单元格，rowSpan=groupItems.length
        row.push(
          { content: groupItems[0].netWeight.toFixed(2), rowSpan: groupItems.length, styles: { valign: 'middle', halign: 'center' } },
          { content: groupItems[0].grossWeight.toFixed(2), rowSpan: groupItems.length, styles: { valign: 'middle', halign: 'center' } },
          { content: groupItems[0].packageQty.toString(), rowSpan: groupItems.length, styles: { valign: 'middle', halign: 'center' } }
        );
      }
      if (data.showDimensions) {
        row.push({ content: groupItems[0].dimensions, rowSpan: groupItems.length, styles: { valign: 'middle', halign: 'center' } });
      }
      body.push(row);
      // 组内其他行
      for (let i = 1; i < groupItems.length; i++) {
        const sub = groupItems[i];
        const subRow: any[] = [
          sub.serialNo,
          sub.description
        ];
        if (data.showHsCode) subRow.push(sub.hsCode);
        subRow.push(
          sub.quantity.toString(),
          sub.unit
        );
        if (data.showPrice) {
          subRow.push(
            sub.unitPrice.toFixed(2),
            sub.totalPrice.toFixed(2)
          );
        }
        // 组内其他行不渲染合并列
        body.push(subRow);
      }
    } else {
      // 普通行
      const row: any[] = [
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
      body.push(row);
    }
  });

  // 计算需要合并的列数（No. + Description + HS Code + Qty + Unit + U/Price）
  let mergeColCount = 2; // No. + Description
  if (data.showHsCode) mergeColCount += 1;
  mergeColCount += 2; // Qty + Unit
  if (data.showPrice) mergeColCount += 1; // U/Price

  // 统计总计（分组只统计组内第一行）
  let netWeight = 0, grossWeight = 0, packageQty = 0, totalPrice = 0;
  const processedGroups = new Set<string>();
  data.items.forEach((item) => {
    totalPrice += item.totalPrice;
    if (item.groupId) {
      if (!processedGroups.has(item.groupId)) {
        netWeight += item.netWeight;
        grossWeight += item.grossWeight;
        packageQty += item.packageQty;
        processedGroups.add(item.groupId);
      }
    } else {
      netWeight += item.netWeight;
      grossWeight += item.grossWeight;
      packageQty += item.packageQty;
    }
  });

  // 添加总计行前调试输出
  console.log('PDF端自动统计:', { totalPrice, netWeight, grossWeight, packageQty });
  // 2. 构造总计行，精确对齐表头
  const totalRow = [];
  for (let i = 0; i < headers[0].length;) {
    if (i === 0) {
      totalRow.push({ content: 'Total:', colSpan: mergeColCount, styles: { halign: 'center', fontStyle: 'bold', font: 'NotoSansSC-bold' } });
      i += mergeColCount;
    } else if (headers[0][i].includes('Amount')) {
      totalRow.push({ content: data.showPrice ? totalPrice.toFixed(2) : '' });
      i++;
    } else if (headers[0][i].includes('N.W.')) {
      totalRow.push({ content: data.showWeightAndPackage ? netWeight.toFixed(2) : '' });
      i++;
    } else if (headers[0][i].includes('G.W.')) {
      totalRow.push({ content: data.showWeightAndPackage ? grossWeight.toFixed(2) : '' });
      i++;
    } else if (headers[0][i].includes('Pkgs')) {
      totalRow.push({ content: data.showWeightAndPackage ? packageQty.toString() : '' });
      i++;
    } else {
      totalRow.push({ content: '' });
      i++;
    }
  }
  body.push(totalRow);

  // 设置总计行样式
  const totalRowIndex = body.length - 1;
  const totalStyles: Record<string, { font: string; fontStyle: string; halign?: string }> = {};
  
  // 为所有列设置粗体样式
  for (let i = 0; i < headers[0].length; i++) {
    totalStyles[`${totalRowIndex}-${i}`] = {
      font: 'NotoSansSC-bold',
      fontStyle: 'bold'
    };
  }
  
  // 为数值列设置居中对齐
  if (data.showPrice) {
    const amountColIndex = mergeColCount; // Amount 列在合并列之后
    totalStyles[`${totalRowIndex}-${amountColIndex}`] = {
      ...totalStyles[`${totalRowIndex}-${amountColIndex}`],
      halign: 'center'
    };
  }
  
  if (data.showWeightAndPackage) {
    const weightStartIndex = mergeColCount + (data.showPrice ? 1 : 0); // 重量列开始位置
    for (let i = 0; i < 3; i++) { // 净重、毛重、包装数三列
      totalStyles[`${totalRowIndex}-${weightStartIndex + i}`] = {
        ...totalStyles[`${totalRowIndex}-${weightStartIndex + i}`],
        halign: 'center'
      };
    }
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
        
        // 确保总计行的数值正确显示
        if (data.row.index === totalRowIndex && data.column.index >= mergeColCount) {
          // 数值列应该居中对齐
          data.cell.styles.halign = 'center';
        }
      }
    },
    didDrawPage: function(tableData: TableData) {
      if (tableData.pageCount === (doc as any).getNumberOfPages()) {
        // 只有当 customsPurpose 为 true 时才显示
        if (data.remarkOptions.customsPurpose) {
          const text = 'FOR CUSTOMS PURPOSE ONLY';
          const fontSize = 8;
          doc.setFont('NotoSansSC-bold');
          doc.setFontSize(fontSize);
          doc.text(text, margin +5, tableData.cursor?.y ? tableData.cursor.y + 6 : startY + 6);
        }
      }
    }
  }) as unknown) as number;

  return finalY;
} 