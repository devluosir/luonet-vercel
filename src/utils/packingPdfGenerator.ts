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
          doc.setFontSize(16);
          doc.setFont('NotoSansSC', 'bold');
          const title = getPackingListTitle(data);
          const titleWidth = doc.getTextWidth(title);
          const titleY = margin + imgHeight + 5;  // 标题Y坐标
          doc.text(title, (pageWidth - titleWidth) / 2, titleY);
          currentY = titleY + 20;
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

  // 左侧：收货人信息（增加宽度）
  doc.setFont('NotoSansSC', 'bold');
  doc.text('Consignee:', margin, currentY);
  doc.setFont('NotoSansSC', 'normal');
  
  let leftY = currentY;
  if (data.consignee.name.trim()) {
    // 增加收件人信息的宽度从100增加到130
    const consigneeLines = doc.splitTextToSize(data.consignee.name.trim(), 130);
    consigneeLines.forEach((line: string, index: number) => {
      doc.text(String(line), margin, leftY + 5 + (index * 4));
    });
    leftY += 5 + (consigneeLines.length * 4) + 5;
  } else {
    leftY += 10;
  }

  // 左侧：Order No.（在Consignee下方，支持自动换行）
  if (data.orderNo) {
    doc.setFont('NotoSansSC', 'bold');
    doc.text('Order No.:', margin, leftY);
    doc.setFont('NotoSansSC', 'bold'); // Order No.的值使用粗体
    
    // Order No.支持自动换行，最大宽度130
    const orderNoLines = doc.splitTextToSize(data.orderNo, 130);
    orderNoLines.forEach((line: string, index: number) => {
      doc.text(String(line), margin + 25, leftY + (index * 4));
    });
    leftY += (orderNoLines.length * 4) + 5;
  }

  // 右侧：Invoice No. + Date（调整位置更靠中间）
  let rightY = startY;
  const rightStartX = pageWidth * 0.65; // 从页面65%位置开始，而不是太靠右
  const colonX = rightStartX + 30; // 冒号位置

  if (data.invoiceNo) {
    doc.setFont('NotoSansSC', 'bold');
    doc.text('Invoice No.', colonX - 2, rightY, { align: 'right' });
    doc.text(':', colonX, rightY);
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 122, 255); // 设置为蓝色 (RGB: 0, 122, 255)
    doc.text(data.invoiceNo, colonX + 3, rightY);
    doc.setTextColor(0, 0, 0); // 重置为黑色
    rightY += 5;
  }

  doc.setFont('NotoSansSC', 'bold');
  doc.text('Date', colonX - 2, rightY, { align: 'right' });
  doc.text(':', colonX, rightY);
  doc.setFont('NotoSansSC', 'normal');
  doc.text(data.date, colonX + 3, rightY);

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

// 渲染商品表格
async function renderPackingTable(doc: ExtendedJsPDF, data: PackingData, startY: number): Promise<number> {
  // 构建表头 - 优化换行显示
  const tableHeaders = [
    'No.',
    'Description',
    ...(data.showHsCode ? ['HS Code'] : []),
    'Qty',
    'Unit',
    ...(data.showPrice ? ['U/Price', 'Amount'] : []),
    ...(data.showWeightAndPackage ? ['N.W.\n(kg)', 'G.W.\n(kg)', 'Pkgs'] : []),
    ...(data.showDimensions ? [`Dimensions\n(${data.dimensionUnit})`] : [])
  ];

  // 构建表格数据
  const tableBody = data.items.map((item, index) => [
    index + 1,
    item.description,
    ...(data.showHsCode ? [item.hsCode] : []),
    item.quantity || '',
    item.unit || '',
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
      '', // Unit列为空
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

  // 计算列数以优化布局
  const totalColumns = tableHeaders.length;
  const isCompact = totalColumns > 7; // 当列数超过7列时使用紧凑布局
  
  // 计算描述列的动态宽度
  let descriptionWidth: number | 'auto' = 'auto';
  if (isCompact) {
    // 为各个固定列预留空间 - 优化列宽分配
    let reservedWidth = 10; // No.列 - 稍微增加
    if (data.showHsCode) reservedWidth += 22; // HS Code列 - 增加宽度以防止长数字换行
    reservedWidth += 12 + 12; // Qty + Unit列 - 稍微增加
    if (data.showPrice) reservedWidth += 16 + 20; // U/Price + Amount列 - 调整比例
    if (data.showWeightAndPackage) reservedWidth += 15 + 15 + 12; // N.W. + G.W. + Pkgs列 - 稍微增加
    if (data.showDimensions) reservedWidth += 22; // Dimensions列 - 稍微减少
    
    // 页面可用宽度约为170mm（A4宽度210mm - 左右边距各15mm - 表格内边距）
    const availableWidth = 170;
    descriptionWidth = Math.max(30, availableWidth - reservedWidth); // 描述列最小宽度调整为30
  }
  
  // 使用 autoTable 绘制表格
  doc.autoTable({
    startY: startY,
    head: [tableHeaders],
    body: tableBody,
    styles: {
      fontSize: isCompact ? 7 : 8,
      cellPadding: isCompact ? 1.5 : 2,
      font: 'NotoSansSC',
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
      halign: 'center',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: isCompact ? 7 : 8,
      cellPadding: isCompact ? 2 : 3,
      minCellHeight: isCompact ? 12 : 10,
      valign: 'middle',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    didParseCell: function(data: any) {
      // 检查是否为Total行 - 通过检查第二列是否包含"Total:"
      if (data.section === 'body' && 
          data.row.cells && data.row.cells[1] && 
          data.row.cells[1].raw && 
          data.row.cells[1].raw.toString().includes('Total:')) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240]; // 稍微突出的背景色
      }
      
      // 设置第一列表头"No."不换行
      if (data.section === 'head' && data.column.index === 0) {
        data.cell.styles.overflow = 'hidden';
        data.cell.styles.cellWidth = 'wrap';
      }
      
      // 设置HS Code列不换行（如果显示HS Code且是第3列）
      if (data.showHsCode && data.column.index === 2) {
        data.cell.styles.overflow = 'hidden';
        data.cell.styles.cellWidth = 'wrap';
      }
    },
    columnStyles: {
      0: { halign: 'center', valign: 'middle', cellWidth: isCompact ? 10 : 12, overflow: 'hidden' }, // No. - 稍微增加
      1: { 
        halign: 'left', // Description左对齐，便于阅读
        valign: 'middle',
        cellWidth: descriptionWidth
      }, // Description
              ...(data.showHsCode ? {
          [2]: { halign: 'center', valign: 'middle', cellWidth: isCompact ? 22 : 25, overflow: 'hidden' } // HS Code - 增加宽度，防止换行
        } : {}),
        [2 + (data.showHsCode ? 1 : 0)]: { halign: 'center', valign: 'middle', cellWidth: isCompact ? 12 : 14 }, // Qty - 稍微增加
        [3 + (data.showHsCode ? 1 : 0)]: { halign: 'center', valign: 'middle', cellWidth: isCompact ? 12 : 14 }, // Unit - 稍微增加
              ...(data.showPrice ? {
          [getColumnIndex(data, 'unitPrice')]: { halign: 'center', valign: 'middle', cellWidth: isCompact ? 16 : 18 }, // U/Price - 调整
          [getColumnIndex(data, 'amount')]: { halign: 'center', valign: 'middle', cellWidth: isCompact ? 20 : 22 } // Amount - 稍微增加
        } : {}),
              ...(data.showWeightAndPackage ? {
          [getColumnIndex(data, 'netWeight')]: { halign: 'center', valign: 'middle', cellWidth: isCompact ? 15 : 17 }, // N.W. - 稍微增加
          [getColumnIndex(data, 'grossWeight')]: { halign: 'center', valign: 'middle', cellWidth: isCompact ? 15 : 17 }, // G.W. - 稍微增加
          [getColumnIndex(data, 'packageQty')]: { halign: 'center', valign: 'middle', cellWidth: isCompact ? 12 : 14 } // Pkgs - 稍微增加
        } : {}),
              ...(data.showDimensions ? {
          [tableHeaders.length - 1]: { halign: 'center', valign: 'middle', cellWidth: isCompact ? 22 : 25 } // Dimensions - 稍微减少
        } : {})
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto',
    theme: 'grid'
  });

  return (doc as any).lastAutoTable.finalY + 15;
}

// 获取列索引
function getColumnIndex(data: PackingData, columnType: string): number {
  let index = 2; // No. + Description
  
  if (data.showHsCode) index++;
  index += 2; // Qty + Unit
  
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
  const hasCustomRemarks = data.remarks.trim();
  const hasCustomsPurpose = data.remarkOptions.customsPurpose;
  
  // 如果没有任何备注内容，直接返回
  if (!hasCustomRemarks && !hasCustomsPurpose) {
    return currentY;
  }
  
  doc.setFontSize(10);
  doc.setFont('NotoSansSC', 'normal');
  
  // 如果仅有"FOR CUSTOMS PURPOSE ONLY"选项而没有自定义备注
  if (!hasCustomRemarks && hasCustomsPurpose) {
    doc.text('FOR CUSTOMS PURPOSE ONLY', margin, currentY);
    return currentY + 5;
  }
  
  // 如果有自定义备注，显示Notes标题和编号
  doc.setFont('NotoSansSC', 'bold');
  doc.text('Notes:', margin, currentY);
  currentY += 5;
  
  doc.setFont('NotoSansSC', 'normal');
  
  // 收集所有需要显示的备注项
  const noteItems: string[] = [];
  
  // 添加自定义备注（按行分割）
  if (hasCustomRemarks) {
    const customRemarkLines = data.remarks.split('\n').filter(line => line.trim());
    noteItems.push(...customRemarkLines);
  }
  
  // 如果选中了 "FOR CUSTOMS PURPOSE ONLY"，添加到列表中
  if (hasCustomsPurpose) {
    noteItems.push('FOR CUSTOMS PURPOSE ONLY');
  }
  
  // 自动编号显示所有备注项
  noteItems.forEach((item, index) => {
    const numberedText = `${index + 1}. ${item.trim()}`;
    const itemLines = doc.splitTextToSize(numberedText, pageWidth - (margin * 2));
    itemLines.forEach((line: string, lineIndex: number) => {
      doc.text(String(line), margin, currentY + (lineIndex * 4));
    });
    currentY += itemLines.length * 4 + 2; // 每个项目间增加2mm间距
  });
  
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
  doc.setFontSize(16);
  doc.setFont('NotoSansSC', 'bold');
  const title = getPackingListTitle(data);
  const titleWidth = doc.getTextWidth(title);
  const titleY = margin + 5;
  doc.text(title, (pageWidth - titleWidth) / 2, titleY);
  return titleY + 20;
}

// 处理无表头的情况
function handleNoHeader(doc: ExtendedJsPDF, data: PackingData, margin: number, pageWidth: number): number {
  doc.setFontSize(16);
  doc.setFont('NotoSansSC', 'bold');
  const title = getPackingListTitle(data);
  const titleWidth = doc.getTextWidth(title);
  const titleY = margin + 5;
  doc.text(title, (pageWidth - titleWidth) / 2, titleY);
  return titleY + 20;
}



// 保存 PDF
function savePackingListPDF(doc: ExtendedJsPDF, data: PackingData): void {
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
  const filename = `${getPackingListTitle(data)}-${data.orderNo || data.invoiceNo || 'DRAFT'}-${formattedDate}.pdf`;
  doc.save(filename);
} 