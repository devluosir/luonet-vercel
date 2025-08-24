import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserOptions, RowInput, CellInput } from 'jspdf-autotable';
import { embeddedResources } from '@/lib/embedded-resources';
import { ensurePdfFont } from '@/utils/pdfFontRegistry';
import { safeSetCnFont } from '@/utils/pdf/ensureFont';
import { validateFontRegistration } from '@/utils/pdfFontUtils';
import { MergedCellInfo } from '@/features/packing/types';
import { getUnitDisplay } from '@/utils/unitUtils';

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
  marks?: string; // 新增marks字段
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
  marksMergeMode?: 'auto' | 'manual'; // 新增marks合并模式
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
    marks: Array<{
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
    marks: Array<{
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
  const marksMergeMode = data.marksMergeMode || 'auto'; // 新增marks合并模式
  
  // 根据合并模式选择对应的数据源
  const mergedPackageQtyCells = packageQtyMergeMode === 'manual' 
    ? (data.manualMergedCells?.packageQty || [])
    : (data.autoMergedCells?.packageQty || []);
    
  const mergedDimensionsCells = dimensionsMergeMode === 'manual'
    ? (data.manualMergedCells?.dimensions || [])
    : (data.autoMergedCells?.dimensions || []);

  const mergedMarksCells = marksMergeMode === 'manual'
    ? (data.manualMergedCells?.marks || [])
    : (data.autoMergedCells?.marks || []);

  // 添加调试信息
  console.log('PDF合并单元格数据:', {
    packageQtyMergeMode,
    dimensionsMergeMode,
    marksMergeMode,
    mergedPackageQtyCells,
    mergedDimensionsCells,
    mergedMarksCells,
    itemsCount: data.items.length,
    items: data.items.map((item, index) => ({
      index,
      packageQty: item.packageQty,
      dimensions: item.dimensions,
      marks: item.marks
    }))
  });

  // 读取页面的列显示设置，判断是否需要横向模式
  let visibleCols: string[] | undefined;
  let showMarks = false;
  try {
    if (typeof window !== 'undefined') {
      visibleCols = JSON.parse(localStorage.getItem('pk.visibleCols') || 'null');
      showMarks = visibleCols ? visibleCols.includes('marks') : false; // 默认不显示marks列，与表格保持一致
    }
  } catch (e) {
    console.warn('Failed to read packing table column preferences:', e);
    showMarks = false; // 出错时默认不显示marks列，与表格保持一致
  }

  // 当marks列显示时，使用横向模式以适应更多列
  const orientation = showMarks ? 'landscape' : 'portrait';

  // 创建 PDF 文档
  const doc = new jsPDF({
    orientation: orientation,
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
    const isLandscape = pageWidth > pageHeight;
    // 调整边距，确保表格不会太靠近纸边
    const margin = isLandscape ? 20 : 25;
    let currentY = margin;

    // 添加表头
    if (data.templateConfig.headerType !== 'none') {
      try {
        // 根据headerType选择对应的表头图片
        const headerImageBase64 = getHeaderImage(data.templateConfig.headerType);

        if (headerImageBase64) {
          const headerImage = `data:image/png;base64,${headerImageBase64}`;
          const imgProperties = doc.getImageProperties(headerImage);
          
          // 检查是否显示marks列（用于判断是否需要横向模式）
          const showMarks = visibleCols ? visibleCols.includes('marks') : false;
          const shouldUseCompactHeader = isLandscape && showMarks;
          
          // 根据条件调整抬头大小和位置
          let imgWidth, imgHeight, imgX, imgY, titleFontSize, titleSpacing, titleYSpacing;
          if (shouldUseCompactHeader) {
            // 横向模式且显示marks列：参考报价页的设置，限制最大高度
            const maxHeight = 35; // 比报价页稍小，因为横向模式空间有限
            imgWidth = pageWidth - (margin * 2);
            imgHeight = (imgProperties.height * imgWidth) / imgProperties.width;
            
            if (imgHeight > maxHeight) {
              imgHeight = maxHeight;
              imgWidth = imgHeight * (imgProperties.width / imgProperties.height);
            }
            
            imgX = (pageWidth - imgWidth) / 2; // 水平居中
            imgY = margin * 0.6; // 向上移动，但不要太多
            titleFontSize = 12; // 横向模式使用更小的字体
            titleSpacing = 3; // 横向模式减少间距
            titleYSpacing = 8; // 横向模式减少间距
          } else {
            // 其他情况：参考发票页的设置，使用固定边距
            imgWidth = pageWidth - 30; // 左右各留15mm，与发票页一致
            imgHeight = (imgProperties.height * imgWidth) / imgProperties.width;
            imgX = 15; // 左边距15mm，与发票页一致
            imgY = 15; // 上边距15mm，与发票页一致
            titleFontSize = 14;
            titleSpacing = 5;
            titleYSpacing = 10;
          }
          
          doc.addImage(
            headerImage,
            'PNG',
            imgX,
            imgY,
            imgWidth,
            imgHeight,
            undefined,
            'FAST'  // 使用快速压缩
          );
          
          // 调整标题字体大小和位置
          doc.setFontSize(titleFontSize);
          safeSetCnFont(doc, 'bold', 'export');
          const title = getPackingListTitle(data);
          const titleWidth = doc.getTextWidth(title);
          const titleY = imgY + imgHeight + titleSpacing; // 标题Y坐标
          doc.text(title, (pageWidth - titleWidth) / 2, titleY);
          currentY = titleY + titleYSpacing;
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
    currentY = await renderPackingTable(doc, data, currentY, mergedPackageQtyCells, mergedDimensionsCells, mergedMarksCells, visibleCols);

    // 备注 - 已移除，因为备注信息已在文档其他位置显示
    // currentY = renderRemarks(doc, data, currentY, pageWidth, margin);

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
    safeSetCnFont(doc, 'bold', 'export');
    const text = '"SHIP\'S SPARES IN TRANSIT"';
    doc.text(text, margin, currentY);
    currentY += 5; // 项目间距5px
  }

  doc.setFontSize(8);
  safeSetCnFont(doc, 'normal', 'export');

  // 左侧：收货人信息
  safeSetCnFont(doc, 'bold', 'export');
  doc.text('Consignee:', margin, currentY);
  safeSetCnFont(doc, 'normal', 'export');
  
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
    safeSetCnFont(doc, 'bold', 'export');
    doc.text('Order No.:', margin, leftY);
    safeSetCnFont(doc, 'bold', 'export');
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
  safeSetCnFont(doc, 'bold', 'export');
  doc.text('Invoice No.', colonX - 2, rightY, { align: 'right' });
  doc.text(':', colonX, rightY);
  safeSetCnFont(doc, 'bold', 'export');
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

  safeSetCnFont(doc, 'bold', 'export');
  doc.text('Date', colonX - 2, rightY, { align: 'right' });
  doc.text(':', colonX, rightY);
  safeSetCnFont(doc, 'normal', 'export');
  doc.text(data.date, colonX + 3, rightY);

  // 如果显示价格，则显示币种
  if (data.showPrice) {
    rightY += 5; // 项目间距5px
    safeSetCnFont(doc, 'bold', 'export');
    doc.text('Currency', colonX - 2, rightY, { align: 'right' });
    doc.text(':', colonX, rightY);
    safeSetCnFont(doc, 'normal', 'export');
    doc.text(data.currency, colonX + 3, rightY);
  }

  // 减少基础信息与表格之间的间距
  return Math.max(leftY, rightY) - 3;
}

// 渲染备注 - 已移除，因为备注信息已在文档其他位置显示
// function renderRemarks(doc: any, data: PackingData, startY: number, pageWidth: number, margin: number): number {
//   // 函数内容已移除
// }

// 添加页码
function addPageNumbers(doc: any, pageWidth: number, pageHeight: number, margin: number): void {
  const totalPages = doc.getNumberOfPages();
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    
    doc.setFontSize(8);
    safeSetCnFont(doc, 'normal', 'export');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
  }
}

// 处理表头错误的情况
function handleHeaderError(doc: any, data: PackingData, margin: number, pageWidth: number): number {
  doc.setFontSize(14);
  safeSetCnFont(doc, 'bold', 'export');
  const title = getPackingListTitle(data);
  const titleWidth = doc.getTextWidth(title);
  const titleY = margin + 5;
  doc.text(title, (pageWidth - titleWidth) / 2, titleY);
  return titleY + 10;
}

// 处理无表头的情况
function handleNoHeader(doc: any, data: PackingData, margin: number, pageWidth: number): number {
  doc.setFontSize(14);
  safeSetCnFont(doc, 'bold', 'export');
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
  }>,
  mergedMarksCells: Array<{
    startRow: number;
    endRow: number;
    content: string;
    isMerged: boolean;
  }>,
  visibleCols?: string[]
): Promise<number> {
  // 计算页面宽度和边距
  const pageWidth = doc.internal.pageSize.width;
  const isLandscape = doc.internal.pageSize.width > doc.internal.pageSize.height;
  // 增加边距，避免表格太靠近纸边
  const margin = isLandscape ? 15 : 20; // 横向模式15mm，纵向模式20mm
  const tableWidth = pageWidth - (margin * 2); // 表格实际可用宽度

  // 设置列宽度和对齐方式
  const columnStyles: Record<string, { halign: 'center' | 'left' | 'right'; cellWidth: number }> = {};
  
  // 定义各列的相对宽度权重
  const baseWidths = {
    marks: isLandscape ? 8 : 7, // 进一步增加marks列宽度，横向模式8，纵向模式7
    no: 2, // 减少序号列宽度
    description: data.showHsCode ? (isLandscape ? 13 : 11) : (isLandscape ? 17 : 15), // 适当减少描述列宽度
    hsCode: 5, // 减少HS Code列宽度
    qty: 3, // 减少数量列宽度
    unit: 3, // 减少单位列宽度
    unitPrice: 4, // 减少单价列宽度
    amount: 5, // 减少金额列宽度
    netWeight: 4, // 减少净重列宽度
    grossWeight: 4, // 减少毛重列宽度
    pkgs: 3, // 减少包装数列宽度
    dimensions: 5 // 减少尺寸列宽度
  };

  // 确定显示的列（优先使用页面设置，回退到数据开关）
  const showMarks = visibleCols ? visibleCols.includes('marks') : false; // 默认不显示marks列，与表格保持一致
  const showDescription = visibleCols ? visibleCols.includes('description') : true;
  const showHsCode = visibleCols ? visibleCols.includes('hsCode') : data.showHsCode;
  const showQuantity = visibleCols ? visibleCols.includes('quantity') : true;
  const showUnit = visibleCols ? visibleCols.includes('unit') : true;
  const showUnitPrice = visibleCols ? visibleCols.includes('unitPrice') : data.showPrice;
  const showAmount = visibleCols ? visibleCols.includes('amount') : data.showPrice;
  const showNetWeight = visibleCols ? visibleCols.includes('netWeight') : data.showWeightAndPackage;
  const showGrossWeight = visibleCols ? visibleCols.includes('grossWeight') : data.showWeightAndPackage;
  const showPackageQty = visibleCols ? visibleCols.includes('packageQty') : data.showWeightAndPackage;
  const showDimensions = visibleCols ? visibleCols.includes('dimensions') : false; // 默认不显示尺寸列，与表格保持一致

  // 计算总权重，基于实际显示的列
  let totalWeight = 0;
  if (showMarks) totalWeight += baseWidths.marks;
  totalWeight += baseWidths.no;
  if (showDescription) totalWeight += baseWidths.description;
  if (showHsCode) totalWeight += baseWidths.hsCode;
  if (showQuantity) totalWeight += baseWidths.qty;
  if (showUnit) totalWeight += baseWidths.unit;
  if (showUnitPrice) totalWeight += baseWidths.unitPrice;
  if (showAmount) totalWeight += baseWidths.amount;
  if (showNetWeight) totalWeight += baseWidths.netWeight;
  if (showGrossWeight) totalWeight += baseWidths.grossWeight;
  if (showPackageQty) totalWeight += baseWidths.pkgs;
  if (showDimensions) totalWeight += baseWidths.dimensions;

  // 计算单位权重对应的宽度
  const unitWidth = tableWidth / totalWeight;

  // 表格基础样式
  const tableStyles = {
    fontSize: isLandscape ? 7 : 8, // 横向模式下使用稍小的字体
    cellPadding: { top: 1, bottom: 1, left: 1, right: 1 }, // 减少上下内边距
    lineColor: [0, 0, 0] as [number, number, number],
    lineWidth: 0.1,
    font: 'NotoSansSC',
    valign: 'middle' as const,
    minCellHeight: 6 // 减少单元格最小高度
  };

  // 表头样式
  const headStyles = {
    fillColor: [255, 255, 255] as [number, number, number],
    textColor: [0, 0, 0] as [number, number, number],
    fontSize: isLandscape ? 7 : 8, // 横向模式下使用稍小的字体
    fontStyle: 'bold' as const,
    halign: 'center' as const,
    font: 'NotoSansSC',
    valign: 'middle' as const,
    cellPadding: { top: 1, bottom: 1, left: 1, right: 1 }, // 减少上下内边距
    minCellHeight: 8 // 减少表头高度
  };

  // 设置每列的宽度和对齐方式
  let currentColumnIndex = 0;
  
  if (showMarks) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.marks * unitWidth 
    };
    currentColumnIndex++;
  }
  
  columnStyles[currentColumnIndex] = { 
    halign: 'center' as const, 
    cellWidth: baseWidths.no * unitWidth 
  };
  currentColumnIndex++;
  
  columnStyles[currentColumnIndex] = { 
    halign: 'center' as const, 
    cellWidth: baseWidths.description * unitWidth 
  };
  currentColumnIndex++;

  if (showHsCode) {
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
  if (showUnitPrice) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.unitPrice * unitWidth 
    };
    currentColumnIndex++;
  }
  if (showAmount) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.amount * unitWidth 
    };
    currentColumnIndex++;
  }

  // Weight 和 Package 相关列
  if (showNetWeight) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.netWeight * unitWidth 
    };
    currentColumnIndex++;
  }
  if (showGrossWeight) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.grossWeight * unitWidth 
    };
    currentColumnIndex++;
  }
  if (showPackageQty) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.pkgs * unitWidth 
    };
    currentColumnIndex++;
  }

  // Dimensions 列
  if (showDimensions) {
    columnStyles[currentColumnIndex] = { 
      halign: 'center' as const, 
      cellWidth: baseWidths.dimensions * unitWidth 
    };
  }

  // 准备表头
  const headers: string[][] = [[]];
  if (showMarks) headers[0].push('Marks');
  headers[0].push('No.');
  if (showDescription) headers[0].push('Description');
  if (showHsCode) headers[0].push('HS Code');
  if (showQuantity) headers[0].push('Qty');
  if (showUnit) headers[0].push('Unit');
  if (showUnitPrice) headers[0].push('U/Price');
  if (showAmount) headers[0].push('Amount');
  if (showNetWeight) headers[0].push('N.W.(kg)');
  if (showGrossWeight) headers[0].push('G.W.(kg)');
  if (showPackageQty) headers[0].push('Pkgs');
  if (showDimensions) headers[0].push(`Dimensions(${data.dimensionUnit})`);

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

  // 直接使用表格中存储的单位值，不做任何处理

  let rowIndex = 0;
  data.items.forEach((item) => {
    const row: CellInput[] = [];
    
    if (showMarks) {
      // 处理Marks列的合并
      const marksMergedInfo = getMergedCellInfo(rowIndex, mergedMarksCells);
      console.log(`Row ${rowIndex} Marks合并信息:`, {
        item: item.marks,
        mergedInfo: marksMergedInfo,
        isStartRow: marksMergedInfo?.startRow === rowIndex,
        isMerged: marksMergedInfo?.isMerged
      });
      
      if (marksMergedInfo && marksMergedInfo.isMerged && marksMergedInfo.startRow === rowIndex) {
        // 这是合并单元格的起始行
        const rowSpan = marksMergedInfo.endRow - marksMergedInfo.startRow + 1;
        console.log(`Row ${rowIndex} 添加Marks合并单元格:`, {
          content: marksMergedInfo.content,
          rowSpan: rowSpan
        });
        row.push({
          content: marksMergedInfo.content,
          rowSpan: rowSpan,
          styles: { valign: 'middle', halign: 'center' }
        });
      } else if (marksMergedInfo && marksMergedInfo.isMerged) {
        // 这是被合并的行，跳过该列（不添加任何内容）
        console.log(`Row ${rowIndex} 跳过Marks列（被合并）`);
        // 在jspdf-autotable中，被合并的行会自动处理
      } else {
        // 普通行，正常显示
        console.log(`Row ${rowIndex} 添加Marks普通单元格:`, item.marks || '');
        row.push(item.marks || '');
      }
    }
    row.push(rowIndex + 1); // 用当前序号
    
    if (showDescription) row.push(item.description);
    if (showHsCode) row.push(item.hsCode);
    
    console.log(`PDF生成 - Row ${rowIndex} 单位信息:`, {
      originalUnit: item.unit,
      quantity: item.quantity,
      itemData: {
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit
      }
    });
    
    // 确保单位有默认值，并使用单复数处理
    const unit = item.unit || 'pc';
    if (showQuantity) row.push(item.quantity.toString());
    if (showUnit) row.push(getUnitDisplay(unit, item.quantity)); // 使用单复数处理函数
    
    if (showUnitPrice) row.push(item.unitPrice.toFixed(2));
    if (showAmount) row.push(item.totalPrice.toFixed(2));
    
    // 处理重量列
    if (showNetWeight) row.push(item.netWeight.toFixed(2));
    if (showGrossWeight) row.push(item.grossWeight.toFixed(2));
      
    // 处理Package Qty列的合并
    if (showPackageQty) {
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
    
    if (showDimensions) {
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

  // 计算需要合并的列数，基于实际显示的列
  let mergeColCount = 0; // 从0开始计算
  if (showMarks) mergeColCount += 1; // 包含marks列
  mergeColCount += 1; // No.
  if (showDescription) mergeColCount += 1;
  if (showHsCode) mergeColCount += 1;
  if (showQuantity) mergeColCount += 1;
  if (showUnit) mergeColCount += 1;
  if (showUnitPrice) mergeColCount += 1;
  // 不包括Amount列，因为Other Fee的金额要显示在Amount列

  // 添加 other fees 行
  if (showAmount && data.otherFees && data.otherFees.length > 0) {
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
          safeSetCnFont(doc, 'bold', 'export');
          doc.setFontSize(fontSize);
          doc.text(text, margin +5, tableData.cursor?.y ? tableData.cursor.y + 6 : startY + 6);
        }
      }
    }
  }) as unknown) as number;

  return finalY;
} 