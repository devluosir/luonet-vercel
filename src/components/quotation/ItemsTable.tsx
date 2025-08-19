// src/components/quotation/ItemsTable.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ImportDataButton } from './ImportDataButton';
import { ColumnToggle } from './ColumnToggle';
import { QuickImport } from './QuickImport';
import { useTablePrefsHydrated } from '@/features/quotation/state/useTablePrefs';
import { useGlobalPasteImport } from '@/features/quotation/hooks/useGlobalPasteImport';
import { useEffectOncePerChange } from '@/hooks/useEffectOncePerChange';
import { buildMergeKey } from '@/utils/mergeKey';
import type { QuotationData, LineItem, OtherFee } from '@/types/quotation';
import type { ParseResult } from '@/features/quotation/utils/quickSmartParse';

/* =========================================================================
 * Section 1: Types / Constants
 * ========================================================================= */
export interface MergedCellInfo {
  startRow: number;
  endRow: number;
  content: string;
  isMerged: boolean;
}

interface ItemsTableProps {
  data: QuotationData;
  onItemsChange?: (items: LineItem[]) => void;
  onOtherFeesChange?: (fees: OtherFee[]) => void;
  onDescriptionMergeModeChange?: (mode: 'auto' | 'manual') => void;
  onRemarksMergeModeChange?: (mode: 'auto' | 'manual') => void;
  onManualMergedCellsChange?: (manualMergedCells: {
    description: MergedCellInfo[];
    remarks: MergedCellInfo[];
  }) => void;
  mergedRemarks?: { startRow: number; endRow: number; content: string; column: 'remarks' }[];
  mergedDescriptions?: { startRow: number; endRow: number; content: string; column: 'description' }[];
  onChange?: (data: QuotationData) => void; // legacy
}

const highlightClass = 'text-red-500 dark:text-red-400 font-medium';
const defaultUnits = ['pc', 'set', 'length'] as const;

const iosCaretStyle = { caretColor: '#007AFF' } as React.CSSProperties;
const iosCaretStyleDark = { caretColor: '#0A84FF' } as React.CSSProperties;

/* =========================================================================
 * Section 2: Merge helpers
 * ========================================================================= */
const calculateMergedCells = (
  items: LineItem[],
  mode: 'auto' | 'manual' = 'auto',
  column: 'remarks' | 'description' = 'remarks'
): MergedCellInfo[] => {
  const mergedCells: MergedCellInfo[] = [];
  if (!items || items.length === 0) return mergedCells;

  if (mode === 'manual') {
    items.forEach((item, index) => {
      mergedCells.push({
        startRow: index,
        endRow: index,
        content: column === 'remarks' ? (item.remarks || '') : ((item.description ?? item.partName) || ''),
        isMerged: false,
      });
    });
    return mergedCells;
  }

  let currentStart = 0;
  let currentContent =
    column === 'remarks'
      ? (items[0]?.remarks || '')
      : ((items[0]?.description ?? items[0]?.partName) || '');

  for (let i = 1; i <= items.length; i++) {
    const currentItem = items[i];
    const prevItem = items[i - 1];

    const prevContent =
      column === 'remarks' ? (prevItem?.remarks || '') : ((prevItem?.description ?? prevItem?.partName) || '');
    const currentContentValue = currentItem
      ? column === 'remarks'
        ? (currentItem.remarks || '')
        : ((currentItem.description ?? currentItem.partName) || '')
      : '';

    const shouldEndMerge = !currentItem || (currentContentValue !== prevContent && currentContentValue !== '');

    if (shouldEndMerge) {
      if (i - 1 > currentStart) {
        mergedCells.push({ startRow: currentStart, endRow: i - 1, content: currentContent, isMerged: true });
      } else {
        mergedCells.push({ startRow: currentStart, endRow: currentStart, content: currentContent, isMerged: false });
      }
      if (currentItem) {
        currentStart = i;
        currentContent = currentContentValue;
      }
    }
  }
  return mergedCells;
};

const shouldRenderRemarkCell = (rowIndex: number, merged: MergedCellInfo[]) => {
  // 如果没有合并信息，直接返回true（显示所有单元格）
  if (merged.length === 0) return true;
  return merged.some((cell) => cell.startRow === rowIndex);
};

const getMergedCellInfo = (rowIndex: number, merged: MergedCellInfo[]) => {
  // 如果没有合并信息，直接返回null
  if (merged.length === 0) return null;
  return merged.find((cell) => cell.startRow === rowIndex) || null;
};

const shouldRenderDescriptionCell = (rowIndex: number, merged: MergedCellInfo[]) => {
  // 如果没有合并信息，直接返回true（显示所有单元格）
  if (merged.length === 0) return true;
  return merged.some((cell) => cell.startRow === rowIndex);
};

const getMergedDescriptionCellInfo = (rowIndex: number, merged: MergedCellInfo[]) => {
  // 如果没有合并信息，直接返回null
  if (merged.length === 0) return null;
  return merged.find((cell) => cell.startRow === rowIndex) || null;
};

/* =========================================================================
 * Section 3: Small presentational sub-components
 * ========================================================================= */
type TextareaCommonProps = {
  isDarkMode: boolean;
  onFocusIOS: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  className?: string;
  title?: string;
};

const AutoGrowTextarea: React.FC<
  {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onDoubleClick?: () => void;
    placeholder?: string;
  } & TextareaCommonProps
> = ({ value, onChange, onDoubleClick, placeholder, isDarkMode, onFocusIOS, className, title }) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const adjust = useCallback((ta: HTMLTextAreaElement) => {
    ta.style.height = '28px';
    const newHeight = Math.max(28, Math.min(ta.scrollHeight, 200));
    ta.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    if (ref.current) adjust(ref.current);
  }, [value, adjust]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e);
        adjust(e.target);
      }}
      onDoubleClick={onDoubleClick}
      onFocus={onFocusIOS}
      className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none
      focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
      hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[13px]
      text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
      transition-all duration-200 text-center whitespace-pre-wrap resize-y overflow-hidden ios-optimized-input ${className || ''}`}
      style={isDarkMode ? iosCaretStyleDark : iosCaretStyle}
      placeholder={placeholder}
      title={title}
    />
  );
};

/* =========================================================================
 * Section 4: Context Menu (Manual Merge)
 * ========================================================================= */
type ContextMenuState =
  | {
      visible: true;
      x: number;
      y: number;
      rowIndex: number;
      column?: 'description' | 'remarks';
    }
  | null;

type ContextMenuProps = {
  menu: ContextMenuState;
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
              向上{/**/}合并
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
              向下{/**/}合并
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

/* =========================================================================
 * Section 5: Main Component
 * ========================================================================= */
export const ItemsTable: React.FC<ItemsTableProps> = ({
  data,
  onItemsChange,
  onOtherFeesChange,
  onDescriptionMergeModeChange,
  onRemarksMergeModeChange,
  onManualMergedCellsChange,
  mergedRemarks = [],
  mergedDescriptions = [],
  onChange,
}) => {
  // safe getters
  const getDesc = (it: any) => (it.description ?? it.partName ?? '').trim();
  const getRemark = (it: any) => (it.remarks ?? it.remark ?? '').trim();

  const { visibleCols, isHydrated } = useTablePrefsHydrated();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [descriptionMergeMode, setDescriptionMergeMode] = useState<'auto' | 'manual'>('auto');
  const [remarksMergeMode, setRemarksMergeMode] = useState<'auto' | 'manual'>('auto');

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

  // 暂时禁用description列的合并模式切换功能
  // useEffect(() => onDescriptionMergeModeChange?.(descriptionMergeMode), [descriptionMergeMode, onDescriptionMergeModeChange]);
  useEffect(() => onRemarksMergeModeChange?.(remarksMergeMode), [remarksMergeMode, onRemarksMergeModeChange]);

  const effectiveVisibleCols = isHydrated ? visibleCols : ['partName', 'quantity', 'unit', 'unitPrice', 'amount', 'remarks'];
  const availableUnits = [...defaultUnits, ...(data.customUnits || [])] as const;

  const updateItems = useCallback(
    (newItems: LineItem[]) => {
      if (onItemsChange) return onItemsChange(newItems);
      if (onChange) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ItemsTable] 使用deprecated接口onChange，建议迁移到onItemsChange');
        }
        return onChange({ ...data, items: newItems });
      }
    },
    [onItemsChange, onChange, data]
  );

  const updateOtherFees = useCallback(
    (newFees: OtherFee[]) => {
      if (onOtherFeesChange) return onOtherFeesChange(newFees);
      if (onChange) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ItemsTable] 使用deprecated接口onChange，建议迁移到onOtherFeesChange');
        }
        return onChange({ ...data, otherFees: newFees });
      }
    },
    [onOtherFeesChange, onChange, data]
  );

  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [editingPriceAmount, setEditingPriceAmount] = useState<string>('');
  const [editingQtyIndex, setEditingQtyIndex] = useState<number | null>(null);
  const [editingQtyAmount, setEditingQtyAmount] = useState<string>('');
  const [editingOtherFeeIndex, setEditingOtherFeeIndex] = useState<number | null>(null);
  const [editingOtherFeeAmount, setEditingOtherFeeAmount] = useState<string>('');

  const [importPreset, setImportPreset] = useState<{ raw: string; parsed: ParseResult } | null>(null);

  const [manualMergedCells, setManualMergedCells] = useState<{ remarks: MergedCellInfo[]; description: MergedCellInfo[] }>(
    { remarks: [], description: [] }
  );

  // 用于首次渲染检测的refs
  const isFirstRenderRef = useRef(true);
  const isFirstRenderRemarksRef = useRef(true);

  // 只在开发环境且首次渲染且有解析器合并信息时显示调试信息
  if (process.env.NODE_ENV === 'development' && ((mergedRemarks?.length ?? 0) > 0 || (mergedDescriptions?.length ?? 0) > 0)) {
    if (isFirstRenderRef.current) {
      console.info('[IT] props merges:', mergedRemarks?.length, mergedDescriptions?.length);
      console.info('[IT] items[0].remarks]:', getRemark(data.items[0] ?? {}));
      console.info('[IT] items[0].description]:', getDesc(data.items[0] ?? {}));
      isFirstRenderRef.current = false;
    }
  }

  // 只在有解析器合并信息时才计算合并键
  const remarksKey = useMemo(() => {
    if ((mergedRemarks?.length ?? 0) > 0) {
      return buildMergeKey(data.items, 'remarks');
    }
    return '';
  }, [mergedRemarks?.length ?? 0, data.items]);
  
  const descKey = useMemo(() => {
    if ((mergedDescriptions?.length ?? 0) > 0) {
      return buildMergeKey(data.items, 'description');
    }
    return '';
  }, [mergedDescriptions?.length ?? 0, data.items]);

  const mergedRemarksCells = useMemo(() => {
    // 只在有解析器合并信息时才进行合并检测
    if ((mergedRemarks?.length ?? 0) > 0) {
      if (process.env.NODE_ENV === 'development') console.log('[ItemsTable] 使用解析器合并:', mergedRemarks);
      return mergedRemarks.map((m) => ({ startRow: m.startRow, endRow: m.endRow, content: m.content, isMerged: true }));
    }
    
    // 如果没有解析器合并信息，只在手动模式下进行合并检测
    const items = data.items || [];
    if (items.length === 0) return [];
    
    if (remarksMergeMode === 'manual') {
      const result = items.map((it, idx) => ({ startRow: idx, endRow: idx, content: it.remarks || '', isMerged: false }));
      manualMergedCells.remarks.forEach((cell) => {
        for (let i = cell.startRow; i <= cell.endRow; i++) {
          const k = result.findIndex((r) => r.startRow === i);
          if (k !== -1) result.splice(k, 1);
        }
        result.push(cell);
      });
      // 保持顺序
      return result.sort((a, b) => a.startRow - b.startRow);
    }
    
    // 自动模式下，如果没有解析器合并信息，返回空数组（不进行任何合并检测）
    return [];
  }, [mergedRemarks?.length ?? 0, remarksKey, remarksMergeMode, manualMergedCells.remarks, data.items?.length ?? 0]);

  const mergedDescriptionCells = useMemo(() => {
    // 暂时禁用description列的合并单元格功能
    // 只在有解析器合并信息时才显示日志
    if (process.env.NODE_ENV === 'development' && (mergedDescriptions?.length ?? 0) > 0) {
      if (isFirstRenderRef.current) {
        console.log('[ItemsTable] 检测到Description解析器合并信息:', mergedDescriptions);
        console.log('[ItemsTable] Description合并单元格功能已禁用');
        isFirstRenderRef.current = false;
      }
    }
    return [];
  }, [mergedDescriptions?.length ?? 0, data.items?.length ?? 0]);

  // 只在有解析器合并信息时才执行useEffect
  useEffectOncePerChange(`${remarksKey}|${remarksMergeMode}`, () => {
    if ((mergedRemarks?.length ?? 0) > 0) {
      if (process.env.NODE_ENV === 'development' && isFirstRenderRemarksRef.current) {
        console.log('[ItemsTable] 检测到解析器合并信息:', mergedRemarks);
        console.log('[ItemsTable] Remarks合并单元格:', mergedRemarksCells);
        console.log('[ItemsTable] 原始数据remarks字段:', data.items?.map((i) => i.remarks) || []);
        isFirstRenderRemarksRef.current = false;
      }
    }
  });

  // 暂时禁用description列合并相关的useEffect
  // useEffectOncePerChange(`${descKey}|${descriptionMergeMode}`, () => {
  //   if (process.env.NODE_ENV === 'development') {
  //     if (descriptionMergeMode === 'auto' && (mergedDescriptions?.length ?? 0) === 0) {
  //       console.log('[ItemsTable] Description自动合并单元格:', mergedDescriptionCells);
  //     } else if (manualMergedCells.description.length > 0) {
  //       console.log('[ItemsTable] Description手动合并单元格:', mergedDescriptionCells);
  //     }
  //   }
  // });

  const mergedRef = useRef<{ remarks: MergedCellInfo[]; description: MergedCellInfo[] }>({ remarks: [], description: [] });
  useEffect(() => {
    const merged = { remarks: manualMergedCells.remarks, description: manualMergedCells.description };
    const prev = mergedRef.current;
    const same = JSON.stringify(prev) === JSON.stringify(merged);
    if (!same) {
      mergedRef.current = merged;
      onManualMergedCellsChange?.(merged);
      if (process.env.NODE_ENV === 'development') console.log('[ItemsTable] 通知父组件手动合并数据变化:', merged);
    }
  }, [manualMergedCells, onManualMergedCellsChange]);

  // auto adjust textarea heights on merged change & items change
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((el) => {
      const ta = el as HTMLTextAreaElement;
      ta.style.height = '28px';
      const h = Math.max(28, Math.min(ta.scrollHeight, 200));
      ta.style.height = `${h}px`;
    });
  }, [data.items?.length ?? 0, mergedRemarksCells, mergedDescriptionCells]);

  const onFocusIOS = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const el = e.target as HTMLElement & { style: any };
    el.style.caretColor = isDarkMode ? '#0A84FF' : '#007AFF';
    el.style.webkitCaretColor = isDarkMode ? '#0A84FF' : '#007AFF';
  };

  const getUnitDisplay = (baseUnit: string, quantity: number) => {
    if ((defaultUnits as readonly string[]).includes(baseUnit)) return quantity === 1 ? baseUnit : `${baseUnit}s`;
    return baseUnit;
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const items = data.items || [];
    const newItems = [...items];
    const updated = { ...newItems[index] };

    if (field === 'quantity' || field === 'unitPrice') {
      const num = Number(value);
      (updated as any)[field] = num;
      updated.amount = (updated.quantity ?? 0) * (updated.unitPrice ?? 0);
      if (field === 'quantity' && typeof updated.unit === 'string') {
        const baseUnit = updated.unit.replace(/s$/, '');
        updated.unit = getUnitDisplay(baseUnit, num);
      }
    } else {
      (updated as any)[field] = value as any;
    }

    newItems[index] = updated;
    updateItems(newItems);
  };

  const handleMergedCellChange = (
    startRow: number,
    endRow: number,
    value: string,
    field: 'remarks' | 'description' = 'remarks'
  ) => {
    const newItems = [...data.items];
    for (let i = startRow; i <= endRow; i++) {
      newItems[i] = { ...newItems[i], [field]: value } as LineItem;
    }
    updateItems(newItems);
  };

  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    index: number,
    isMerged: boolean,
    mergedInfo?: MergedCellInfo | null,
    field: 'remarks' | 'description' = 'remarks'
  ) => {
    const value = e.target.value;
    if (isMerged && mergedInfo) {
      handleMergedCellChange(mergedInfo.startRow, mergedInfo.endRow, value, field);
    } else {
      handleItemChange(index, field as keyof LineItem, value);
    }
  };

  const handleSoftDelete = (index: number) => {
    const newItems = data.items.filter((_, i) => i !== index);
    updateItems(newItems);
  };

  const handleDoubleClick = (index: number, field: keyof NonNullable<LineItem['highlight']>) => {
    const newItems = [...data.items];
    newItems[index] = {
      ...newItems[index],
      highlight: {
        ...newItems[index].highlight,
        [field]: !newItems[index].highlight?.[field],
      },
    };
    updateItems(newItems);
  };

  const handleOtherFeeChange = (index: number, field: 'description' | 'amount' | 'remarks', value: string | number) => {
    const fees = [...(data.otherFees || [])];
    fees[index] = { ...fees[index], [field]: value } as OtherFee;
    updateOtherFees(fees);
  };

  const handleOtherFeeDoubleClick = (index: number, field: 'description' | 'amount' | 'remarks') => {
    const fees = [...(data.otherFees || [])];
    const f = fees[index];
    fees[index] = {
      ...f,
      highlight: {
        ...f.highlight,
        [field]: !f.highlight?.[field],
      },
    };
    updateOtherFees(fees);
  };

  const handleOtherFeeSoftDelete = (index: number) => {
    const fees = (data.otherFees || []).filter((_, i) => i !== index);
    updateOtherFees(fees);
  };

  const handleImport = (newItems: LineItem[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ItemsTable] handleImport 被调用，新数据项数量:', newItems.length);
    }
    const processed = newItems.map((item) => {
      const baseUnit = (item.unit || 'pc').replace(/s$/, '');
      return {
        ...item,
        unit: (defaultUnits as readonly string[]).includes(baseUnit) ? getUnitDisplay(baseUnit, item.quantity) : item.unit,
        amount: item.quantity * item.unitPrice,
      };
    });
    updateItems(processed);

    // smart detect manual merged groups (both columns)
    const newManual: { description: MergedCellInfo[]; remarks: MergedCellInfo[] } = { description: [], remarks: [] };

    const collect = (col: 'description' | 'remarks') => {
      let start = 0;
      let cur = (processed[0] as any)?.[col] || '';
      for (let i = 1; i <= processed.length; i++) {
        const currentItem = processed[i];
        const prevItem = processed[i - 1];
        const prevVal = (prevItem as any)?.[col] || '';
        const curVal = currentItem ? ((currentItem as any)?.[col] || '') : '';
        const shouldEnd = !currentItem || curVal !== prevVal || !curVal || !prevVal;
        if (shouldEnd) {
          if (i - 1 > start && `${cur}`.trim()) {
            newManual[col].push({ startRow: start, endRow: i - 1, content: cur, isMerged: true });
          }
          if (currentItem) {
            start = i;
            cur = curVal;
          }
        }
      }
    };

    collect('description');
    collect('remarks');

    setManualMergedCells(newManual);

    if (process.env.NODE_ENV === 'development') {
      console.log('[ItemsTable] 导入数据后检测到的合并单元格:', newManual);
    }
  };

  const handleInsertImported = (rows: any[], replaceMode = false) => {
    let maxId = replaceMode ? 0 : (data.items || []).reduce((m, it) => Math.max(m, it.id), 0);
    const mapped: LineItem[] = rows.map((r, index) => {
      const quantity = Number(r.quantity) || 0;
      const unitPrice = Number(r.unitPrice) || 0;
      return {
        id: maxId + index + 1, // 确保每个id都是唯一的
        partName: r.partName || '',
        description: r.description || '',
        quantity,
        unit: r.unit || 'pc',
        unitPrice,
        amount: quantity * unitPrice,
        remarks: r.remarks || '',
      } as LineItem;
    });
    const finalItems = replaceMode ? mapped : [...(data.items || []), ...mapped];
    updateItems(finalItems);
  };

  useGlobalPasteImport({
    enabled: true,
    maxDirectInsert: 80,
    minConfidence: 0.7,
    onFallbackPreview: (raw, parsed) => setImportPreset({ raw, parsed }),
  });

  // context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const findContainingMergedCell = (rowIndex: number, column: 'description' | 'remarks'): MergedCellInfo | null => {
    const merged = column === 'description' ? mergedDescriptionCells : mergedRemarksCells;
    for (let i = 0; i < merged.length; i++) {
      const c = merged[i];
      if (c.isMerged && rowIndex >= c.startRow && rowIndex <= c.endRow) return c;
    }
    return null;
  };

  const findNextMergedGroupStartBeforeEnd = (currentEndRow: number, column: 'description' | 'remarks') => {
    const merged = column === 'description' ? mergedDescriptionCells : mergedRemarksCells;
    const next = merged.find((c) => c.isMerged && c.startRow > currentEndRow);
    return next ? next.startRow - 1 : data.items.length - 1;
  };

  const findPrevMergedGroupEndAfterStart = (currentStartRow: number, column: 'description' | 'remarks') => {
    const merged = column === 'description' ? mergedDescriptionCells : mergedRemarksCells;
    for (let i = merged.length - 1; i >= 0; i--) {
      const c = merged[i];
      if (c.isMerged && c.endRow < currentStartRow) return c.endRow + 1;
    }
    return 0;
  };

  const manualMergeRows = (startRow: number, endRow: number, column: 'remarks' | 'description' = 'remarks') => {
    // 暂时禁用description列的手动合并功能
    if (column === 'description') {
      return;
    }
    
    if (startRow === endRow) return;
    const field = column;
    const contents: string[] = [];
    for (let i = startRow; i <= endRow; i++) {
      const item = data.items?.[i];
      if (!item) continue;
      const content = ((item as any)?.[field] || '').trim();
      if (content) contents.push(content);
    }
    const mergedContent = contents.length > 1 ? contents.join('\n') : (contents[0] || '');

    const cell: MergedCellInfo = { startRow, endRow, content: mergedContent, isMerged: true };
    setManualMergedCells((prev) => ({ ...prev, [column]: [...prev[column], cell].sort((a, b) => a.startRow - b.startRow) }));
  };

  const splitMergedCell = (rowIndex: number) => {
    const column = contextMenu?.column || 'remarks';
    
    // 暂时禁用description列的拆分功能
    if (column === 'description') {
      return;
    }
    
    // 由于description列已禁用，这里只处理remarks列
    const mergedInfo = getMergedCellInfo(rowIndex, mergedRemarksCells);
    if (!mergedInfo || !mergedInfo.isMerged) return;

    setManualMergedCells((prev) => ({
      ...prev,
      [column]: prev[column].filter((c) => !(c.startRow === mergedInfo.startRow && c.endRow === mergedInfo.endRow)),
    }));
    if (process.env.NODE_ENV === 'development') console.log(`拆分合并单元格，行 ${rowIndex}，列 ${column}`);
  };

  const mergeToRow = (startRow: number, endRow: number) => {
    const column = contextMenu?.column || 'remarks';
    
    // 暂时禁用description列的合并功能
    if (column === 'description') {
      return;
    }
    
    const rowIndex = contextMenu?.rowIndex ?? 0;
    const existing = findContainingMergedCell(rowIndex, column);
    if (existing) {
      const newStart = Math.min(existing.startRow, startRow);
      const newEnd = Math.max(existing.endRow, endRow);
      setManualMergedCells((prev) => ({
        ...prev,
        [column]: prev[column].filter((c) => !(c.startRow === existing.startRow && c.endRow === existing.endRow)),
      }));
      manualMergeRows(newStart, newEnd, column);
    } else {
      manualMergeRows(startRow, endRow, column);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, rowIndex: number, column?: 'description' | 'remarks') => {
    // 暂时禁用description列的右键菜单合并功能
    if (column === 'description') {
      return;
    }
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, rowIndex, column });
  };
  const closeContextMenu = () => setContextMenu(null);

  // quantity / unitPrice edit helpers (mobile + desktop)
  const qtyInputProps = (index: number) => {
    const item = data.items?.[index];
    if (!item) return { value: '', onChange: () => {}, onFocus: () => {}, onBlur: () => {} };
    
    return {
      value: editingQtyIndex === index ? editingQtyAmount : (item.quantity === 0 ? '' : String(item.quantity)),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        if (/^\d*$/.test(v)) {
          setEditingQtyAmount(v);
          handleItemChange(index, 'quantity', v === '' ? 0 : parseInt(v, 10));
        }
      },
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        setEditingQtyIndex(index);
        setEditingQtyAmount(item.quantity === 0 ? '' : String(item.quantity));
        e.target.select();
        onFocusIOS(e);
      },
      onBlur: () => {
        setEditingQtyIndex(null);
        setEditingQtyAmount('');
      },
    };
  };

  const priceInputProps = (index: number) => {
    const item = data.items?.[index];
    if (!item) return { value: '', onChange: () => {}, onFocus: () => {}, onBlur: () => {} };
    
    return {
      value: editingPriceIndex === index ? editingPriceAmount : item.unitPrice.toFixed(2),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        if (/^\d*\.?\d*$/.test(v)) {
          setEditingPriceAmount(v);
          handleItemChange(index, 'unitPrice', v === '' ? 0 : parseFloat(v));
        }
      },
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        setEditingPriceIndex(index);
        setEditingPriceAmount(item.unitPrice === 0 ? '' : String(item.unitPrice));
        e.target.select();
        onFocusIOS(e);
      },
      onBlur: () => {
        setEditingPriceIndex(null);
        setEditingPriceAmount('');
      },
    };
  };

  /* ---------------------- Global Paste Import ---------------------- */
  // already registered above via useGlobalPasteImport

  /* =========================================================================
   * Section 6: Render
   * ========================================================================= */
  return (
    <div className="space-y-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-4">
          <ImportDataButton onImport={handleImport} />
          <div className="hidden md:block text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              提示：双击单元格可以切换红色高亮显示
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ColumnToggle
            descriptionMergeMode={descriptionMergeMode}
            remarksMergeMode={remarksMergeMode}
            onDescriptionMergeModeChange={setDescriptionMergeMode}
            onRemarksMergeModeChange={setRemarksMergeMode}
          />
          <QuickImport
            onInsert={handleInsertImported}
            presetRaw={importPreset?.raw}
            presetParsed={importPreset?.parsed}
            onClosePreset={() => setImportPreset(null)}
          />
        </div>
      </div>

      {/* Mobile cards */}
      <div className="block md:hidden space-y-4">
        {(data.items || []).map((item, index) => {
          // 只在开发环境且有解析器合并信息时才显示调试信息
          if (index < 2 && process.env.NODE_ENV === 'development' && ((mergedRemarks?.length ?? 0) > 0 || (mergedDescriptions?.length ?? 0) > 0)) {
            console.info('[IT:row', index, '] flags', {
              desc: { hide: !shouldRenderDescriptionCell(index, mergedDescriptionCells), start: !!getMergedDescriptionCellInfo(index, mergedDescriptionCells)?.isMerged },
              remark: { hide: !shouldRenderRemarkCell(index, mergedRemarksCells), start: !!getMergedCellInfo(index, mergedRemarksCells)?.isMerged },
            });
          }

          const descMergedInfo = getMergedDescriptionCellInfo(index, mergedDescriptionCells);
          const descIsMerged = !!descMergedInfo?.isMerged;

          const remarkMergedInfo = getMergedCellInfo(index, mergedRemarksCells);
          const remarkIsMerged = !!remarkMergedInfo?.isMerged;

          return (
            <div key={item.id} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Item #{index + 1}</div>
                <button type="button" onClick={() => handleSoftDelete(index)} className="transition-colors p-1 text-gray-400 hover:bg-red-100 hover:text-red-600" title="删除此项">
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Part Name */}
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Part Name</label>
                  <AutoGrowTextarea
                    value={item.partName}
                    onChange={(e) => handleItemChange(index, 'partName', e.target.value)}
                    onDoubleClick={() => handleDoubleClick(index, 'partName')}
                    isDarkMode={isDarkMode}
                    onFocusIOS={onFocusIOS}
                    className={`${item.highlight?.partName ? highlightClass : ''} border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg py-2`}
                    placeholder="Enter part name..."
                  />
                </div>

                {/* Description */}
                {effectiveVisibleCols.includes('description') && shouldRenderDescriptionCell(index, mergedDescriptionCells) && (
                  <div data-probe={`desc@row${index}`}>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Description</label>
                    <AutoGrowTextarea
                      value={descIsMerged ? (descMergedInfo?.content || '') : getDesc(item)}
                      onChange={(e) => handleTextareaChange(e, index, descIsMerged, descMergedInfo, 'description')}
                      onDoubleClick={() => handleDoubleClick(index, 'description')}
                      isDarkMode={isDarkMode}
                      onFocusIOS={onFocusIOS}
                      className={`${item.highlight?.description ? highlightClass : ''} ${descIsMerged ? 'border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20' : ''} border rounded-lg py-2`}
                      placeholder="Enter description..."
                    />
                  </div>
                )}

                {/* Qty + Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Quantity</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      {...qtyInputProps(index)}
                      onDoubleClick={() => handleDoubleClick(index, 'quantity')}
                      className={`w-full px-3 py-2 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                        focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                        text-[13px] text-center ios-optimized-input ${item.highlight?.quantity ? highlightClass : ''}`}
                      style={isDarkMode ? iosCaretStyleDark : iosCaretStyle}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      onDoubleClick={() => handleDoubleClick(index, 'unit')}
                      onFocus={onFocusIOS}
                      className={`w-full px-3 py-2 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                        focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                        text-[13px] text-center cursor-pointer appearance-none ios-optimized-input ${item.highlight?.unit ? highlightClass : ''}`}
                      style={isDarkMode ? iosCaretStyleDark : iosCaretStyle}
                    >
                      {availableUnits.map((unit) => {
                        const display = (defaultUnits as readonly string[]).includes(unit as string)
                          ? getUnitDisplay(unit as string, item.quantity)
                          : (unit as string);
                        return (
                          <option key={unit as string} value={display}>
                            {display}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* U/Price + Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Unit Price</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      {...priceInputProps(index)}
                      onDoubleClick={() => handleDoubleClick(index, 'unitPrice')}
                      className={`w-full px-3 py-2 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                        focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                        text-[13px] text-center ios-optimized-input ${item.highlight?.unitPrice ? highlightClass : ''}`}
                      style={isDarkMode ? iosCaretStyleDark : iosCaretStyle}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Amount</label>
                    <input
                      type="text"
                      value={item.amount.toFixed(2)}
                      readOnly
                      onDoubleClick={() => handleDoubleClick(index, 'amount')}
                      className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                        text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center cursor-default ${item.highlight?.amount ? highlightClass : ''}`}
                    />
                  </div>
                </div>

                {/* Remarks */}
                {effectiveVisibleCols.includes('remarks') && shouldRenderRemarkCell(index, mergedRemarksCells) && (
                  <div className={`${remarkIsMerged ? 'bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-2 shadow-sm border-l-2 border-l-blue-200 dark:border-l-blue-300' : ''}`}>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Remarks</label>
                    <AutoGrowTextarea
                      value={remarkIsMerged ? (remarkMergedInfo?.content || '') : (item.remarks || '')}
                      onChange={(e) => handleTextareaChange(e, index, remarkIsMerged, remarkMergedInfo, 'remarks')}
                      onDoubleClick={() => handleDoubleClick(index, 'remarks')}
                      isDarkMode={isDarkMode}
                      onFocusIOS={onFocusIOS}
                      className={`${item.highlight?.remarks ? highlightClass : ''} ${remarkIsMerged ? 'border-blue-200 dark:border-blue-700' : ''}`}
                      placeholder="Enter remarks..."
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Other Fees (mobile) */}
        {(data.otherFees ?? []).length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] px-1">Other Fees</div>
            {(data.otherFees ?? []).map((fee, index) => (
              <div key={fee.id} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Item #{((data.items?.length || 0) + index + 1)}</div>
                  <button type="button" onClick={() => handleOtherFeeSoftDelete(index)} className="transition-colors p-1 text-gray-400 hover:bg-red-100 hover:text-red-600" title="删除此项">
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Description</label>
                    <AutoGrowTextarea
                      value={fee.description}
                      onChange={(e) => handleOtherFeeChange(index, 'description', e.target.value)}
                      onDoubleClick={() => handleOtherFeeDoubleClick(index, 'description')}
                      isDarkMode={isDarkMode}
                      onFocusIOS={onFocusIOS}
                      className={`${fee.highlight?.description ? highlightClass : ''}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Amount</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editingOtherFeeIndex === index ? editingOtherFeeAmount : fee.amount.toFixed(2)}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^-?\d*\.?\d*$/.test(v)) {
                            setEditingOtherFeeAmount(v);
                            handleOtherFeeChange(index, 'amount', v === '' ? 0 : parseFloat(v));
                          }
                        }}
                        onFocus={(e) => {
                          setEditingOtherFeeIndex(index);
                          setEditingOtherFeeAmount(fee.amount === 0 ? '' : String(fee.amount));
                          e.target.select();
                          onFocusIOS(e);
                        }}
                        onBlur={() => {
                          setEditingOtherFeeIndex(null);
                          setEditingOtherFeeAmount('');
                        }}
                        onDoubleClick={() => handleOtherFeeDoubleClick(index, 'amount')}
                        className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                          focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                          text-[13px] text-center ios-optimized-input ${fee.highlight?.amount ? highlightClass : ''}`}
                        style={isDarkMode ? iosCaretStyleDark : iosCaretStyle}
                        placeholder="0.00"
                      />
                    </div>
                    {effectiveVisibleCols.includes('remarks') && (
                      <div>
                        <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Remarks</label>
                        <AutoGrowTextarea
                          value={fee.remarks || ''}
                          onChange={(e) => handleOtherFeeChange(index, 'remarks', e.target.value)}
                          onDoubleClick={() => handleOtherFeeDoubleClick(index, 'remarks')}
                          isDarkMode={isDarkMode}
                          onFocusIOS={onFocusIOS}
                          className={`${fee.highlight?.remarks ? highlightClass : ''}`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div
              className={`border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl overflow-hidden ${
                (data.otherFees ?? []).length > 0 ? 'rounded-t-2xl' : 'rounded-2xl'
              }`}
            >
              <table className="w-full divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] table-fixed">
                <thead>
                  <tr
                    className={`bg-[#F5F5F7] dark:bg-[#3A3A3C] border-b border-[#E5E5EA] dark:border-[#48484A] ${
                      (data.otherFees ?? []).length === 0 ? 'rounded-t-2xl overflow-hidden' : ''
                    }`}
                  >
                    <th
                      className={`left-0 z-10 w-12 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]
                      bg-[#F5F5F7] dark:bg-[#3A3A3C] ${(data.otherFees ?? []).length === 0 ? 'rounded-tl-2xl' : ''}`}
                    >
                      No.
                    </th>
                    {effectiveVisibleCols.includes('partName') && (
                      <th className="px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap min-w-[120px]">
                        Part Name
                      </th>
                    )}
                    {effectiveVisibleCols.includes('description') && (
                      <th className="px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] min-w-[120px]">Description</th>
                    )}
                    {effectiveVisibleCols.includes('quantity') && (
                      <th className="w-24 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Q&apos;TY</th>
                    )}
                    {effectiveVisibleCols.includes('unit') && (
                      <th className="w-24 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Unit</th>
                    )}
                    {effectiveVisibleCols.includes('unitPrice') && (
                      <th className="w-32 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">U/Price</th>
                    )}
                    {effectiveVisibleCols.includes('amount') && (
                      <th className="w-28 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Amount</th>
                    )}
                    {effectiveVisibleCols.includes('remarks') && (
                      <th
                        className={`min-w-[120px] px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] ${
                          (data.otherFees ?? []).length === 0 ? 'rounded-tr-2xl' : ''
                        }`}
                      >
                        Remarks
                      </th>
                    )}
                    {(!effectiveVisibleCols.includes('remarks') || visibleCols.length === 0) && (
                      <th
                        className={`w-12 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] ${
                          (data.otherFees ?? []).length === 0 ? 'rounded-tr-2xl' : ''
                        }`}
                      />
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white/90 dark:bg-[#1C1C1E]/90">
                  {(data.items || []).map((item, index) => {
                    const descMergedInfo = getMergedDescriptionCellInfo(index, mergedDescriptionCells);
                    const descRowSpan = descMergedInfo ? descMergedInfo.endRow - descMergedInfo.startRow + 1 : 1;
                    const descIsMerged = !!descMergedInfo?.isMerged;

                    const remarkMergedInfo = getMergedCellInfo(index, mergedRemarksCells);
                    const remarkRowSpan = remarkMergedInfo ? remarkMergedInfo.endRow - remarkMergedInfo.startRow + 1 : 1;
                    const remarkIsMerged = !!remarkMergedInfo?.isMerged;

                    return (
                      <tr key={item.id} className="border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                        <td
                          className={`sticky left-0 z-10 w-12 px-2 py-2 text-center text-sm bg-white/90 dark:bg-[#1C1C1E]/90 ${
                            index === (data.items || []).length - 1 && !data.otherFees?.length ? 'rounded-bl-2xl' : ''
                          }`}
                        >
                          <span
                            className="flex items-center justify-center w-5 h-5 rounded-full text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 cursor-pointer transition-colors"
                            onClick={() => handleSoftDelete(index)}
                            title="Click to delete"
                          >
                            {index + 1}
                          </span>
                        </td>

                        {effectiveVisibleCols.includes('partName') && (
                          <td className="px-2 py-2 bg-white/90 dark:bg-[#1C1C1E]/90">
                            <AutoGrowTextarea
                              value={item.partName}
                              onChange={(e) => handleItemChange(index, 'partName', e.target.value)}
                              onDoubleClick={() => handleDoubleClick(index, 'partName')}
                              isDarkMode={isDarkMode}
                              onFocusIOS={onFocusIOS}
                              className={`${item.highlight?.partName ? highlightClass : ''}`}
                            />
                          </td>
                        )}

                        {/* Description cell */}
                        {effectiveVisibleCols.includes('description') && shouldRenderDescriptionCell(index, mergedDescriptionCells) && (
                          <td
                            data-probe={`desc@row${index}`}
                            className={`px-2 py-2 transition-all duration-300 ease-in-out ${
                              descIsMerged ? 'bg-blue-50/50 dark:bg-blue-900/20 shadow-sm border-l-2 border-l-blue-200 dark:border-l-blue-300' : ''
                            }`}
                            rowSpan={descIsMerged ? descRowSpan : undefined}
                            onContextMenu={(e) => handleContextMenu(e, index, 'description')}
                          >
                            <AutoGrowTextarea
                              value={descIsMerged ? (descMergedInfo?.content || '') : getDesc(item)}
                              onChange={(e) => handleTextareaChange(e, index, descIsMerged, descMergedInfo, 'description')}
                              onDoubleClick={() => handleDoubleClick(index, 'description')}
                              isDarkMode={isDarkMode}
                              onFocusIOS={onFocusIOS}
                              className={`${item.highlight?.description ? highlightClass : ''} ${descIsMerged ? 'border-blue-200 dark:border-blue-700' : ''}`}
                              title=""
                            />
                          </td>
                        )}

                        {/* Quantity */}
                        {effectiveVisibleCols.includes('quantity') && (
                          <td className="w-24 px-2 py-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              {...qtyInputProps(index)}
                              onDoubleClick={() => handleDoubleClick(index, 'quantity')}
                              className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                                focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                                text-[13px] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                                [&::-webkit-inner-spin-button]:appearance-none ios-optimized-input ${item.highlight?.quantity ? highlightClass : ''}`}
                              style={isDarkMode ? iosCaretStyleDark : iosCaretStyle}
                            />
                          </td>
                        )}

                        {/* Unit */}
                        {effectiveVisibleCols.includes('unit') && (
                          <td className="w-24 px-2 py-2">
                            <select
                              value={item.unit}
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                              onDoubleClick={() => handleDoubleClick(index, 'unit')}
                              onFocus={onFocusIOS}
                              className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                                focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                                text-[13px] text-center cursor-pointer appearance-none ios-optimized-input ${item.highlight?.unit ? highlightClass : ''}`}
                              style={isDarkMode ? iosCaretStyleDark : iosCaretStyle}
                            >
                              {availableUnits.map((unit) => {
                                const display = (defaultUnits as readonly string[]).includes(unit as string)
                                  ? getUnitDisplay(unit as string, item.quantity)
                                  : (unit as string);
                                return (
                                  <option key={unit as string} value={display}>
                                    {display}
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                        )}

                        {/* Unit Price */}
                        {effectiveVisibleCols.includes('unitPrice') && (
                          <td className="w-32 px-2 py-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              {...priceInputProps(index)}
                              onDoubleClick={() => handleDoubleClick(index, 'unitPrice')}
                              className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                                focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                                text-[13px] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                                [&::-webkit-inner-spin-button]:appearance-none ios-optimized-input ${item.highlight?.unitPrice ? highlightClass : ''}`}
                              style={isDarkMode ? iosCaretStyleDark : iosCaretStyle}
                            />
                          </td>
                        )}

                        {/* Amount */}
                        {effectiveVisibleCols.includes('amount') && (
                          <td className="w-28 px-2 py-2">
                            <input
                              type="text"
                              value={item.amount.toFixed(2)}
                              readOnly
                              onDoubleClick={() => handleDoubleClick(index, 'amount')}
                              className={`w-full px-3 py-1.5 bg-transparent text-[13px] text-center ios-optimized-input ${
                                item.highlight?.amount ? highlightClass : ''
                              }`}
                              style={isDarkMode ? iosCaretStyleDark : iosCaretStyle}
                            />
                          </td>
                        )}

                        {/* Remarks */}
                        {effectiveVisibleCols.includes('remarks') && shouldRenderRemarkCell(index, mergedRemarksCells) && (
                          <td
                            className={`w-1/5 px-2 py-2 transition-all duration-300 ease-in-out ${
                              remarkIsMerged ? 'bg-blue-50/50 dark:bg-blue-900/20 shadow-sm border-l-2 border-l-blue-200 dark:border-l-blue-300' : ''
                            }`}
                            rowSpan={remarkIsMerged ? remarkRowSpan : undefined}
                            onContextMenu={(e) => handleContextMenu(e, index, 'remarks')}
                          >
                            <AutoGrowTextarea
                              value={remarkIsMerged ? (remarkMergedInfo?.content || '') : (item.remarks || '')}
                              onChange={(e) => handleTextareaChange(e, index, remarkIsMerged, remarkMergedInfo, 'remarks')}
                              onDoubleClick={() => handleDoubleClick(index, 'remarks')}
                              isDarkMode={isDarkMode}
                              onFocusIOS={onFocusIOS}
                              className={`${item.highlight?.remarks ? highlightClass : ''} ${remarkIsMerged ? 'border-blue-200 dark:border-blue-700' : ''}`}
                              title=""
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Other Fees (desktop) */}
            {(data.otherFees ?? []).length > 0 && (
              <div className="border border-t-0 border-[#E5E5EA] dark:border-[#2C2C2E] bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl overflow-hidden rounded-b-2xl">
                <table className="w-full">
                  <tbody className="bg-white/90 dark:bg-[#1C1C1E]/90">
                    {(data.otherFees ?? []).map((fee, index) => (
                      <tr key={fee.id} className="border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                        <td
                          className={`sticky left-0 z-10 w-12 px-2 py-2 text-center text-sm bg-white/90 dark:bg-[#1C1C1E]/90 ${
                            index === (data.otherFees ?? []).length - 1 ? 'rounded-bl-2xl' : ''
                          }`}
                        >
                          <span
                            className="flex items-center justify-center w-5 h-5 rounded-full text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 cursor-pointer transition-colors"
                            onClick={() => handleOtherFeeSoftDelete(index)}
                            title="Click to delete"
                          >
                            {(data.items?.length || 0) + index + 1}
                          </span>
                        </td>
                        <td colSpan={effectiveVisibleCols.includes('description') ? 6 : 5} className="px-2 py-2">
                          <AutoGrowTextarea
                            value={fee.description}
                            onChange={(e) => handleOtherFeeChange(index, 'description', e.target.value)}
                            onDoubleClick={() => handleOtherFeeDoubleClick(index, 'description')}
                            isDarkMode={isDarkMode}
                            onFocusIOS={onFocusIOS}
                            className={`${fee.highlight?.description ? highlightClass : ''} text-center`}
                          />
                        </td>
                        <td className={`w-28 px-2 py-2 ${index === (data.otherFees ?? []).length - 1 && !effectiveVisibleCols.includes('remarks') ? 'rounded-br-2xl' : ''}`}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editingOtherFeeIndex === index ? editingOtherFeeAmount : fee.amount.toFixed(2)}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (/^-?\d*\.?\d*$/.test(v)) {
                                setEditingOtherFeeAmount(v);
                                handleOtherFeeChange(index, 'amount', v === '' ? 0 : parseFloat(v));
                              }
                            }}
                            onFocus={(e) => {
                              setEditingOtherFeeIndex(index);
                              setEditingOtherFeeAmount(fee.amount === 0 ? '' : String(fee.amount));
                              e.target.select();
                              onFocusIOS(e);
                            }}
                            onBlur={() => {
                              setEditingOtherFeeIndex(null);
                              setEditingOtherFeeAmount('');
                            }}
                            onDoubleClick={() => handleOtherFeeDoubleClick(index, 'amount')}
                            className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                              focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                              text-[13px] text-center whitespace-pre-wrap ios-optimized-input ${fee.highlight?.amount ? highlightClass : ''}`}
                            style={isDarkMode ? iosCaretStyleDark : iosCaretStyle}
                            placeholder="0.00"
                          />
                        </td>
                        {effectiveVisibleCols.includes('remarks') && (
                          <td className={`w-1/5 px-2 py-2 ${index === (data.otherFees ?? []).length - 1 ? 'rounded-br-2xl' : ''}`}>
                            <AutoGrowTextarea
                              value={fee.remarks || ''}
                              onChange={(e) => handleOtherFeeChange(index, 'remarks', e.target.value)}
                              onDoubleClick={() => handleOtherFeeDoubleClick(index, 'remarks')}
                              isDarkMode={isDarkMode}
                              onFocusIOS={onFocusIOS}
                              className={`${fee.highlight?.remarks ? highlightClass : ''} text-center`}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu (manual mode only) */}
      <MergeContextMenu
        menu={contextMenu}
        onClose={closeContextMenu}
        onSplit={splitMergedCell}
        onMergeUp={(rowIndex) => {
          const column = contextMenu?.column || 'remarks';
          const existing = findContainingMergedCell(rowIndex, column);
          const start = existing ? Math.max(existing.startRow - 1, 0) : Math.max(rowIndex - 1, 0);
          const end = existing ? existing.endRow : rowIndex;
          mergeToRow(start, end);
        }}
        onMergeUpMore={(rowIndex) => {
          const column = contextMenu?.column || 'remarks';
          const existing = findContainingMergedCell(rowIndex, column);
          const start = existing ? findPrevMergedGroupEndAfterStart(existing.startRow, column) : Math.max(rowIndex - 3, 0);
          const end = existing ? existing.endRow : rowIndex;
          mergeToRow(start, end);
        }}
        onMergeDown={(rowIndex) => {
          const column = contextMenu?.column || 'remarks';
          const existing = findContainingMergedCell(rowIndex, column);
          const start = existing ? existing.startRow : rowIndex;
          const end = existing ? Math.min(existing.endRow + 1, data.items.length - 1) : Math.min(rowIndex + 1, data.items.length - 1);
          mergeToRow(start, end);
        }}
        onMergeDownMore={(rowIndex) => {
          const column = contextMenu?.column || 'remarks';
          const existing = findContainingMergedCell(rowIndex, column);
          const start = existing ? existing.startRow : rowIndex;
          const end = existing ? findNextMergedGroupStartBeforeEnd(existing.endRow, column) : Math.min(rowIndex + 4, data.items.length - 1);
          mergeToRow(start, end);
        }}
        isManualMode={
          contextMenu?.column === 'description' ? descriptionMergeMode === 'manual' : remarksMergeMode === 'manual'
        }
        canMergeUp={(contextMenu?.rowIndex ?? 0) > 0}
        canMergeDown={(contextMenu?.rowIndex ?? 0) < data.items.length - 1}
      />
    </div>
  );
};
