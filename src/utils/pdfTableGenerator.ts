import { UserOptions, RowInput, Styles } from 'jspdf-autotable';
import { QuotationData } from '@/types/quotation';
import jsPDF, { ImageProperties } from 'jspdf';

// 扩展jsPDF类型
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: UserOptions) => void;
  getNumberOfPages: () => number;
}

// 默认单位列表（需要单复数变化的单位）
const defaultUnits = ['pc', 'set', 'length'];

// 处理单位的单复数
const getUnitDisplay = (baseUnit: string, quantity: number) => {
  const singularUnit = baseUnit.replace(/s$/, '');
  if (defaultUnits.includes(singularUnit)) {
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
): { [key: string]: Partial<Styles> } => {
  // 计算表格可用总宽度（减去左右边距，但增加两边各5px的扩展）
  const availableWidth = pageWidth - (margin * 2) + 10;
  
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
  const unitWidth = availableWidth / totalWeight;

  // 返回列宽度配置
  return {
    '0': { 
      halign: 'center' as const, 
      cellWidth: weights.no * unitWidth,
      minCellWidth: 8, // 增加最小宽度确保"No."不换行
      cellPadding: { left: 1, right: 1, top: 2, bottom: 2 }
    },
    '1': { 
      halign: 'center' as const, 
      cellWidth: weights.partName * unitWidth,
      cellPadding: { left: 2, right: 2, top: 2, bottom: 2 }
    },
    ...(showDescription ? {
      '2': { 
        halign: 'center' as const, 
        cellWidth: weights.description * unitWidth,
        cellPadding: { left: 2, right: 2, top: 2, bottom: 2 }
      }
    } : {}),
    [showDescription ? '3' : '2']: { 
      halign: 'center' as const, 
      cellWidth: weights.qty * unitWidth,
      minCellWidth: 12, // 增加最小宽度确保"Q'TY"不换行
      cellPadding: { left: 1, right: 1, top: 2, bottom: 2 }
    },
    [showDescription ? '4' : '3']: { 
      halign: 'center' as const, 
      cellWidth: weights.unit * unitWidth,
      minCellWidth: 12, // 确保单位列最小宽度
      cellPadding: { left: 1, right: 1, top: 2, bottom: 2 }
    },
    [showDescription ? '5' : '4']: { 
      halign: 'center' as const, 
      cellWidth: weights.price * unitWidth,
      minCellWidth: 12, // 确保价格列最小宽度
      cellPadding: { left: 2, right: 2, top: 2, bottom: 2 }
    },
    [showDescription ? '6' : '5']: { 
      halign: 'center' as const, 
      cellWidth: weights.amount * unitWidth,
      minCellWidth: 18, // 确保金额列最小宽度
      cellPadding: { left: 2, right: 2, top: 2, bottom: 2 }
    },
    ...(showRemarks ? {
      [showDescription ? '7' : '6']: { 
        halign: 'center' as const, 
        cellWidth: weights.remarks * unitWidth,
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
  pageWidth: number
): UserOptions => {
  // 获取计算后的列宽度配置
  const columnStyles = calculateColumnWidths(
    data.showDescription,
    data.showRemarks,
    pageWidth,
    margin
  );

  return {
    startY: currentY,
    head: [['No.', 'Part Name', ...(data.showDescription ? ['Description'] : []), 'Q\'TY', 'Unit', 'U/Price', 'Amount', ...(data.showRemarks ? ['Remarks'] : [])]],
    body: [
      // 常规商品行
      ...data.items.map((item, index) => [
        {
          content: (index + 1).toString(),
          styles: { halign: 'center' as const }
        },
        {
          content: item.partName,
          styles: item.highlight?.partName ? { textColor: [255, 0, 0] } : {}
        },
        ...(data.showDescription ? [{
          content: item.description || '',
          styles: item.highlight?.description ? { textColor: [255, 0, 0] } : {}
        }] : []),
        {
          content: item.quantity.toString(),
          styles: { 
            halign: 'center' as const,
            ...(item.highlight?.quantity ? { textColor: [255, 0, 0] } : {})
          }
        },
        {
          content: getUnitDisplay(item.unit || '', item.quantity || 0),
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
        },
        ...(data.showRemarks ? [{
          content: item.remarks || '',
          styles: item.highlight?.remarks ? { textColor: [255, 0, 0] } : {}
        }] : [])
      ]),
      // Other Fees 行
      ...(data.otherFees || []).map(fee => [
        {
          content: fee.description,
          colSpan: data.showDescription ? 6 : 5,
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
        },
        ...(data.showRemarks ? [{
          content: fee.remarks || '',
          styles: {
            halign: 'center' as const,
            ...(fee.highlight?.remarks ? { textColor: [255, 0, 0] } : {})
          }
        }] : [])
      ])
    ] as unknown as RowInput[],
    columnStyles,
    margin: { left: margin - 5, right: margin - 5, bottom: 20 }, // 向两边扩展5px
    tableWidth: pageWidth - (margin * 2) + 10, // 增加10px的总宽度
    theme: 'plain',
    showHead: 'everyPage',
    styles: {
      fontSize: 8,
      cellPadding: { left: 2, right: 2, top: 2, bottom: 2 },
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      font: 'NotoSansSC',
      valign: 'middle',
      minCellHeight: 6,
      overflow: 'linebreak' as const // 确保内容会自动换行
    },
    headStyles: {
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      font: 'NotoSansSC',
      valign: 'middle',
      minCellHeight: 8,
      cellPadding: { left: 2, right: 2, top: 2, bottom: 2 },
      overflow: 'visible' as const // 防止标题文字被截断
    },
    didParseCell: (data) => {
      const pageHeight = data.doc.internal.pageSize.height;
      const bottomMargin = 25;
      
      if (data.row.index > 0 && 
          data.cursor && 
          (data.cell.y + data.cell.height) > (pageHeight - bottomMargin)) {
        data.cursor.y = 0;
      }
    },
    didDrawPage: (data) => {
      // 清除页面底部区域并添加页码的通用函数
      const addPageNumber = () => {
        const pageHeight = doc.internal.pageSize.height;
        // 清除页面底部区域
        doc.setFillColor(255, 255, 255);
        doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        
        // 添加页码
        const totalPages = doc.getNumberOfPages();
        const str = `Page ${data.pageNumber} of ${totalPages}`;
        doc.setFontSize(8);
        doc.setFont('NotoSansSC', 'normal');
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