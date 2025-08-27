import 'jspdf-autotable';
import { UserOptions, RowInput, Styles } from 'jspdf-autotable';

// 扩展Styles类型以支持maxCellWidth
interface ExtendedStyles extends Partial<Styles> {
  maxCellWidth?: number;
}
import { QuotationData, LineItem } from '@/types/quotation';
import jsPDF from 'jspdf';
import { safeSetFont, getFontName } from './pdf/ensureFont';

// 扩展jsPDF类型
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: UserOptions) => void;
  getNumberOfPages: () => number;
}

// 添加合并单元格相关的类型定义
interface MergedCellInfo {
  startRow: number;
  endRow: number;
  content: string;
  isMerged: boolean;
}

// 计算合并单元格信息（与 ItemsTable 中的逻辑保持一致）
const calculateMergedCells = (
  items: LineItem[], 
  mode: 'auto' | 'manual' = 'auto', 
  column: 'remarks' | 'description' = 'remarks',
  manualMergedCells?: MergedCellInfo[]
): MergedCellInfo[] => {
  const mergedCells: MergedCellInfo[] = [];
  
  if (items.length === 0) {
    return mergedCells;
  }
  
  if (mode === 'manual') {
    // 手动模式：先创建所有独立单元格
    items.forEach((item, index) => {
      mergedCells.push({
        startRow: index,
        endRow: index,
        content: column === 'remarks' ? (item.remarks || '') : (item.description || ''),
        isMerged: false
      });
    });
    
    // 如果有手动合并数据，应用合并
    if (manualMergedCells && manualMergedCells.length > 0) {
      // 移除被合并的独立单元格
      manualMergedCells.forEach(manualCell => {
        for (let i = manualCell.startRow; i <= manualCell.endRow; i++) {
          const existingIndex = mergedCells.findIndex(cell => cell.startRow === i);
          if (existingIndex !== -1) {
            mergedCells.splice(existingIndex, 1);
          }
        }
        // 添加合并的单元格
        mergedCells.push(manualCell);
      });
    }
    
    return mergedCells;
  }
  
  // 自动模式：相同内容的相邻行自动合并
  let currentStart = 0;
  let currentContent = column === 'remarks' ? (items[0]?.remarks || '') : (items[0]?.description || '');

  for (let i = 1; i <= items.length; i++) {
    const currentItem = items[i];
    const prevItem = items[i - 1];
    
    const prevContent = column === 'remarks' ? (prevItem.remarks || '') : (prevItem.description || '');
    const currentContentValue = currentItem ? (column === 'remarks' ? (currentItem.remarks || '') : (currentItem.description || '')) : '';
    
    // 修复合并逻辑：只有相同且非空的内容才合并，空行不合并
    const shouldEndMerge = !currentItem || 
                          (currentContentValue !== prevContent) ||
                          (prevContent === '' && currentContentValue === ''); // 空行不合并

    if (shouldEndMerge) {
      // 结束当前合并组
      if (i - 1 > currentStart) {
        // 有合并的单元格
        mergedCells.push({
          startRow: currentStart,
          endRow: i - 1,
          content: currentContent,
          isMerged: true
        });
      } else {
        // 单个单元格
        mergedCells.push({
          startRow: currentStart,
          endRow: currentStart,
          content: currentContent,
          isMerged: false
        });
      }

      if (currentItem) {
        // 开始新的合并组
        currentStart = i;
        currentContent = currentContentValue;
      }
    }
  }

  return mergedCells;
};

// 检查指定行是否应该渲染 remark 单元格
const shouldRenderRemarkCell = (rowIndex: number, mergedCells: MergedCellInfo[]): boolean => {
  return mergedCells.some(cell => cell.startRow === rowIndex);
};

// 获取指定行的合并信息
const getMergedCellInfo = (rowIndex: number, mergedCells: MergedCellInfo[]): MergedCellInfo | null => {
  return mergedCells.find(cell => cell.startRow === rowIndex) || null;
};

// 默认单位列表（需要单复数变化的单位）
const defaultUnits = ['pc', 'set', 'length'];

// 处理单位的单复数
const getUnitDisplay = (baseUnit: string, quantity: number, customUnits: string[] = []) => {
  const singularUnit = baseUnit.replace(/s$/, '');
  // 检查是否是自定义单位
  const isCustomUnit = customUnits.includes(baseUnit) || customUnits.includes(singularUnit);
  
  if (defaultUnits.includes(singularUnit) && !isCustomUnit) {
    return quantity > 1 ? `${singularUnit}s` : singularUnit;
  }
  return baseUnit; // 自定义单位不变化单复数
};

// 计算列宽度配置
const calculateColumnWidths = (
  showDescription: boolean,
  showRemarks: boolean,
  pageWidth: number,
  margin: number
): { [key: string]: ExtendedStyles } => {
  // 计算页面可用宽度
  const pageWidth_mm = pageWidth;
  const left = margin;
  const right = margin;
  const usable = pageWidth_mm - left - right;
  
  // 定义基础权重配置 - 调整以确保某些列不会换行
  const baseWeights = {
    no: 5,           // 序号列 - 增加权重确保"No."不换行
    partName: 22,    // 品名列 - 可以占用较大空间
    description: 24, // 描述列 - 可以占用较大空间
    qty: 6,         // 数量列 - 增加权重确保"Q'TY"不换行
    unit: 7,        // 单位列 - 调整确保不换行
    price: 9,      // 单价列
    amount: 11,      // 金额列 - 调整确保不换行
    remarks: 16     // 备注列
  };

  // 根据显示的列动态调整权重
  let weights = { ...baseWeights };
  let totalWeight = 0;

  // 如果不显示描述列，增加其他列的权重
  if (!showDescription) {
    weights.partName = 32;  // 显著增加品名列的权重
    weights.price = 12;     // 略微增加价格列的权重
    totalWeight += weights.no + weights.partName + weights.qty + weights.unit + weights.price + weights.amount;
  } else {
    totalWeight += weights.no + weights.partName + weights.description + weights.qty + weights.unit + weights.price + weights.amount;
  }

  if (showRemarks) {
    totalWeight += weights.remarks;
  }

  // 计算单位权重对应的实际宽度
  const unitWidth = usable / totalWeight;

  // 返回列宽度配置，添加容错机制
  return {
    '0': { 
      halign: 'center' as const, 
      cellWidth: weights.no * unitWidth,
      minCellWidth: 8, // 增加最小宽度确保"No."不换行
      maxCellWidth: 12, // 添加最大宽度限制
      cellPadding: { left: 1, right: 1, top: 2, bottom: 2 }
    },
    '1': { 
      halign: 'center' as const, 
      cellWidth: weights.partName * unitWidth,
      minCellWidth: 40, // 品名列最小宽度
      maxCellWidth: 80, // 品名列最大宽度，防止过长
      cellPadding: { left: 2, right: 2, top: 2, bottom: 2 }
    },
    ...(showDescription ? {
      '2': { 
        halign: 'center' as const, 
        cellWidth: weights.description * unitWidth,
        minCellWidth: 50, // 描述列最小宽度
        maxCellWidth: 100, // 描述列最大宽度
        cellPadding: { left: 2, right: 2, top: 2, bottom: 2 }
      }
    } : {}),
    [showDescription ? '3' : '2']: { 
      halign: 'center' as const, 
      cellWidth: weights.qty * unitWidth,
      minCellWidth: 12, // 增加最小宽度确保"Q'TY"不换行
      maxCellWidth: 20, // 数量列最大宽度
      cellPadding: { left: 1, right: 1, top: 2, bottom: 2 }
    },
    [showDescription ? '4' : '3']: { 
      halign: 'center' as const, 
      cellWidth: weights.unit * unitWidth,
      minCellWidth: 12, // 确保单位列最小宽度
      maxCellWidth: 18, // 单位列最大宽度
      cellPadding: { left: 1, right: 1, top: 2, bottom: 2 }
    },
    [showDescription ? '5' : '4']: { 
      halign: 'center' as const, 
      cellWidth: weights.price * unitWidth,
      minCellWidth: 12, // 确保价格列最小宽度
      maxCellWidth: 25, // 价格列最大宽度
      cellPadding: { left: 2, right: 2, top: 2, bottom: 2 }
    },
    [showDescription ? '6' : '5']: { 
      halign: 'center' as const, 
      cellWidth: weights.amount * unitWidth,
      minCellWidth: 18, // 确保金额列最小宽度
      maxCellWidth: 30, // 金额列最大宽度
      cellPadding: { left: 2, right: 2, top: 2, bottom: 2 }
    },
    ...(showRemarks ? {
      [showDescription ? '7' : '6']: { 
        halign: 'center' as const, 
        cellWidth: weights.remarks * unitWidth,
        minCellWidth: 30, // 备注列最小宽度
        maxCellWidth: 60, // 备注列最大宽度
        cellPadding: { left: 2, right: 2, top: 2, bottom: 2 }
      }
    } : {})
  };
};

// 生成表格配置
export const generateTableConfig = (
  data: QuotationData,
  doc: ExtendedJsPDF,
  currentY: number,
  margin: number,
  pageWidth: number,
  mode: 'preview' | 'export' = 'export',
  visibleCols?: string[], // 新增可选参数：从页面列偏好读取
  descriptionMergeMode: 'auto' | 'manual' = 'auto', // Description列合并模式
  remarksMergeMode: 'auto' | 'manual' = 'auto', // Remarks列合并模式
  manualMergedCells?: {
    description: MergedCellInfo[];
    remarks: MergedCellInfo[];
  } // 手动合并数据
): UserOptions => {
  // 检查字体是否可用
  const fontList = doc.getFontList();
  const notoSansSC = fontList['NotoSansSC'];
  const useChineseFont = notoSansSC && notoSansSC.includes('normal');
  const fontName = useChineseFont ? 'NotoSansSC' : 'helvetica';
  // 计算页面可用宽度，表格左右边距向外扩展5mm
  const pageWidth_mm = pageWidth;
  const tableMarginReduction = 5; // 向外扩展5mm
  const adjustedMargin = margin - tableMarginReduction;
  const left = adjustedMargin;
  const right = adjustedMargin;
  const usable = pageWidth_mm - left - right;
  
  // 确定显示的列（优先使用页面偏好，回退到数据字段）
  const showDescription = visibleCols 
    ? visibleCols.includes('description')
    : (data.showDescription ?? true);
  const showRemarks = visibleCols 
    ? visibleCols.includes('remarks')
    : (data.showRemarks ?? false);

  // 获取计算后的列宽度配置，使用调整后的边距
  const columnStyles = calculateColumnWidths(
    showDescription,
    showRemarks,
    pageWidth,
    adjustedMargin
  );

  // 计算合并单元格信息
  const mergedRemarksCells = calculateMergedCells(
    data.items || [], 
    remarksMergeMode, 
    'remarks',
    manualMergedCells?.remarks
  );
  const mergedDescriptionCells = calculateMergedCells(
    data.items || [], 
    descriptionMergeMode, 
    'description',
    manualMergedCells?.description
  );

  // 调试日志
  if (process.env.NODE_ENV === 'development') {
    console.log('[PDF] Description合并模式:', descriptionMergeMode);
    console.log('[PDF] 手动合并数据:', manualMergedCells?.description);
    console.log('[PDF] 计算后的Description合并单元格:', mergedDescriptionCells);
  }

  // 检查指定行是否应该渲染 description 单元格
  const shouldRenderDescriptionCell = (rowIndex: number, mergedCells: MergedCellInfo[]): boolean => {
    // Description列取消合并单元格功能，始终显示所有单元格
    return true;
  };

  // 获取指定行的 description 合并信息
  const getMergedDescriptionCellInfo = (rowIndex: number, mergedCells: MergedCellInfo[]): MergedCellInfo | null => {
    // Description列取消合并单元格功能，始终返回null
    return null;
  };


  return {
    startY: currentY,
    head: [['No.', 'Part Name', ...(showDescription ? ['Description'] : []), 'Q\'TY', 'Unit', 'U/Price', 'Amount', ...(showRemarks ? ['Remarks'] : [])]],
    body: [
      // 常规商品行（支持合并单元格）
      ...(data.items || []).map((item, index) => {
        const row: any[] = [
          {
            content: (index + 1).toString(),
            styles: { halign: 'center' as const }
          },
          {
            content: item.partName,
            styles: item.highlight?.partName ? { textColor: [255, 0, 0] } : {}
          },
          {
            content: item.quantity.toString(),
            styles: { 
              halign: 'center' as const,
              ...(item.highlight?.quantity ? { textColor: [255, 0, 0] } : {})
            }
          },
          {
            content: getUnitDisplay(item.unit || 'pc', item.quantity || 0, data.customUnits || []),
            styles: { 
              halign: 'center' as const,
              ...(item.highlight?.unit ? { textColor: [255, 0, 0] } : {})
            }
          },
          {
            content: item.unitPrice.toFixed(2),
            styles: { 
              halign: 'center' as const,
              ...(item.highlight?.unitPrice ? { textColor: [255, 0, 0] } : {})
            }
          },
          {
            content: item.amount.toFixed(2),
            styles: { 
              halign: 'center' as const,
              ...(item.highlight?.amount ? { textColor: [255, 0, 0] } : {})
            }
          }
        ];

        // 添加 description 列（取消合并单元格功能）
        if (showDescription) {
          // 在Part Name之后插入Description列
          row.splice(2, 0, {
            content: item.description || '',
            styles: {
              halign: 'center' as const,
              ...(item.highlight?.description ? { textColor: [255, 0, 0] } : {})
            }
          });
        }

        // 添加 remarks 列（支持合并单元格）
        if (showRemarks && shouldRenderRemarkCell(index, mergedRemarksCells)) {
          const mergedInfo = getMergedCellInfo(index, mergedRemarksCells);
          const rowSpan = mergedInfo ? mergedInfo.endRow - mergedInfo.startRow + 1 : 1;
          const isMerged = mergedInfo?.isMerged || false;
          
          row.push({
            content: mergedInfo?.content || '',
            rowSpan: isMerged ? rowSpan : undefined,
            styles: {
              halign: 'center' as const,
              ...(item.highlight?.remarks ? { textColor: [255, 0, 0] } : {}),
              // 移除合并单元格的特殊样式，保持与普通单元格完全一致
              // ...(isMerged ? { 
              //   fillColor: [240, 248, 255], // 浅蓝色背景
              //   // 移除蓝色边框，保持与普通单元格一致的黑色边框
              //   // lineColor: [59, 130, 246],  // 蓝色边框
              //   // lineWidth: 0.5
              // } : {})
            }
          });
        }



        return row;
      }),
      // Other Fees 行
      ...(data.otherFees || []).map((fee, index) => {
        const row: any[] = [
          {
            content: ((data.items?.length || 0) + index + 1).toString(), // 连续主表序号
            styles: { halign: 'center' as const }
          },
          {
            content: fee.description,
            colSpan: showDescription ? 5 : 4, // 合并Part Name到U/Price列（不包括Amount列）
            styles: { 
              halign: 'center' as const,
              ...(fee.highlight?.description ? { textColor: [255, 0, 0] } : {})
            }
          },
          {
            content: fee.amount.toFixed(2),
            styles: {
              halign: 'center' as const,
              ...(fee.highlight?.amount ? { textColor: [255, 0, 0] } : {})
            }
          }
        ];

        // 添加 remarks 列（如果显示）
        if (showRemarks) {
          row.push({
            content: fee.remarks || '',
            styles: {
              halign: 'center' as const,
              ...(fee.highlight?.remarks ? { textColor: [255, 0, 0] } : {})
            }
          });
        }

        return row;
      }),
    ] as unknown as RowInput[],
    margin: { left: margin - 5, right: margin - 5, bottom: 20 }, // 左右边距向外扩展5mm
    tableWidth: pageWidth - ((margin - 5) * 2), // 使用调整后的边距计算表格宽度
    theme: 'plain',
    showHead: 'everyPage',
    styles: {
      fontSize: 8,
      cellPadding: { left: 2, right: 2, top: 2, bottom: 2 },
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      font: fontName, // 使用实际可用的字体
      fontStyle: 'normal' as const, // 明确指定normal
      valign: 'middle' as const,
      minCellHeight: 6,
      overflow: 'linebreak' as const, // 确保内容会自动换行
      cellWidth: 'wrap' as const // 内容自动换行
    },
    headStyles: {
      fontSize: 8,
      fontStyle: 'bold' as const, // 明确指定bold
      halign: 'center' as const,
      font: fontName, // 使用实际可用的字体
      valign: 'middle' as const,
      minCellHeight: 8,
      cellPadding: { left: 2, right: 2, top: 2, bottom: 2 },
      overflow: 'visible' as const // 防止标题文字被截断
    },
    // 使用精确计算的列样式配置
    columnStyles: columnStyles,
    didParseCell: (data) => {
      // 确保每个单元格都使用正确的字体
      if (fontName === 'NotoSansSC') {
        data.doc.setFont('NotoSansSC', 'normal');
      }
      
      const pageHeight = data.doc.internal.pageSize.height;
      const bottomMargin = 25;
      
      if (data.row.index > 0 && 
          data.cursor && 
          (data.cell.y + data.cell.height) > (pageHeight - bottomMargin)) {
        data.cursor.y = 0;
      }
      
      // 对异常长词（无空格）做软断（中文一般没问题）
      if (data.cell.raw && typeof data.cell.raw === 'string') {
        data.cell.text = [data.cell.raw.replace(/(\S{24})/g, '$1\u200b')];
      }
    },
    didDrawPage: (data) => {
      // 确保每页都使用正确的字体
      if (fontName === 'NotoSansSC') {
        doc.setFont('NotoSansSC', 'normal');
      }
      
      // 清除页面底部区域并添加页码的通用函数
      const addPageNumber = () => {
        const pageHeight = doc.internal.pageSize.height;
        // 清除页面底部区域
        doc.setFillColor(255, 255, 255);
        doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        
        // 添加页码（使用安全字体设置）
        const totalPages = doc.getNumberOfPages();
        const str = `Page ${data.pageNumber} of ${totalPages}`;
        doc.setFontSize(8);
        safeSetFont(doc, 'NotoSansSC', 'normal', mode);
        doc.text(str, pageWidth - margin, pageHeight - 12, { align: 'right' });
      };

      // 在每页绘制时添加页码
      addPageNumber();
    },
    didDrawCell: (data) => {
      // 确保绘制所有单元格的边框
      const cell = data.cell;
      const doc = data.doc;
      
      // 绘制单元格的所有边框
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      doc.line(cell.x, cell.y, cell.x + cell.width, cell.y); // 上边框
      doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height); // 下边框
      doc.line(cell.x, cell.y, cell.x, cell.y + cell.height); // 左边框
      doc.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height); // 右边框
    }
  };
};

/**
 * AutoTable选项标准化函数 - 防回归保险丝
 * 自动将任何顶层的overflow选项移动到styles中，避免deprecated警告
 */
type AutoTableOptions = UserOptions;

export function normalizeAutoTableOptions(opts: AutoTableOptions): AutoTableOptions {
  const { overflow, styles, headStyles, bodyStyles, ...rest } = opts as any;
  
  if (overflow && typeof overflow === 'string') {
    console.warn('[AutoTable] 检测到顶层overflow配置，自动移动到styles中以避免deprecated警告');
    
    // 将overflow移动到各个样式配置中
    const normalizedStyles = { ...(styles || {}), overflow };
    const normalizedHeadStyles = { ...(headStyles || {}), overflow };
    const normalizedBodyStyles = { ...(bodyStyles || {}), overflow };
    
    return {
      ...rest,
      styles: normalizedStyles,
      headStyles: normalizedHeadStyles,
      bodyStyles: normalizedBodyStyles
    };
  }
  
  return opts;
}

/**
 * 安全的AutoTable调用包装函数
 * 使用此函数替代直接调用autoTable，确保配置符合最新标准
 */
export function safeAutoTable(doc: any, options: AutoTableOptions): void {
  const normalizedOptions = normalizeAutoTableOptions(options);
  doc.autoTable(normalizedOptions);
} 