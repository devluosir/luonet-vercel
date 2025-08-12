'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTablePrefsHydrated } from '../state/useTablePrefs';
import { OtherFeesTable } from '../../../components/packinglist/OtherFeesTable';

// 表格输入框基础样式
const baseInputClassName = `w-full px-2 py-1.5 rounded-lg
  bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-sm
  border border-gray-200/60 dark:border-gray-600/60
  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
  focus:border-[#007AFF] dark:focus:border-[#0A84FF]
  focus:bg-white dark:focus:bg-[#1c1c1e]
  text-[13px] leading-relaxed text-gray-800 dark:text-gray-100
  placeholder:text-gray-400/70 dark:placeholder:text-gray-500/70
  transition-all duration-200 ease-out
  hover:border-gray-300/80 dark:hover:border-gray-500/80
  hover:bg-white/90 dark:hover:bg-[#1c1c1e]/90`;

// 文本输入框样式
const textInputClassName = `${baseInputClassName} text-left`;

// 数字输入框样式  
const numberInputClassName = `${baseInputClassName} text-center
  [appearance:textfield] 
  [&::-webkit-outer-spin-button]:appearance-none 
  [&::-webkit-inner-spin-button]:appearance-none`;

// 选择框样式
const selectInputClassName = `${baseInputClassName} text-center cursor-pointer
  appearance-none bg-white/80 dark:bg-[#1c1c1e]/80
  bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")] 
  bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat pr-8`;

// 默认单位列表（需要单复数变化的单位）
const defaultUnits = ['pc', 'set', 'length'] as const;

interface PackingOtherFee {
  id: number;
  description: string;
  amount: number;
  highlight?: {
    description?: boolean;
    amount?: boolean;
  };
}

interface MergedCellInfo {
  startRow: number;
  endRow: number;
  content: string;
  isMerged: boolean;
}

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
  highlight?: {
    description?: boolean;
    hsCode?: boolean;
    quantity?: boolean;
    unit?: boolean;
    unitPrice?: boolean;
    totalPrice?: boolean;
    netWeight?: boolean;
    grossWeight?: boolean;
    packageQty?: boolean;
    dimensions?: boolean;
  };
}

type OtherFeeField = 'description' | 'amount';

interface PackingData {
  items: PackingItem[];
  otherFees?: PackingOtherFee[];
  showHsCode: boolean;
  showDimensions: boolean;
  showWeightAndPackage: boolean;
  showPrice: boolean;
  dimensionUnit: string;
  currency: string;
  customUnits?: string[];
  isInGroupMode?: boolean;
  currentGroupId?: string;
  // 合并单元格相关
  packageQtyMergeMode?: 'auto' | 'manual';
  dimensionsMergeMode?: 'auto' | 'manual';
  manualMergedCells?: {
    packageQty: MergedCellInfo[];
    dimensions: MergedCellInfo[];
  };
}

interface ItemsTableEnhancedProps {
  data: PackingData;
  onItemChange: (index: number, field: keyof PackingItem, value: string | number) => void;
  onDataChange?: (data: PackingData) => void;
  onAddLine: () => void;
  onDeleteLine: (index: number) => void;
  onOtherFeeChange?: (index: number, field: keyof PackingOtherFee, value: string | number) => void;
  onOtherFeeDoubleClick?: (index: number, field: 'description' | 'amount') => void;
  onDeleteOtherFee?: (index: number) => void;
  editingFeeIndex?: number | null;
  editingFeeAmount?: string;
  setEditingFeeIndex?: (index: number | null) => void;
  setEditingFeeAmount?: (amount: string) => void;
  totals: {
    totalPrice: number;
    netWeight: number;
    grossWeight: number;
    packageQty: number;
  };
  onEnterGroupMode?: () => void;
  onExitGroupMode?: () => void;
  // 合并单元格相关
  onPackageQtyMergeModeChange?: (mode: 'auto' | 'manual') => void;
  onDimensionsMergeModeChange?: (mode: 'auto' | 'manual') => void;
  onManualMergedCellsChange?: (manualMergedCells: {
    packageQty: MergedCellInfo[];
    dimensions: MergedCellInfo[];
  }) => void;
}

export const ItemsTableEnhanced: React.FC<ItemsTableEnhancedProps> = ({
  data,
  onItemChange,
  onDataChange,
  onAddLine,
  onDeleteLine,
  onOtherFeeChange,
  onOtherFeeDoubleClick,
  onDeleteOtherFee,
  editingFeeIndex,
  editingFeeAmount,
  setEditingFeeIndex,
  setEditingFeeAmount,
  totals,
  onEnterGroupMode,
  onExitGroupMode,
  // 合并单元格相关
  onPackageQtyMergeModeChange,
  onDimensionsMergeModeChange,
  onManualMergedCellsChange
}) => {
  const { visibleCols, isHydrated } = useTablePrefsHydrated();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editingQtyIndex, setEditingQtyIndex] = useState<number | null>(null);
  const [editingQtyAmount, setEditingQtyAmount] = useState<string>('');
  const [editingUnitPriceIndex, setEditingUnitPriceIndex] = useState<number | null>(null);
  const [editingUnitPriceAmount, setEditingUnitPriceAmount] = useState<string>('');
  const [editingNetWeightIndex, setEditingNetWeightIndex] = useState<number | null>(null);
  const [editingNetWeightAmount, setEditingNetWeightAmount] = useState<string>('');
  const [editingGrossWeightIndex, setEditingGrossWeightIndex] = useState<number | null>(null);
  const [editingGrossWeightAmount, setEditingGrossWeightAmount] = useState<string>('');
  const [editingPackageQtyIndex, setEditingPackageQtyIndex] = useState<number | null>(null);
  const [editingPackageQtyAmount, setEditingPackageQtyAmount] = useState<string>('');

  // 合并单元格相关状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    rowIndex: number;
    column?: 'packageQty' | 'dimensions';
  } | null>(null);

  // iOS输入框样式
  const iosCaretStyle = {
    caretColor: '#007AFF',
    WebkitTextFillColor: '#1D1D1F',
  };

  const iosCaretStyleDark = {
    caretColor: '#0A84FF',
    WebkitTextFillColor: '#F5F5F7',
  };

  // 高亮样式类
  const highlightClass = 'text-red-500 dark:text-red-400 font-medium';

  // 合并单元格计算函数
  const calculateMergedCells = (
    items: PackingItem[],
    mode: 'auto' | 'manual' = 'auto',
    column: 'packageQty' | 'dimensions' = 'packageQty'
  ): MergedCellInfo[] => {
    const mergedCells: MergedCellInfo[] = [];
    if (!items || items.length === 0) return mergedCells;

    if (mode === 'manual') {
      items.forEach((item, index) => {
        mergedCells.push({
          startRow: index,
          endRow: index,
          content: column === 'packageQty' ? item.packageQty.toString() : item.dimensions,
          isMerged: false,
        });
      });
      return mergedCells;
    }

    let currentStart = 0;
    let currentContent = column === 'packageQty' ? items[0]?.packageQty.toString() : items[0]?.dimensions;
    let currentGroupId = items[0]?.groupId;

    for (let i = 1; i <= items.length; i++) {
      const currentItem = items[i];
      const prevItem = items[i - 1];

      const prevContent = column === 'packageQty' ? prevItem?.packageQty.toString() : prevItem?.dimensions;
      const currentContentValue = currentItem
        ? column === 'packageQty' ? currentItem.packageQty.toString() : currentItem.dimensions
        : '';

      // 考虑分组因素：如果当前项和前一项属于不同组，则结束合并
      const prevGroupId = prevItem?.groupId;
      const nextGroupId = currentItem?.groupId;
      const isGroupChange = prevGroupId !== nextGroupId;

      // 如果前一项没有分组ID（分组外的行），则单独处理，不合并
      const prevIsUngrouped = !prevGroupId;
      const currentIsUngrouped = !nextGroupId;

      const shouldEndMerge = !currentItem || 
        (currentContentValue !== prevContent && currentContentValue !== '') ||
        isGroupChange ||
        prevIsUngrouped || // 如果前一项是分组外的行，结束合并
        currentIsUngrouped; // 如果当前项是分组外的行，结束合并

      if (shouldEndMerge) {
        // 如果前一项是分组外的行，单独处理
        if (prevIsUngrouped) {
          mergedCells.push({ startRow: i - 1, endRow: i - 1, content: prevContent, isMerged: false });
        } else if (i - 1 > currentStart) {
          // 分组内的合并
          mergedCells.push({ startRow: currentStart, endRow: i - 1, content: currentContent, isMerged: true });
        } else {
          mergedCells.push({ startRow: currentStart, endRow: currentStart, content: currentContent, isMerged: false });
        }
        
        if (currentItem) {
          currentStart = i;
          currentContent = currentContentValue;
          currentGroupId = nextGroupId;
        }
      }
    }
    return mergedCells;
  };

  // 合并单元格相关工具函数
  const getMergedCellInfo = (rowIndex: number, mergedCells: MergedCellInfo[]) => {
    return mergedCells.find(cell => rowIndex >= cell.startRow && rowIndex <= cell.endRow);
  };

  const shouldRenderCell = (rowIndex: number, mergedCells: MergedCellInfo[]) => {
    const mergedInfo = getMergedCellInfo(rowIndex, mergedCells);
    return !mergedInfo || mergedInfo.startRow === rowIndex;
  };

  const findContainingMergedCell = (rowIndex: number, column: 'packageQty' | 'dimensions') => {
    const mergedCells = column === 'packageQty' ? mergedPackageQtyCells : mergedDimensionsCells;
    return mergedCells.find(cell => rowIndex >= cell.startRow && rowIndex <= cell.endRow);
  };

  const findNextMergedGroupStartBeforeEnd = (currentEndRow: number, column: 'packageQty' | 'dimensions') => {
    const mergedCells = column === 'packageQty' ? mergedPackageQtyCells : mergedDimensionsCells;
    for (let i = 0; i < mergedCells.length; i++) {
      const c = mergedCells[i];
      if (c.isMerged && c.startRow > currentEndRow) return c.startRow - 1;
    }
    return data.items.length - 1;
  };

  const findPrevMergedGroupEndAfterStart = (currentStartRow: number, column: 'packageQty' | 'dimensions') => {
    const mergedCells = column === 'packageQty' ? mergedPackageQtyCells : mergedDimensionsCells;
    for (let i = mergedCells.length - 1; i >= 0; i--) {
      const c = mergedCells[i];
      if (c.isMerged && c.endRow < currentStartRow) return c.endRow + 1;
    }
    return 0;
  };

  const manualMergeRows = (startRow: number, endRow: number, column: 'packageQty' | 'dimensions' = 'packageQty') => {
    if (startRow === endRow) return;
    const field = column;
    const contents: string[] = [];
    for (let i = startRow; i <= endRow; i++) {
      const item = data.items?.[i];
      if (!item) continue;
      const content = column === 'packageQty' ? item.packageQty.toString() : item.dimensions;
      if (content) contents.push(content);
    }
    const mergedContent = contents.length > 1 ? contents.join('\n') : (contents[0] || '');

    const cell: MergedCellInfo = { startRow, endRow, content: mergedContent, isMerged: true };
    const currentManualMergedCells = data.manualMergedCells || { packageQty: [], dimensions: [] };
    const newManualMergedCells = {
      ...currentManualMergedCells,
      [column]: [...currentManualMergedCells[column], cell].sort((a, b) => a.startRow - b.startRow)
    };
    onManualMergedCellsChange?.(newManualMergedCells);
  };

  const splitMergedCell = (rowIndex: number) => {
    const column = contextMenu?.column || 'packageQty';
    const mergedInfo = getMergedCellInfo(rowIndex, column === 'packageQty' ? mergedPackageQtyCells : mergedDimensionsCells);
    if (!mergedInfo || !mergedInfo.isMerged) return;

    const currentManualMergedCells = data.manualMergedCells || { packageQty: [], dimensions: [] };
    const newManualMergedCells = {
      ...currentManualMergedCells,
      [column]: currentManualMergedCells[column].filter((c) => !(c.startRow === mergedInfo.startRow && c.endRow === mergedInfo.endRow))
    };
    onManualMergedCellsChange?.(newManualMergedCells);
  };

  const mergeToRow = (startRow: number, endRow: number) => {
    const column = contextMenu?.column || 'packageQty';
    const rowIndex = contextMenu?.rowIndex ?? 0;
    const existing = findContainingMergedCell(rowIndex, column);
    if (existing) {
      const newStart = Math.min(existing.startRow, startRow);
      const newEnd = Math.max(existing.endRow, endRow);
      const currentManualMergedCells = data.manualMergedCells || { packageQty: [], dimensions: [] };
      const newManualMergedCells = {
        ...currentManualMergedCells,
        [column]: currentManualMergedCells[column].filter((c) => !(c.startRow === existing.startRow && c.endRow === existing.endRow))
      };
      onManualMergedCellsChange?.(newManualMergedCells);
      manualMergeRows(newStart, newEnd, column);
    } else {
      manualMergeRows(startRow, endRow, column);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, rowIndex: number, column?: 'packageQty' | 'dimensions') => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, rowIndex, column });
  };

  const closeContextMenu = () => setContextMenu(null);

  // 合并单元格右键菜单组件
  type ContextMenuProps = {
    menu: typeof contextMenu;
    onClose: () => void;
    onSplit: (rowIndex: number) => void;
    onMergeUp: (rowIndex: number) => void;
    onMergeUpMore: (rowIndex: number) => void;
    onMergeDown: (rowIndex: number) => void;
    onMergeDownMore: (rowIndex: number) => void;
    isManualMode: boolean;
    canMergeUp: boolean;
    canMergeDown: boolean;
  };

  const MergeContextMenu: React.FC<ContextMenuProps> = ({
    menu,
    onClose,
    onSplit,
    onMergeUp,
    onMergeUpMore,
    onMergeDown,
    onMergeDownMore,
    isManualMode,
    canMergeUp,
    canMergeDown,
  }) => {
    if (!menu || menu.visible !== true) return null;
    if (!isManualMode) return null;

    return (
      <>
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1"
          style={{ left: menu.x, top: menu.y }}
        >
          {canMergeUp && (
            <>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  onMergeUp(menu.rowIndex);
                  onClose();
                }}
              >
                向上合并
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  onMergeUpMore(menu.rowIndex);
                  onClose();
                }}
              >
                向上扩展合并
              </button>
            </>
          )}
          {canMergeDown && (
            <>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  onMergeDown(menu.rowIndex);
                  onClose();
                }}
              >
                向下合并
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  onMergeDownMore(menu.rowIndex);
                  onClose();
                }}
              >
                向下扩展合并
              </button>
            </>
          )}
          {(canMergeUp || canMergeDown) && <div className="border-t border-gray-200 dark:border-gray-600 my-1" />}
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => {
              onSplit(menu.rowIndex);
              onClose();
            }}
          >
            拆分合并单元格
          </button>
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={onClose}
          >
            取消
          </button>
        </div>
        <div className="fixed inset-0 z-40" onClick={onClose} />
      </>
    );
  };

  // 检测暗黑模式
  useEffect(() => {
    const checkDarkMode = () => setIsDarkMode(window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
    checkDarkMode();
    const q = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (q && q.addEventListener) {
      q.addEventListener('change', checkDarkMode);
      return () => q.removeEventListener('change', checkDarkMode);
    }
    return;
  }, []);

  // 处理iOS输入框焦点
  const handleIOSInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.style.transform) {
      e.target.style.transform = 'translateZ(0)';
    }
  };

  // 获取单位显示文本
  const getUnitDisplay = (baseUnit: string, quantity: number) => {
    if (defaultUnits.includes(baseUnit as typeof defaultUnits[number])) {
      return quantity === 1 ? baseUnit : `${baseUnit}s`;
    }
    return baseUnit;
  };

  // 获取所有可用单位
  const getAllUnits = () => {
    return [...defaultUnits, ...(data.customUnits || [])];
  };

  // 处理单位变更
  const handleUnitChange = (index: number, value: string) => {
    const baseUnit = value.replace(/s$/, '');
    const quantity = data.items[index].quantity;
    const newUnit = defaultUnits.includes(baseUnit as typeof defaultUnits[number]) 
      ? getUnitDisplay(baseUnit, quantity) 
      : value;
    onItemChange(index, 'unit', newUnit);
  };

  // 处理数量变更时同时更新单位（确保只接受整数）
  const handleQuantityChange = (index: number, value: string | number) => {
    const quantity = typeof value === 'string' ? parseInt(value) || 0 : Math.floor(Number(value));
    const baseUnit = data.items[index].unit.replace(/s$/, '');
    const newUnit = defaultUnits.includes(baseUnit as typeof defaultUnits[number]) 
      ? getUnitDisplay(baseUnit, quantity) 
      : data.items[index].unit;
    
    onItemChange(index, 'quantity', quantity);
    if (newUnit !== data.items[index].unit) {
      onItemChange(index, 'unit', newUnit);
    }
  };

  // 处理双击高亮
  const handleDoubleClick = (index: number, field: keyof NonNullable<PackingItem['highlight']>) => {
    if (!onDataChange) return;
    
    const newItems = [...data.items];
    newItems[index] = {
      ...newItems[index],
      highlight: {
        ...newItems[index].highlight,
        [field]: !newItems[index].highlight?.[field],
      },
    };
    const newData = { ...data, items: newItems };
    onDataChange(newData);
  };

  // 软删除处理
  const handleSoftDelete = (index: number) => {
    if (data.items.length > 1) {
      onDeleteLine(index);
    }
  };

  // 计算 Other Fee 总额
  const otherFeesTotal = data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0;
  
  // 修改总计计算逻辑，对于组内的项目，只计算合并后的那一行的数值
  const calculateTotals = () => {
    let totalPrice = 0;
    let netWeight = 0;
    let grossWeight = 0;
    let packageQty = 0;
    const processedGroups = new Set<string>();
    data.items.forEach((item, index) => {
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
    return {
      totalPrice,
      netWeight,
      grossWeight,
      packageQty
    };
  };

  const calculatedTotals = calculateTotals();
  const totalAmount = calculatedTotals.totalPrice + otherFeesTotal;

  // 计算合并单元格数据
  const packageQtyMergeMode = data.packageQtyMergeMode || 'auto';
  const dimensionsMergeMode = data.dimensionsMergeMode || 'auto';
  
  const mergedPackageQtyCells = packageQtyMergeMode === 'manual' 
    ? (data.manualMergedCells?.packageQty || [])
    : calculateMergedCells(data.items, 'auto', 'packageQty');
    
  const mergedDimensionsCells = dimensionsMergeMode === 'manual'
    ? (data.manualMergedCells?.dimensions || [])
    : calculateMergedCells(data.items, 'auto', 'dimensions');

  // 获取可见列
  const effectiveVisibleCols = isHydrated ? visibleCols : ['description', 'quantity', 'unit', 'netWeight', 'grossWeight', 'packageQty', 'unitPrice', 'amount'];

  return (
    <div className="space-y-0">
      {/* 桌面端表格视图 - 中屏及以上显示 */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200/30 dark:border-white/10
                    bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl shadow-lg">
        <div className="min-w-[800px] lg:min-w-[1000px] xl:min-w-[1200px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#007AFF]/10 dark:border-[#0A84FF]/10
                            bg-[#007AFF]/5 dark:bg-[#0A84FF]/5">
                <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[40px]">No.</th>
                {effectiveVisibleCols.includes('description') && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[200px] lg:w-[280px] xl:w-[350px]">Description</th>
                )}
                {effectiveVisibleCols.includes('hsCode') && data.showHsCode && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[120px]">
                    HS Code
                  </th>
                )}
                {effectiveVisibleCols.includes('quantity') && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[100px]">Qty</th>
                )}
                {effectiveVisibleCols.includes('unit') && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[100px]">Unit</th>
                )}
                {effectiveVisibleCols.includes('unitPrice') && data.showPrice && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[120px] lg:w-[140px]">U/Price</th>
                )}
                {effectiveVisibleCols.includes('amount') && data.showPrice && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[130px] lg:w-[150px]">Amount</th>
                )}
                {effectiveVisibleCols.includes('netWeight') && data.showWeightAndPackage && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[100px]">
                    N.W.<br/> (kg)
                  </th>
                )}
                {effectiveVisibleCols.includes('grossWeight') && data.showWeightAndPackage && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[100px]">
                    G.W.<br/> (kg)
                  </th>
                )}
                {effectiveVisibleCols.includes('packageQty') && data.showWeightAndPackage && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[100px]">Pkgs</th>
                )}
                {effectiveVisibleCols.includes('dimensions') && data.showDimensions && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[140px] lg:w-[160px]">
                    Dimensions<br/>({data.dimensionUnit})
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => {
                const isInGroup = !!item.groupId;
                const groupItems = isInGroup ? data.items.filter(i => i.groupId === item.groupId) : [];
                const isFirstInGroup = isInGroup && groupItems[0]?.id === item.id;
                const groupRowSpan = isInGroup ? groupItems.length : 1;
                const groupBg = isInGroup ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white/90 dark:bg-[#1C1C1E]/90';
                
                return (
                  <tr key={item.id} className={`border-b border-[#007AFF]/10 dark:border-[#0A84FF]/10 ${groupBg}`}>
                    <td className="py-2 px-4 text-center text-sm">
                      <span 
                        className="flex items-center justify-center w-5 h-5 rounded-full text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 cursor-pointer transition-colors"
                        onClick={() => handleSoftDelete(index)}
                        title="Click to delete"
                      >
                        {index + 1}
                      </span>
                    </td>
                    
                    {effectiveVisibleCols.includes('description') && (
                      <td className="py-2 px-4 text-center text-[12px]">
                        <textarea
                          value={item.description}
                          onChange={(e) => {
                            onItemChange(index, 'description', e.target.value);
                            e.target.style.height = '28px';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center whitespace-pre-wrap resize-y overflow-hidden ios-optimized-input"
                          style={{ height: '28px' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.stopPropagation();
                            }
                          }}
                        />
                      </td>
                    )}
                    
                    {effectiveVisibleCols.includes('hsCode') && data.showHsCode && (
                      <td className="py-2 px-4 text-center text-sm">
                        <input
                          type="text"
                          value={item.hsCode}
                          onChange={(e) => onItemChange(index, 'hsCode', e.target.value)}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center ios-optimized-input"
                          placeholder="HS Code"
                        />
                      </td>
                    )}
                    
                    {effectiveVisibleCols.includes('quantity') && (
                      <td className="py-2 px-4 text-center text-sm">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editingQtyIndex === index ? editingQtyAmount : (item.quantity > 0 ? item.quantity.toString() : '')}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value)) {
                              setEditingQtyAmount(value);
                              handleQuantityChange(index, value === '' ? 0 : parseInt(value));
                            }
                          }}
                          onFocus={(e) => {
                            setEditingQtyIndex(index);
                            setEditingQtyAmount(item.quantity === 0 ? '' : item.quantity.toString());
                            e.target.select();
                            handleIOSInputFocus(e);
                          }}
                          onBlur={() => {
                            setEditingQtyIndex(null);
                            setEditingQtyAmount('');
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ios-optimized-input"
                          placeholder="0"
                          style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                        />
                      </td>
                    )}
                    
                    {effectiveVisibleCols.includes('unit') && (
                      <td className="py-2 px-4 text-center text-sm">
                        <select
                          value={item.unit}
                          onChange={(e) => handleUnitChange(index, e.target.value)}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center cursor-pointer appearance-none ios-optimized-input"
                        >
                          {getAllUnits().map(unit => {
                            const displayUnit = defaultUnits.includes(unit as typeof defaultUnits[number]) 
                              ? getUnitDisplay(unit, item.quantity) 
                              : unit;
                            return (
                              <option key={unit} value={displayUnit}>
                                {displayUnit}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                    )}
                    
                    {effectiveVisibleCols.includes('unitPrice') && data.showPrice && (
                      <td className="py-2 px-4 text-center text-sm">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editingUnitPriceIndex === index ? editingUnitPriceAmount : item.unitPrice.toFixed(2)}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d*$/.test(value)) {
                              setEditingUnitPriceAmount(value);
                              onItemChange(index, 'unitPrice', value === '' ? 0 : parseFloat(value));
                            }
                          }}
                          onFocus={(e) => {
                            setEditingUnitPriceIndex(index);
                            setEditingUnitPriceAmount(item.unitPrice === 0 ? '' : item.unitPrice.toString());
                            e.target.select();
                            handleIOSInputFocus(e);
                          }}
                          onBlur={() => {
                            setEditingUnitPriceIndex(null);
                            setEditingUnitPriceAmount('');
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center ios-optimized-input"
                          placeholder="0.00"
                          style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                        />
                      </td>
                    )}
                    
                    {effectiveVisibleCols.includes('amount') && data.showPrice && (
                      <td className="py-2 px-4 text-center text-sm">
                        <input
                          type="text"
                          value={item.totalPrice.toFixed(2)}
                          readOnly
                          className={`${baseInputClassName} text-center`}
                          style={iosCaretStyle}
                        />
                      </td>
                    )}
                    
                    {/* 合并单元格：只在组内第一行渲染，rowSpan=组内行数 */}
                    {effectiveVisibleCols.includes('netWeight') && data.showWeightAndPackage && (
                      isInGroup && isFirstInGroup ? (
                        <td rowSpan={groupRowSpan} className="py-2 px-4 text-center align-middle" style={{verticalAlign:'middle'}}>
                          <div className="flex flex-col justify-center items-center h-full">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editingNetWeightIndex === index ? editingNetWeightAmount : (item.netWeight > 0 ? item.netWeight.toFixed(2) : '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*\.?\d*$/.test(value)) {
                                  setEditingNetWeightAmount(value);
                                  const newWeight = value === '' ? 0 : parseFloat(value);
                                  groupItems.forEach((groupItem) => {
                                    const itemIndex = data.items.findIndex(i => i.id === groupItem.id);
                                    if (itemIndex !== -1) {
                                      onItemChange(itemIndex, 'netWeight', newWeight);
                                    }
                                  });
                                }
                              }}
                              onFocus={(e) => {
                                setEditingNetWeightIndex(index);
                                setEditingNetWeightAmount(item.netWeight === 0 ? '' : item.netWeight.toString());
                                e.target.select();
                                handleIOSInputFocus(e);
                              }}
                              onBlur={(e) => {
                                setEditingNetWeightIndex(null);
                                setEditingNetWeightAmount('');
                                const value = parseFloat(e.target.value) || 0;
                                if (value > 0) {
                                  groupItems.forEach((groupItem) => {
                                    const itemIndex = data.items.findIndex(i => i.id === groupItem.id);
                                    if (itemIndex !== -1) {
                                      onItemChange(itemIndex, 'netWeight', parseFloat(value.toFixed(2)));
                                    }
                                  });
                                }
                              }}
                              className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center ios-optimized-input"
                              placeholder="0.00"
                              style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                            />
                          </div>
                        </td>
                      ) : !isInGroup ? (
                        <td className="py-2 px-4 text-center text-sm">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editingNetWeightIndex === index ? editingNetWeightAmount : (item.netWeight > 0 ? item.netWeight.toFixed(2) : '')}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*\.?\d*$/.test(value)) {
                                setEditingNetWeightAmount(value);
                                onItemChange(index, 'netWeight', value === '' ? 0 : parseFloat(value));
                              }
                            }}
                            onFocus={(e) => {
                              setEditingNetWeightIndex(index);
                              setEditingNetWeightAmount(item.netWeight === 0 ? '' : item.netWeight.toString());
                              e.target.select();
                              handleIOSInputFocus(e);
                            }}
                            onBlur={() => {
                              setEditingNetWeightIndex(null);
                              setEditingNetWeightAmount('');
                            }}
                            className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center ios-optimized-input"
                            placeholder="0.00"
                            style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                          />
                        </td>
                      ) : null
                    )}
                    
                    {effectiveVisibleCols.includes('grossWeight') && data.showWeightAndPackage && (
                      isInGroup && isFirstInGroup ? (
                        <td rowSpan={groupRowSpan} className="py-2 px-4 text-center align-middle" style={{verticalAlign:'middle'}}>
                          <div className="flex flex-col justify-center items-center h-full">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editingGrossWeightIndex === index ? editingGrossWeightAmount : (item.grossWeight > 0 ? item.grossWeight.toFixed(2) : '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*\.?\d*$/.test(value)) {
                                  setEditingGrossWeightAmount(value);
                                  const newWeight = value === '' ? 0 : parseFloat(value);
                                  groupItems.forEach((groupItem) => {
                                    const itemIndex = data.items.findIndex(i => i.id === groupItem.id);
                                    if (itemIndex !== -1) {
                                      onItemChange(itemIndex, 'grossWeight', newWeight);
                                    }
                                  });
                                }
                              }}
                              onFocus={(e) => {
                                setEditingGrossWeightIndex(index);
                                setEditingGrossWeightAmount(item.grossWeight === 0 ? '' : item.grossWeight.toString());
                                e.target.select();
                                handleIOSInputFocus(e);
                              }}
                              onBlur={(e) => {
                                setEditingGrossWeightIndex(null);
                                setEditingGrossWeightAmount('');
                                const value = parseFloat(e.target.value) || 0;
                                if (value > 0) {
                                  groupItems.forEach((groupItem) => {
                                    const itemIndex = data.items.findIndex(i => i.id === groupItem.id);
                                    if (itemIndex !== -1) {
                                      onItemChange(itemIndex, 'grossWeight', parseFloat(value.toFixed(2)));
                                    }
                                  });
                                }
                              }}
                              className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center ios-optimized-input"
                              placeholder="0.00"
                              style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                            />
                          </div>
                        </td>
                      ) : !isInGroup ? (
                        <td className="py-2 px-4 text-center text-sm">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editingGrossWeightIndex === index ? editingGrossWeightAmount : (item.grossWeight > 0 ? item.grossWeight.toFixed(2) : '')}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*\.?\d*$/.test(value)) {
                                setEditingGrossWeightAmount(value);
                                onItemChange(index, 'grossWeight', value === '' ? 0 : parseFloat(value));
                              }
                            }}
                            onFocus={(e) => {
                              setEditingGrossWeightIndex(index);
                              setEditingGrossWeightAmount(item.grossWeight === 0 ? '' : item.grossWeight.toString());
                              e.target.select();
                              handleIOSInputFocus(e);
                            }}
                            onBlur={() => {
                              setEditingGrossWeightIndex(null);
                              setEditingGrossWeightAmount('');
                            }}
                            className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center ios-optimized-input"
                            placeholder="0.00"
                            style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                          />
                        </td>
                      ) : null
                    )}
                    
                    {effectiveVisibleCols.includes('packageQty') && data.showWeightAndPackage && shouldRenderCell(index, mergedPackageQtyCells) && (
                      (() => {
                        const packageQtyMergedInfo = getMergedCellInfo(index, mergedPackageQtyCells);
                        const packageQtyRowSpan = packageQtyMergedInfo ? packageQtyMergedInfo.endRow - packageQtyMergedInfo.startRow + 1 : 1;
                        const packageQtyIsMerged = !!packageQtyMergedInfo?.isMerged;
                        
                        return (
                          <td 
                            className={`py-2 px-4 text-center text-sm ${
                              packageQtyIsMerged ? 'bg-blue-50/50 dark:bg-blue-900/20 shadow-sm border-l-2 border-l-blue-200 dark:border-l-blue-300' : ''
                            }`}
                            rowSpan={packageQtyIsMerged ? packageQtyRowSpan : undefined}
                            onContextMenu={(e) => handleContextMenu(e, index, 'packageQty')}
                          >
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editingPackageQtyIndex === index ? editingPackageQtyAmount : (item.packageQty > 0 ? item.packageQty.toString() : '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*$/.test(value)) {
                                  setEditingPackageQtyAmount(value);
                                  onItemChange(index, 'packageQty', value === '' ? 0 : parseInt(value));
                                }
                              }}
                              onFocus={(e) => {
                                setEditingPackageQtyIndex(index);
                                setEditingPackageQtyAmount(item.packageQty === 0 ? '' : item.packageQty.toString());
                                e.target.select();
                                handleIOSInputFocus(e);
                              }}
                              onBlur={() => {
                                setEditingPackageQtyIndex(null);
                                setEditingPackageQtyAmount('');
                              }}
                              onDoubleClick={() => handleDoubleClick(index, 'packageQty')}
                              className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ios-optimized-input ${item.highlight?.packageQty ? highlightClass : ''} ${packageQtyIsMerged ? 'border-blue-200 dark:border-blue-700' : ''}`}
                              placeholder="0"
                              style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                            />
                          </td>
                        );
                      })()
                    )}
                    
                    {effectiveVisibleCols.includes('dimensions') && data.showDimensions && shouldRenderCell(index, mergedDimensionsCells) && (
                      (() => {
                        const dimensionsMergedInfo = getMergedCellInfo(index, mergedDimensionsCells);
                        const dimensionsRowSpan = dimensionsMergedInfo ? dimensionsMergedInfo.endRow - dimensionsMergedInfo.startRow + 1 : 1;
                        const dimensionsIsMerged = !!dimensionsMergedInfo?.isMerged;
                        
                        return (
                          <td 
                            className={`py-2 px-4 text-center text-sm ${
                              dimensionsIsMerged ? 'bg-blue-50/50 dark:bg-blue-900/20 shadow-sm border-l-2 border-l-blue-200 dark:border-l-blue-300' : ''
                            }`}
                            rowSpan={dimensionsIsMerged ? dimensionsRowSpan : undefined}
                            onContextMenu={(e) => handleContextMenu(e, index, 'dimensions')}
                          >
                            <input
                              type="text"
                              value={item.dimensions}
                              onChange={(e) => onItemChange(index, 'dimensions', e.target.value)}
                              onDoubleClick={() => handleDoubleClick(index, 'dimensions')}
                              className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center ios-optimized-input ${item.highlight?.dimensions ? highlightClass : ''} ${dimensionsIsMerged ? 'border-blue-200 dark:border-blue-700' : ''}`}
                              placeholder="Dimensions"
                            />
                          </td>
                        );
                      })()
                    )}
                  </tr>
                );
              })}
            </tbody>
            
            {/* Other Fees 表格 - 无缝衔接 */}
            {data.showPrice && data.otherFees && data.otherFees.length > 0 && (
              <OtherFeesTable
                otherFees={data.otherFees}
                currency={data.currency}
                onFeeChange={onOtherFeeChange || (() => {})}
                onFeeDoubleClick={onOtherFeeDoubleClick || (() => {})}
                onDeleteFee={onDeleteOtherFee || (() => {})}
                editingFeeIndex={editingFeeIndex || null}
                editingFeeAmount={editingFeeAmount || ''}
                setEditingFeeIndex={setEditingFeeIndex || (() => {})}
                setEditingFeeAmount={setEditingFeeAmount || (() => {})}
                itemsCount={data.items.length} // 传递主表格项目数量
                effectiveVisibleCols={effectiveVisibleCols} // 传递可见列信息
                showHsCode={data.showHsCode}
                showWeightAndPackage={data.showWeightAndPackage}
                showDimensions={data.showDimensions}
              />
            )}
          </table>
        </div>
      </div>

      {/* 总计信息 */}
      {((data.showWeightAndPackage && (effectiveVisibleCols.includes('netWeight') || effectiveVisibleCols.includes('grossWeight') || effectiveVisibleCols.includes('packageQty'))) || (data.showPrice && (effectiveVisibleCols.includes('unitPrice') || effectiveVisibleCols.includes('amount')))) && (
        <div className="flex justify-end items-center py-3 sm:py-4 px-3 sm:px-6 border-t border-[#007AFF]/10 dark:border-[#0A84FF]/10">
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-4 md:gap-6">
              {data.showWeightAndPackage && (effectiveVisibleCols.includes('netWeight') || effectiveVisibleCols.includes('grossWeight') || effectiveVisibleCols.includes('packageQty')) && (
                <>
                  {effectiveVisibleCols.includes('netWeight') && (
                    <div className="text-center sm:text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total N.W.</div>
                      <div className="text-sm sm:text-base font-medium">{calculatedTotals.netWeight.toFixed(2)} KGS</div>
                    </div>
                  )}
                  {effectiveVisibleCols.includes('grossWeight') && (
                    <div className="text-center sm:text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total G.W.</div>
                      <div className="text-sm sm:text-base font-medium">{calculatedTotals.grossWeight.toFixed(2)} KGS</div>
                    </div>
                  )}
                  {effectiveVisibleCols.includes('packageQty') && (
                    <div className="text-center sm:text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Package</div>
                      <div className="text-sm sm:text-base font-medium">{calculatedTotals.packageQty} CTNS</div>
                    </div>
                  )}
                </>
              )}
              {data.showPrice && (effectiveVisibleCols.includes('unitPrice') || effectiveVisibleCols.includes('amount')) && (
                <div className="text-center sm:text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Amount</div>
                  <div className="text-sm sm:text-base font-semibold">
                    {data.currency === 'USD' ? '$' : data.currency === 'EUR' ? '€' : '¥'}
                    {totalAmount.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 合并单元格右键菜单 */}
      <MergeContextMenu
        menu={contextMenu}
        onClose={closeContextMenu}
        onSplit={splitMergedCell}
        onMergeUp={(rowIndex) => {
          const column = contextMenu?.column || 'packageQty';
          const existing = findContainingMergedCell(rowIndex, column);
          const start = existing ? Math.max(existing.startRow - 1, 0) : Math.max(rowIndex - 1, 0);
          const end = existing ? existing.endRow : rowIndex;
          mergeToRow(start, end);
        }}
        onMergeUpMore={(rowIndex) => {
          const column = contextMenu?.column || 'packageQty';
          const existing = findContainingMergedCell(rowIndex, column);
          const start = existing ? findPrevMergedGroupEndAfterStart(existing.startRow, column) : Math.max(rowIndex - 3, 0);
          const end = existing ? existing.endRow : rowIndex;
          mergeToRow(start, end);
        }}
        onMergeDown={(rowIndex) => {
          const column = contextMenu?.column || 'packageQty';
          const existing = findContainingMergedCell(rowIndex, column);
          const start = existing ? existing.startRow : rowIndex;
          const end = existing ? Math.min(existing.endRow + 1, data.items.length - 1) : Math.min(rowIndex + 1, data.items.length - 1);
          mergeToRow(start, end);
        }}
        onMergeDownMore={(rowIndex) => {
          const column = contextMenu?.column || 'packageQty';
          const existing = findContainingMergedCell(rowIndex, column);
          const start = existing ? existing.startRow : rowIndex;
          const end = existing ? findNextMergedGroupStartBeforeEnd(existing.endRow, column) : Math.min(rowIndex + 4, data.items.length - 1);
          mergeToRow(start, end);
        }}
        isManualMode={
          contextMenu?.column === 'packageQty' ? packageQtyMergeMode === 'manual' : dimensionsMergeMode === 'manual'
        }
        canMergeUp={(contextMenu?.rowIndex ?? 0) > 0}
        canMergeDown={(contextMenu?.rowIndex ?? 0) < data.items.length - 1}
      />
    </div>
  );
};
