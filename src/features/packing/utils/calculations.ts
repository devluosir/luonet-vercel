import { PackingData, PackingTotals, PackingItem } from '../types';
import { getUnitDisplay as getUnitDisplayFromUtils } from '@/utils/unitUtils';

/**
 * 计算总价
 */
export const calculateTotalPrice = (quantity: number, unitPrice: number): number => {
  return quantity * unitPrice;
};

/**
 * 处理单位的单复数（使用统一的工具函数）
 */
export const getUnitDisplay = (baseUnit: string, quantity: number): string => {
  return getUnitDisplayFromUtils(baseUnit, quantity);
};

/**
 * 计算箱单总计
 */
export const calculatePackingTotals = (
  data: PackingData, 
  mergedCells?: { 
    packageQty: Array<{ startRow: number; endRow: number; isMerged: boolean }>; 
    dimensions: Array<{ startRow: number; endRow: number; isMerged: boolean }>;
    marks: Array<{ startRow: number; endRow: number; isMerged: boolean }>;
  }
): PackingTotals => {
  let totalPrice = 0;
  let netWeight = 0;
  let grossWeight = 0;
  let packageQty = 0;
  const processedGroups = new Set<string>();
  const processedMergedRows = new Set<number>();
  
  // 处理合并单元格，标记已合并的行
  if (mergedCells) {
    const allMergedCells = [
      ...mergedCells.packageQty,
      ...mergedCells.dimensions,
      ...mergedCells.marks
    ];
    
    allMergedCells.forEach(cell => {
      if (cell.isMerged) {
        for (let i = cell.startRow; i <= cell.endRow; i++) {
          processedMergedRows.add(i);
        }
      }
    });
  }

  data.items.forEach((item, index) => {
    totalPrice += item.totalPrice;
    
    // 检查是否在合并单元格中且不是合并的起始行
    const isInMergedCell = processedMergedRows.has(index);
    const isMergeStart = mergedCells ? [
      ...mergedCells.packageQty,
      ...mergedCells.dimensions,
      ...mergedCells.marks
    ].some(cell => cell.isMerged && cell.startRow === index) : false;
    
    // 如果不在合并单元格中，或者是合并的起始行，则计算
    if (!isInMergedCell || isMergeStart) {
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
    }
  });

  // 添加其他费用到总计
  if (data.showPrice && data.otherFees) {
    const feesTotal = data.otherFees.reduce((sum, fee) => sum + fee.amount, 0);
    totalPrice += feesTotal;
  }

  return { totalPrice, netWeight, grossWeight, packageQty };
};

/**
 * 计算总金额（包括其他费用）
 */
export const calculateTotalAmount = (data: PackingData): number => {
  const totals = calculatePackingTotals(data);
  return totals.totalPrice;
};

/**
 * 创建新的商品行
 */
export const createNewPackingItem = (index: number, data: PackingData): PackingItem => {
  const newItem: PackingItem = {
    id: index + 1,
    serialNo: (index + 1).toString(),
    marks: '', // 新增marks字段默认值
    description: '',
    hsCode: '',
    quantity: 0,
    unitPrice: 0,
    totalPrice: 0,
    netWeight: 0,
    grossWeight: 0,
    packageQty: 0,
    dimensions: '',
    unit: 'pc'
  };

  // 如果在分组模式中，为新行分配组ID
  if (data.isInGroupMode && data.currentGroupId) {
    newItem.groupId = data.currentGroupId;
  }

  return newItem;
};

/**
 * 更新商品行的单位显示
 */
export const updateItemUnitDisplay = (item: PackingItem, quantity: number): PackingItem => {
  const baseUnit = item.unit.replace(/s$/, '');
  const newUnit = getUnitDisplay(baseUnit, quantity);

  return {
    ...item,
    unit: newUnit,
    quantity: Math.floor(quantity),
    totalPrice: calculateTotalPrice(Math.floor(quantity), item.unitPrice)
  };
};

/**
 * 更新商品行的单价
 */
export const updateItemUnitPrice = (item: PackingItem, unitPrice: number): PackingItem => {
  return {
    ...item,
    unitPrice: parseFloat(unitPrice.toString()) || 0,
    totalPrice: calculateTotalPrice(item.quantity, parseFloat(unitPrice.toString()) || 0)
  };
};

/**
 * 创建新的其他费用项
 */
export const createNewOtherFee = (): { id: number; description: string; amount: number } => {
  return {
    id: Date.now(),
    description: '',
    amount: 0
  };
};
