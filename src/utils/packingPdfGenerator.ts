import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserOptions, RowInput, CellInput } from 'jspdf-autotable';
import { embeddedResources } from '@/lib/embedded-resources';
import { ensurePdfFont } from '@/utils/pdfFontRegistry';
import { setCnFont, validateFontRegistration } from '@/utils/pdfFontUtils';
import { MergedCellInfo } from '@/features/packing/types';

// 扩展 jsPDF 类型
interface ExtendedJsPDF extends Omit<jsPDF, 'getImageProperties' | 'setPage'> {
  autoTable: (options: UserOptions) => void;
  getImageProperties: (image: string) => { width: number; height: number };
  getNumberOfPages: () => number;
  setPage: (pageNumber: number) => ExtendedJsPDF;
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
  items: PackingItem[];
  otherFees?: {
    id: number;
    description: string;
    amount: number;
    highlight?: {
      description?: boolean;
      amount?: boolean;
    };
  }[];
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
  // 合并单元格相关
  packageQtyMergeMode?: 'auto' | 'manual';
  dimensionsMergeMode?: 'auto' | 'manual';
  manualMergedCells?: {
    packageQty: Array<{
      startRow: number;
      endRow: number;
      content: string;
      isMerged: boolean;
    }>;
    dimensions: Array<{
      startRow: number;
      endRow: number;
      content: string;
      isMerged: boolean;
    }>;
  };
  autoMergedCells?: {
    packageQty: Array<{
      startRow: number;
      endRow: number;
      content: string;
      isMerged: boolean;
    }>;
    dimensions: Array<{
      startRow: number;
      endRow: number;
      content: string;
      isMerged: boolean;
    }>;
  };
}



// 函数重载签名
export async function generatePackingListPDF(data: PackingData): Promise<Blob>;

// 新增：导出PDF时可传入页面统计行 totals
export async function generatePackingListPDF(
  data: PackingData,
  _totals?: { netWeight: number; grossWeight: number; packageQty: number; totalPrice: number }
): Promise<Blob> {
  // 检查是否在客户端环境
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in client-side environment');
  }

  // 直接使用页面传递的合并单元格数据，不再重新计算

  // 直接使用页面传递的合并单元格数据，不再重新计算
  const packageQtyMergeMode = data.packageQtyMergeMode || 'auto';
  const dimensionsMergeMode = data.dimensionsMergeMode || 'auto';
  
  // 根据合并模式选择对应的数据源
  const mergedPackageQtyCells = packageQtyMergeMode === 'manual' 
    ? (data.manualMergedCells?.packageQty || [])
    : (data.autoMergedCells?.packageQty || []);
    
  const mergedDimensionsCells = dimensionsMergeMode === 'manual'
    ? (data.manualMergedCells?.dimensions || [])
    : (data.autoMergedCells?.dimensions || []);

  // 添加调试信息
  console.log('PDF合并单元格数据:', {
    packageQtyMergeMode,
    dimensionsMergeMode,
    mergedPackageQtyCells,
    mergedDimensionsCells,
    itemsCount: data.items.length,
    items: data.items.map((item, index) => ({
      index,
      packageQty: item.packageQty,
      dimensions: item.dimensions
    }))
  });

  // 创建 PDF 文档
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    floatPrecision: 16
  }) as any;

  try {
    // 确保字体在当前 doc 实例注册
    await ensurePdfFont(doc as unknown as jsPDF);
    
    // 验证字体注册
    validateFontRegistration(doc as unknown as jsPDF, '装箱单');

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
    currentY = await renderPackingTable(doc, data, currentY, mergedPackageQtyCells, mergedDimensionsCells);

    // 备注
    renderRemarks(doc, data, currentY, pageWidth, margin);

    // 添加页码
    addPageNumbers(doc, pageWidth, pageHeight, margin);

    // 统一返回 blob 对象，让调用方处理下载
    return doc.output('blob');

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
function renderBasicInfo(doc: any, data: PackingData, startY: number, pageWidth: number, margin: number): number {
  let currentY = startY;
  const contentIndent = 5; // 收货人信息的缩进值
  const orderNoIndent = 15; // Order No. 内容的缩进值，设置更大的缩进
  
  // 添加 SHIP'S SPARES IN TRANSIT（如果选中）- 放在Consignee上方
  if (data.remarkOptions.shipsSpares) {
    doc.setFontSize(8);
    setCnFont(doc, 'bold');
    const text = '"SHIP\'S SPARES IN TRANSIT"';
    doc.text(text, margin, currentY);
    currentY += 5; // 项目间距5px
  }

  doc.setFontSize(8);
  setCnFont(doc, 'normal');

  // 左侧：收货人信息
  setCnFont(doc, 'bold');
  doc.text('Consignee:', margin, currentY);
  setCnFont(doc, 'normal');
  
  let leftY = currentY;
  if (data.consignee.name.trim()) {
    const consigneeLines = doc.splitTextToSize(data.consignee.name.trim(), 130);
    consigneeLines.forEach((line: string, index: number) => {
      doc.text(String(line), margin + contentIndent, leftY + 4 + (index * 4)); // 内容行间距4px，第一行额外加4px
    });
    leftY += 4 + (consigneeLines.length * 4) + 5; // 第一行额外加4px，最后加5px作为项目间距
  } else {
    leftY += 15; // 项目间距5px
  }

  // 左侧：Order No. - 只在有值时才显示
  if (data.orderNo && data.orderNo.trim()) {
    setCnFont(doc, 'bold');
    doc.text('Order No.:', margin, leftY);
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 255); // 设置为蓝色
    const orderNoText = data.orderNo.trim();
    const orderNoLines = doc.splitTextToSize(orderNoText, 130);
    orderNoLines.forEach((line: string, index: number) => {
      doc.text(String(line), margin + orderNoIndent, leftY + (index * 4)); // 内容行间距4px
    });
    doc.setTextColor(0, 0, 0); // 重置为黑色
    leftY += (orderNoLines.length * 4) + 5; // 最后加5px作为项目间距
  }

  // 右侧：Invoice No. + Date
  let rightY = data.remarkOptions.shipsSpares ? startY + 5 : startY; // 调整右侧起始位置，使用5px间距
  const rightStartX = pageWidth * 0.65;
  const colonX = rightStartX + 30;

  // Invoice No. - 始终显示
  setCnFont(doc, 'bold');
  doc.text('Invoice No.', colonX - 2, rightY, { align: 'right' });
  doc.text(':', colonX, rightY);
  setCnFont(doc, 'bold');
  doc.setTextColor(255, 0, 0); // 设置为红色，与发票一致
  
  // 处理 Invoice No. 换行
  const invoiceNoText = data.invoiceNo || '';
  const maxWidth = pageWidth - colonX - 15; // 留出右边距
  const invoiceNoLines = doc.splitTextToSize(invoiceNoText, maxWidth);
  invoiceNoLines.forEach((line: string, index: number) => {
    doc.text(line, colonX + 3, rightY + (index * 4));
  });
  doc.setTextColor(0, 0, 0); // 重置为黑色
  rightY += Math.max(5, invoiceNoLines.length * 4); // 根据行数调整间距

  setCnFont(doc, 'bold');
  doc.text('Date', colonX - 2, rightY, { align: 'right' });
  doc.text(':', colonX, rightY);
  setCnFont(doc, 'normal');
  doc.text(data.date, colonX + 3, rightY);

  // 如果显示价格，则显示币种
  if (data.showPrice) {
    rightY += 5; // 项目间距5px
    setCnFont(doc, 'bold');
    doc.text('Currency', colonX - 2, rightY, { align: 'right' });
    doc.text(':', colonX, rightY);
    setCnFont(doc, 'normal');
    doc.text(data.currency, colonX + 3, rightY);
  }

  // 减少基础信息与表格之间的间距
  return Math.max(leftY, rightY) - 3;
}

// 渲染备注
function renderRemarks(doc: any, data: PackingData, startY: number, pageWidth: number, margin: number): number {
  let currentY = startY;
  
  // 检查是否有备注内容
  const hasCustomRemarks = data.remarks && data.remarks.trim();
  
  // 如果没有任何备注内容，直接返回
  if (!hasCustomRemarks) {
    return currentY;
  }
  
  doc.setFontSize(10);
  setCnFont(doc, 'normal');
  
  // 显示Notes标题和编号
  setCnFont(doc, 'bold');
  doc.text('Notes:', margin, currentY);
  currentY += 5;
  
  setCnFont(doc, 'normal');
  
  // 添加自定义备注（按行分割）
  if (hasCustomRemarks) {
    const customRemarkLines = data.remarks.split('\n').filter(line => line.trim());
    customRemarkLines.forEach((item, index) => {
      const numberedText = `${index + 1}. ${item.trim()}`;
      const itemLines = doc.splitTextToSize(numberedText, pageWidth - (margin * 2));
      itemLines.forEach((line: string, lineIndex: number) => {
        // 确保line是有效的字符串
        if (line && typeof line === 'string') {
          doc.text(line, margin, currentY + (lineIndex * 4));
        }
      });
      currentY += itemLines.length * 4 + 2; // 每个项目间增加2mm间距
    });
  }
  
  return currentY + 3;
}

// 添加页码
function addPageNumbers(doc: any, pageWidth: number, pageHeight: number, margin: number): void {
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

// 处理表头错误的情况
function handleHeaderError(doc: any, data: PackingData, margin: number, pageWidth: number): number {
  doc.setFontSize(14);
  setCnFont(doc, 'bold');
  const title = getPackingListTitle(data);
  const titleWidth = doc.getTextWidth(title);
  const titleY = margin + 5;
  doc.text(title, (pageWidth - titleWidth) / 2, titleY);
  return titleY + 10;
}

// 处理无表头的情况
function handleNoHeader(doc: any, data: PackingData, margin: number, pageWidth: number): number {
  doc.setFontSize(14);
  setCnFont(doc, 'bold');
  const title = getPackingListTitle(data);
  const titleWidth = doc.getTextWidth(title);
  const titleY = margin + 5;
  doc.text(title, (pageWidth - titleWidth) / 2, titleY);
  return titleY + 10;
}

// 渲染商品表格
async function renderPackingTable(
  doc: any,
  data: PackingData,
  startY: number,
  mergedPackageQtyCells: Array<{
    startRow: number;
    endRow: number;
    content: string;
    isMerged: boolean;
  }>,
  mergedDimensionsCells: Array<{
    startRow: number;
    endRow: number;
    content: string;
    isMerged: boolean;
  }>
): Promise<number> {
  // 计算页面宽度和边距
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15; // 左右边距各15mm
  const tableWidth = pageWidth - (margin * 2); // 表格实际可用宽度

  // 设置列宽度和对齐方式
  const columnStyles: Record<string, { halign: 'center' | 'left' | 'right'; cellWidth: number }> = {};
  
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

  // 表格基础样式
  const tableStyles = {
    fontSize: 8,
    cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
    lineColor: [0, 0, 0] as [number, number, number],
    lineWidth: 0.1,
    font: 'NotoSansSC',
    valign: 'middle' as const,
    minCellHeight: 8
  };

  // 表头样式
  const headStyles = {
    fillColor: [255, 255, 255] as [number, number, number],
    textColor: [0, 0, 0] as [number, number, number],
    fontSize: 8,
    fontStyle: 'bold' as const,
    halign: 'center' as const,
    font: 'NotoSansSC',
    valign: 'middle' as const,
    cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
    minCellHeight: 12 // 增加表头高度以适应换行
  };

  // 设置每列的宽度和对齐方式
  columnStyles[0] = { 
    halign: 'center' as const, 
    cellWidth: baseWidths.no * unitWidth 
  };
  columnStyles[1] = { 
    halign: 'center' as const, 
    cellWidth: baseWidths.description * unitWidth 
  };

  let currentColumnIndex = 2;

  if (data.showHsCode) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.hsCode * unitWidth 
    };
    currentColumnIndex++;
  }

  // Quantity 和 Unit 列
  columnStyles[currentColumnIndex] = { 
    halign: 'center' as const, 
    cellWidth: baseWidths.qty * unitWidth 
  };
  currentColumnIndex++;
  columnStyles[currentColumnIndex] = { 
    halign: 'center' as const, 
    cellWidth: baseWidths.unit * unitWidth 
  };
  currentColumnIndex++;

  // Price 相关列
  if (data.showPrice) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.unitPrice * unitWidth 
    };
    currentColumnIndex++;
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.amount * unitWidth 
    };
    currentColumnIndex++;
  }

  // Weight 和 Package 相关列
  if (data.showWeightAndPackage) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.netWeight * unitWidth 
    };
    currentColumnIndex++;
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.grossWeight * unitWidth 
    };
    currentColumnIndex++;
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.pkgs * unitWidth 
    };
    currentColumnIndex++;
  }

  // Dimensions 列
  if (data.showDimensions) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.dimensions * unitWidth 
    };
  }

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
  const body: RowInput[] = [];
  
  // 获取合并单元格信息的辅助函数
  const getMergedCellInfo = (rowIndex: number, mergedCells: MergedCellInfo[]) => {
    return mergedCells.find(cell => rowIndex >= cell.startRow && rowIndex <= cell.endRow);
  };

  const shouldRenderCell = (rowIndex: number, mergedCells: MergedCellInfo[]) => {
    const mergedInfo = getMergedCellInfo(rowIndex, mergedCells);
    return !mergedInfo || mergedInfo.startRow === rowIndex;
  };

  let rowIndex = 0;
  data.items.forEach((item) => {
    const row: CellInput[] = [
      rowIndex + 1, // 用当前序号
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
      // 处理Net Weight和Gross Weight列（不合并）
      row.push(
        item.netWeight.toFixed(2),
        item.grossWeight.toFixed(2)
      );
      
      // 处理Package Qty列的合并
      const packageQtyMergedInfo = getMergedCellInfo(rowIndex, mergedPackageQtyCells);
      console.log(`Row ${rowIndex} Package Qty合并信息:`, {
        item: item.packageQty,
        mergedInfo: packageQtyMergedInfo,
        isStartRow: packageQtyMergedInfo?.startRow === rowIndex,
        isMerged: packageQtyMergedInfo?.isMerged
      });
      
      if (packageQtyMergedInfo && packageQtyMergedInfo.isMerged && packageQtyMergedInfo.startRow === rowIndex) {
        // 这是合并单元格的起始行
        const rowSpan = packageQtyMergedInfo.endRow - packageQtyMergedInfo.startRow + 1;
        console.log(`Row ${rowIndex} 添加Package Qty合并单元格:`, {
          content: packageQtyMergedInfo.content,
          rowSpan: rowSpan
        });
        row.push({
          content: packageQtyMergedInfo.content,
          rowSpan: rowSpan,
          styles: { valign: 'middle', halign: 'center' }
        });
      } else if (packageQtyMergedInfo && packageQtyMergedInfo.isMerged) {
        // 这是被合并的行，跳过该列（不添加任何内容）
        console.log(`Row ${rowIndex} 跳过Package Qty列（被合并）`);
        // 在jspdf-autotable中，被合并的行会自动处理
      } else {
        // 普通行，正常显示
        console.log(`Row ${rowIndex} 添加Package Qty普通单元格:`, item.packageQty.toString());
        row.push(item.packageQty.toString());
      }
    }
    
    if (data.showDimensions) {
      // 处理Dimensions列的合并
      const dimensionsMergedInfo = getMergedCellInfo(rowIndex, mergedDimensionsCells);
      console.log(`Row ${rowIndex} Dimensions合并信息:`, {
        item: item.dimensions,
        mergedInfo: dimensionsMergedInfo,
        isStartRow: dimensionsMergedInfo?.startRow === rowIndex,
        isMerged: dimensionsMergedInfo?.isMerged
      });
      
      if (dimensionsMergedInfo && dimensionsMergedInfo.isMerged && dimensionsMergedInfo.startRow === rowIndex) {
        // 这是合并单元格的起始行
        const rowSpan = dimensionsMergedInfo.endRow - dimensionsMergedInfo.startRow + 1;
        console.log(`Row ${rowIndex} 添加Dimensions合并单元格:`, {
          content: dimensionsMergedInfo.content,
          rowSpan: rowSpan
        });
        row.push({
          content: dimensionsMergedInfo.content,
          rowSpan: rowSpan,
          styles: { valign: 'middle', halign: 'center' }
        });
      } else if (dimensionsMergedInfo && dimensionsMergedInfo.isMerged) {
        // 这是被合并的行，跳过该列（不添加任何内容）
        console.log(`Row ${rowIndex} 跳过Dimensions列（被合并）`);
        // 在jspdf-autotable中，被合并的行会自动处理
      } else {
        // 普通行，正常显示
        console.log(`Row ${rowIndex} 添加Dimensions普通单元格:`, item.dimensions);
        row.push(item.dimensions);
      }
    }
    
    console.log(`Row ${rowIndex} 最终行数据:`, row);
    body.push(row);
    rowIndex++;
  });

  // 计算需要合并的列数（No. + Description + HS Code + Qty + Unit + U/Price）
  let mergeColCount = 2; // No. + Description
  if (data.showHsCode) mergeColCount += 1;
  mergeColCount += 2; // Qty + Unit
  if (data.showPrice) mergeColCount += 1; // U/Price

  // 添加 other fees 行
  if (data.showPrice && data.otherFees && data.otherFees.length > 0) {
    data.otherFees.forEach(fee => {
      const feeRow: CellInput[] = [
        {
          content: fee.description,
          colSpan: mergeColCount,
          styles: { 
            halign: 'center',
            ...(fee.highlight?.description ? { textColor: [255, 0, 0] } : {})
          }
        },
        {
          content: fee.amount.toFixed(2),
          styles: { 
            halign: 'center',
            ...(fee.highlight?.amount ? { textColor: [255, 0, 0] } : {})
          }
        }
      ];
      body.push(feeRow);
    });
  }

  // 统计总计（考虑合并单元格，避免重复计算）
  let netWeight = 0, grossWeight = 0, packageQty = 0, totalPrice = 0;
  const processedGroups = new Set<string>();
  const processedMergedRows = new Set<number>();
  
  // 处理合并单元格，标记已合并的行
  const allMergedCells = [
    ...(mergedPackageQtyCells || []),
    ...(mergedDimensionsCells || [])
  ];
  
  allMergedCells.forEach(cell => {
    if (cell.isMerged) {
      for (let i = cell.startRow; i <= cell.endRow; i++) {
        processedMergedRows.add(i);
      }
    }
  });
  
  data.items.forEach((item, index) => {
    totalPrice += item.totalPrice;
    
    // 检查是否在合并单元格中且不是合并的起始行
    const isInMergedCell = processedMergedRows.has(index);
    const isMergeStart = allMergedCells.some(cell => 
      cell.isMerged && cell.startRow === index
    );
    
    // 如果不在合并单元格中，或者是合并的起始行，则计算
    if (!isInMergedCell || isMergeStart) {
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
    }
  });

  // 添加 other fees 到总计
  if (data.showPrice && data.otherFees) {
    const feesTotal = data.otherFees.reduce((sum, fee) => sum + fee.amount, 0);
    totalPrice += feesTotal;
  }

  // 添加总计行前调试输出
  console.log('PDF端自动统计:', { totalPrice, netWeight, grossWeight, packageQty });
  // 2. 构造总计行，精确对齐表头
  const totalRow: CellInput[] = [];
  for (let i = 0; i < headers[0].length;) {
    if (i === 0) {
      totalRow.push({ content: 'Total:', colSpan: mergeColCount, styles: { halign: 'center', fontStyle: 'bold', font: 'NotoSansSC' } });
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

  // 设置总计行索引
  const totalRowIndex = body.length - 1;

  // 合并总计行的单元格
  const totalCellSpans = [{
    row: totalRowIndex,
    col: 0,
    colSpan: mergeColCount,
    rowSpan: 1,
    styles: { 
      halign: 'center', // 将 Total 文本居中显示
      font: 'NotoSansSC',
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
    didParseCell: function(data: { row: { index: number }; column: { index: number }; cell: { colSpan?: number; styles?: { halign?: string; valign?: string; fontStyle?: string; font?: string } } }) { // 使用具体类型以兼容 jspdf-autotable 的 CellHookData 类型
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
          if (data.cell.styles) {
            data.cell.styles.halign = 'center';
          }
        }
        
        // 确保总计行的数值正确显示
        if (data.row.index === totalRowIndex && data.column.index >= mergeColCount) {
          // 数值列应该居中对齐
          if (data.cell.styles) {
            data.cell.styles.halign = 'center';
          }
        }
      }
    },
    didDrawPage: function(tableData: { pageCount: number; cursor?: { y: number } | null }) {
      if (tableData.pageCount === doc.getNumberOfPages()) {
        // 只有当 customsPurpose 为 true 时才显示
        if (data.remarkOptions.customsPurpose) {
          const text = 'FOR CUSTOMS PURPOSE ONLY';
          const fontSize = 8;
          setCnFont(doc, 'bold');
          doc.setFontSize(fontSize);
          doc.text(text, margin +5, tableData.cursor?.y ? tableData.cursor.y + 6 : startY + 6);
        }
      }
    }
  }) as unknown) as number;

  return finalY;
} 