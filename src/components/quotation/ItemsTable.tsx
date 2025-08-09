import React, { useState, useEffect, useCallback } from 'react';
import { ImportDataButton } from './ImportDataButton';
import { ColumnToggle } from './ColumnToggle';
import { CellErrorDot } from './CellErrorDot';
import { QuickImport } from './QuickImport';
import { useTablePrefsHydrated } from '@/features/quotation/state/useTablePrefs';
import { validateRow } from '@/features/quotation/utils/rowValidate';
import { useGlobalPasteImport } from '@/features/quotation/hooks/useGlobalPasteImport';
import type { QuotationData, LineItem, OtherFee } from '@/types/quotation';
import type { ParseResult } from '@/features/quotation/utils/quickSmartParse';

interface ItemsTableProps {
  data: QuotationData;
  // 拆分为专用回调，拒绝整包更新
  onItemsChange?: (items: LineItem[]) => void;
  onOtherFeesChange?: (fees: OtherFee[]) => void;
  // 兼容旧接口（过渡期）
  onChange?: (data: QuotationData) => void;
}

// Add highlight class constant
const highlightClass = 'text-red-500 dark:text-red-400 font-medium';

// 默认单位列表（需要单复数变化的单位）
const defaultUnits = ['pc', 'set', 'length'] as const;

// 简化的iOS光标优化样式
const iosCaretStyle = {
  caretColor: '#007AFF',
  WebkitCaretColor: '#007AFF',
} as React.CSSProperties;

// 暗色模式的光标颜色
const iosCaretStyleDark = {
  caretColor: '#0A84FF',
  WebkitCaretColor: '#0A84FF',
} as React.CSSProperties;

export const ItemsTable: React.FC<ItemsTableProps> = ({ 
  data, 
  onItemsChange, 
  onOtherFeesChange, 
  onChange 
}) => {
  // 可见列配置（使用水化版本）
  const { visibleCols, isHydrated } = useTablePrefsHydrated();
  
  // 确保水化前使用默认列配置，避免水化错误
  const effectiveVisibleCols = isHydrated ? visibleCols : ['partName', 'quantity', 'unit', 'unitPrice', 'amount'];
  
  // 可用单位列表
  const availableUnits = [...defaultUnits, ...(data.customUnits || [])] as const;

  // 内部适配器：优先使用专用回调，fallback到旧接口
  const updateItems = useCallback((newItems: LineItem[]) => {
    if (onItemsChange) {
      onItemsChange(newItems);
    } else if (onChange) {
      // 兼容旧接口，但会在开发模式警告
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ItemsTable] 使用deprecated接口onChange，建议迁移到onItemsChange');
      }
      updateItems(newItems);
    }
  }, [onItemsChange, onChange, data]);

  const updateOtherFees = useCallback((newFees: OtherFee[]) => {
    if (onOtherFeesChange) {
      onOtherFeesChange(newFees);
    } else if (onChange) {
      // 兼容旧接口，但会在开发模式警告
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ItemsTable] 使用deprecated接口onChange，建议迁移到onOtherFeesChange');
      }
      onChange({ ...data, otherFees: newFees });
    }
  }, [onOtherFeesChange, onChange, data]);

  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [editingPriceAmount, setEditingPriceAmount] = useState<string>('');
  const [editingQtyIndex, setEditingQtyIndex] = useState<number | null>(null);
  const [editingQtyAmount, setEditingQtyAmount] = useState<string>('');
  const [editingOtherFeeIndex, setEditingOtherFeeIndex] = useState<number | null>(null);
  const [editingOtherFeeAmount, setEditingOtherFeeAmount] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // 全局粘贴预设数据状态
  const [importPreset, setImportPreset] = useState<{raw: string, parsed: ParseResult} | null>(null);

  // 注册全局粘贴功能
  useGlobalPasteImport({
    enabled: true,
    maxDirectInsert: 80,
    minConfidence: 0.7,
    onFallbackPreview: (raw, parsed) => {
      setImportPreset({ raw, parsed });
    },
  });

  // 检测暗色模式
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };

    checkDarkMode();
    
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeQuery.addEventListener('change', checkDarkMode);
      return () => darkModeQuery.removeEventListener('change', checkDarkMode);
    }
  }, []);

  // 简化的iOS输入框优化处理函数
  const handleIOSInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const element = e.target;
    
    // 设置光标颜色
    element.style.caretColor = isDarkMode ? '#0A84FF' : '#007AFF';
    (element.style as any).webkitCaretColor = isDarkMode ? '#0A84FF' : '#007AFF';
  };

  // 处理单位的单复数
  const getUnitDisplay = (baseUnit: string, quantity: number) => {
    if (defaultUnits.includes(baseUnit as typeof defaultUnits[number])) {
      return quantity > 1 ? `${baseUnit}s` : baseUnit;
    }
    return baseUnit; // 自定义单位不变化单复数
  };

  // 处理单个项目的更改
  const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...data.items];
    const updatedItem = { ...newItems[index] };

    if (field === 'quantity' || field === 'unitPrice') {
      const numValue = Number(value);
      (updatedItem as any)[field] = numValue;
      
      // 重新计算金额
      updatedItem.amount = updatedItem.quantity * updatedItem.unitPrice;
      
      // 根据数量更新单位
      if (field === 'quantity') {
        const baseUnit = updatedItem.unit.replace(/s$/, '');
        updatedItem.unit = getUnitDisplay(baseUnit, numValue);
      }
    } else {
      (updatedItem as any)[field] = value;
    }

    newItems[index] = updatedItem;
    updateItems(newItems);
  };

  // 处理软删除
  const handleSoftDelete = (index: number) => {
    const newItems = data.items.filter((_, i) => i !== index);
    updateItems(newItems);
  };

  // 处理双击事件
  const handleDoubleClick = (index: number, field: keyof Exclude<LineItem['highlight'], undefined>) => {
    const newItems = [...data.items];
    newItems[index] = {
      ...newItems[index],
      highlight: {
        ...newItems[index].highlight,
        [field]: !newItems[index].highlight?.[field]
      }
    };
    updateItems(newItems);
  };

  // 处理其他费用更改
  const handleOtherFeeChange = (index: number, field: 'description' | 'amount' | 'remarks', value: string | number) => {
    const newOtherFees = [...(data.otherFees || [])];
    const updatedFee = { ...newOtherFees[index] };
    (updatedFee as any)[field] = value;
    newOtherFees[index] = updatedFee;
    updateOtherFees(newOtherFees);
  };

  // 处理其他费用双击事件
  const handleOtherFeeDoubleClick = (index: number, field: 'description' | 'amount' | 'remarks') => {
    const newOtherFees = [...(data.otherFees || [])];
    newOtherFees[index] = {
      ...newOtherFees[index],
      highlight: {
        ...newOtherFees[index].highlight,
        [field]: !newOtherFees[index].highlight?.[field]
      }
    };
    updateOtherFees(newOtherFees);
  };

  // 处理其他费用软删除
  const handleOtherFeeSoftDelete = (index: number) => {
    const newOtherFees = (data.otherFees || []).filter((_, i) => i !== index);
    updateOtherFees(newOtherFees);
  };

  // 处理导入数据
  const handleImport = (newItems: typeof data.items) => {
    const processedItems = newItems.map(item => {
      const baseUnit = item.unit.replace(/s$/, '');
      return {
        ...item,
        unit: defaultUnits.includes(baseUnit as typeof defaultUnits[number]) ? getUnitDisplay(baseUnit, item.quantity) : item.unit
      };
    });

    updateItems(processedItems);
  };

  // 处理快速导入插入
  const handleInsertImported = (rows: any[], replaceMode: boolean = false) => {
    // 生成 id、补 amount
    let maxId = replaceMode ? 0 : (data.items || []).reduce((m, it) => Math.max(m, it.id), 0);
    const mapped = rows.map(r => {
      const quantity = Number(r.quantity) || 0;
      const unitPrice = Number(r.unitPrice) || 0;
      return {
        id: ++maxId,
        partName: r.partName || '',
        description: r.description || '',
        quantity,
        unit: r.unit || 'pc',
        unitPrice,
        amount: quantity * unitPrice,
        remarks: '',
      };
    });
    
    // 根据模式决定替换还是追加
    const finalItems = replaceMode ? mapped : [...(data.items || []), ...mapped];
    updateItems(finalItems);
  };

  return (
    <div className="space-y-0">
      {/* 表格工具栏 */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <ImportDataButton onImport={handleImport} />
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <div>提示：双击单元格可以切换红色高亮显示</div>
            {/* 已移除快捷粘贴提示 */}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ColumnToggle />
          <QuickImport 
            onInsert={handleInsertImported}
            presetRaw={importPreset?.raw}
            presetParsed={importPreset?.parsed}
            onClosePreset={() => setImportPreset(null)}
          />
        </div>
      </div>
      
      {/* 移动端卡片视图 - 中屏以下显示 */}
      <div className="block md:hidden space-y-4">
        {(data.items || []).map((item, index) => (
          <div key={item.id} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
            {/* 卡片头部 */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                Item #{index + 1}
              </div>
              <button
                type="button"
                onClick={() => handleSoftDelete(index)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="删除此项"
              >
                ×
              </button>
            </div>

            {/* 卡片内容 */}
            <div className="grid grid-cols-1 gap-4">
              {/* Part Name */}
              <div>
                <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Part Name</label>
                <textarea
                  value={item.partName}
                  onChange={(e) => {
                    handleItemChange(index, 'partName', e.target.value);
                    e.target.style.height = '28px';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onDoubleClick={() => handleDoubleClick(index, 'partName')}
                  onFocus={handleIOSInputFocus}
                  className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                    focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                    text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                    ios-optimized-input resize-y overflow-hidden whitespace-pre-wrap
                    ${item.highlight?.partName ? highlightClass : ''}`}
                  style={{ 
                    height: '28px',
                    ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                  }}
                  placeholder="Enter part name..."
                />
              </div>

              {/* Description */}
              {effectiveVisibleCols.includes('description') && (
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Description</label>
                  <textarea
                    value={item.description}
                    onChange={(e) => {
                      handleItemChange(index, 'description', e.target.value);
                      e.target.style.height = '28px';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onDoubleClick={() => handleDoubleClick(index, 'description')}
                    onFocus={handleIOSInputFocus}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                      ios-optimized-input resize-y overflow-hidden whitespace-pre-wrap
                      ${item.highlight?.description ? highlightClass : ''}`}
                    style={{ 
                      height: '28px',
                      ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                    }}
                    placeholder="Enter description..."
                  />
                </div>
              )}

              {/* 数量和单位 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Quantity</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editingQtyIndex === index ? editingQtyAmount : (item.quantity === 0 ? '' : item.quantity.toString())}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                        setEditingQtyAmount(value);
                        handleItemChange(index, 'quantity', value === '' ? 0 : parseInt(value));
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
                    onDoubleClick={() => handleDoubleClick(index, 'quantity')}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                      ios-optimized-input
                      ${item.highlight?.quantity ? highlightClass : ''}`}
                    style={{
                      ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Unit</label>
                  <select
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    onDoubleClick={() => handleDoubleClick(index, 'unit')}
                    onFocus={handleIOSInputFocus}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center cursor-pointer
                      appearance-none ios-optimized-input
                      ${item.highlight?.unit ? highlightClass : ''}`}
                    style={{
                      ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                    }}
                  >
                    {availableUnits.map(unit => {
                      const displayUnit = defaultUnits.includes(unit as typeof defaultUnits[number]) ? getUnitDisplay(unit, item.quantity) : unit;
                      return (
                        <option key={unit} value={displayUnit}>
                          {displayUnit}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* 单价和金额 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Unit Price</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editingPriceIndex === index ? editingPriceAmount : item.unitPrice.toFixed(2)}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d*$/.test(value)) {
                        setEditingPriceAmount(value);
                        handleItemChange(index, 'unitPrice', value === '' ? 0 : parseFloat(value));
                      }
                    }}
                    onFocus={(e) => {
                      setEditingPriceIndex(index);
                      setEditingPriceAmount(item.unitPrice === 0 ? '' : item.unitPrice.toString());
                      e.target.select();
                      handleIOSInputFocus(e);
                    }}
                    onBlur={() => {
                      setEditingPriceIndex(null);
                      setEditingPriceAmount('');
                    }}
                    onDoubleClick={() => handleDoubleClick(index, 'unitPrice')}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                      ios-optimized-input
                      ${item.highlight?.unitPrice ? highlightClass : ''}`}
                    style={{
                      ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                    }}
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
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center cursor-default
                      ${item.highlight?.amount ? highlightClass : ''}`}
                  />
                </div>
              </div>

              {/* Remarks */}
                                  {effectiveVisibleCols.includes('remarks') && (
                      <div>
                        <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Remarks</label>
                  <textarea
                    value={item.remarks}
                    onChange={(e) => {
                      handleItemChange(index, 'remarks', e.target.value);
                      e.target.style.height = '28px';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onDoubleClick={() => handleDoubleClick(index, 'remarks')}
                    onFocus={handleIOSInputFocus}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                      ios-optimized-input resize-y overflow-hidden whitespace-pre-wrap
                      ${item.highlight?.remarks ? highlightClass : ''}`}
                    style={{ 
                      height: '28px',
                      ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                    }}
                    placeholder="Enter remarks..."
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Other Fees 卡片 - 移动端 */}
        {(data.otherFees ?? []).length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] px-1">
              Other Fees
            </div>
            {(data.otherFees ?? []).map((fee, index) => (
              <div key={fee.id} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
                {/* 卡片头部 */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Other Fee #{index + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOtherFeeSoftDelete(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="删除此项"
                  >
                    ×
                  </button>
                </div>

                {/* 卡片内容 */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Description</label>
                    <textarea
                      value={fee.description}
                      onChange={(e) => {
                        handleOtherFeeChange(index, 'description', e.target.value);
                        e.target.style.height = '28px';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onDoubleClick={() => handleOtherFeeDoubleClick(index, 'description')}
                      onFocus={handleIOSInputFocus}
                      className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                        focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                        hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                        text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                        placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                        transition-all duration-200 text-center whitespace-pre-wrap resize-y overflow-hidden
                        ios-optimized-input
                        ${fee.highlight?.description ? highlightClass : ''}`}
                      style={{ 
                        height: '28px',
                        ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                      }}
                    />
                  </div>

                  {/* Amount and Remarks */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Amount</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editingOtherFeeIndex === index ? editingOtherFeeAmount : fee.amount.toFixed(2)}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^-?\d*\.?\d*$/.test(value)) {
                            setEditingOtherFeeAmount(value);
                            handleOtherFeeChange(index, 'amount', value === '' ? 0 : parseFloat(value));
                          }
                        }}
                        onFocus={(e) => {
                          setEditingOtherFeeIndex(index);
                          setEditingOtherFeeAmount(fee.amount === 0 ? '' : fee.amount.toString());
                          e.target.select();
                          handleIOSInputFocus(e);
                        }}
                        onBlur={() => {
                          setEditingOtherFeeIndex(null);
                          setEditingOtherFeeAmount('');
                        }}
                        onDoubleClick={() => handleOtherFeeDoubleClick(index, 'amount')}
                        className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                          focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                          hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                          text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                          placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                          transition-all duration-200 text-center whitespace-pre-wrap
                          ios-optimized-input
                          ${fee.highlight?.amount ? highlightClass : ''}`}
                        style={{
                          ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    {effectiveVisibleCols.includes('remarks') && (
                      <div>
                        <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Remarks</label>
                        <textarea
                          value={fee.remarks || ''}
                          onChange={(e) => {
                            handleOtherFeeChange(index, 'remarks', e.target.value);
                            e.target.style.height = '28px';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onDoubleClick={() => handleOtherFeeDoubleClick(index, 'remarks')}
                          onFocus={handleIOSInputFocus}
                          className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                            focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                            placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                            transition-all duration-200 text-center whitespace-pre-wrap resize-y overflow-hidden
                            ios-optimized-input
                            ${fee.highlight?.remarks ? highlightClass : ''}`}
                          style={{ 
                            height: '28px',
                            ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                          }}
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

      {/* 桌面端表格视图 - 中屏及以上显示 */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className={`border border-[#E5E5EA] dark:border-[#2C2C2E]
              bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl overflow-hidden
              ${(data.otherFees ?? []).length > 0 ? 'rounded-t-2xl' : 'rounded-2xl'}`}>
              <table className="w-full divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] table-fixed">
                <thead>
                  <tr className={`bg-[#F5F5F7] dark:bg-[#3A3A3C]
                    border-b border-[#E5E5EA] dark:border-[#48484A]
                    ${(data.otherFees ?? []).length === 0 ? 'rounded-t-2xl overflow-hidden' : ''}`}>
                    <th className={`left-0 z-10 w-12 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]
                      bg-[#F5F5F7] dark:bg-[#3A3A3C]
                      ${(data.otherFees ?? []).length === 0 ? 'rounded-tl-2xl' : ''}`}>No.</th>
                    {effectiveVisibleCols.includes('partName') && (
                      <th className="px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap min-w-[120px]">Part Name</th>
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
                      <th className={`min-w-[120px] px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]
                        ${(data.otherFees ?? []).length === 0 ? 'rounded-tr-2xl' : ''}`}>Remarks</th>
                    )}
                    {(!effectiveVisibleCols.includes('remarks') || visibleCols.length === 0) && (
                      <th className={`w-12 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]
                        ${(data.otherFees ?? []).length === 0 ? 'rounded-tr-2xl' : ''}`}></th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white/90 dark:bg-[#1C1C1E]/90">
                  {(data.items || []).map((item, index) => {
                    const err = validateRow(item);
                    return (
                    <tr key={item.id} className="border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                      <td className={`sticky left-0 z-10 w-12 px-2 py-2 text-center text-sm bg-white/90 dark:bg-[#1C1C1E]/90
                        ${index === (data.items || []).length - 1 && !data.otherFees?.length ? 'rounded-bl-2xl' : ''}`}>
                        <span 
                          className="flex items-center justify-center w-5 h-5 rounded-full 
                            text-xs text-gray-400
                            hover:bg-red-100 hover:text-red-600 
                            cursor-pointer transition-colors"
                          onClick={() => handleSoftDelete(index)}
                          title="Click to delete"
                        >
                          {index + 1}
                        </span>
                      </td>
                      {effectiveVisibleCols.includes('partName') && (
                        <td className="px-2 py-2 bg-white/90 dark:bg-[#1C1C1E]/90">
                          <div className="flex items-center">
                            <textarea
                              value={item.partName}
                              onChange={(e) => {
                                handleItemChange(index, 'partName', e.target.value);
                                e.target.style.height = '28px';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              onDoubleClick={() => handleDoubleClick(index, 'partName')}
                              onFocus={handleIOSInputFocus}
                              className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                                focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                                hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                                text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                                placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                                transition-all duration-200 text-center whitespace-pre-wrap resize-y overflow-hidden
                                ios-optimized-input
                                ${item.highlight?.partName ? highlightClass : ''}`}
                              style={{ 
                                height: '28px',
                                ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                              }}
                            />
                            {err?.field === 'partName' && <CellErrorDot title={err.msg} />}
                          </div>
                        </td>
                      )}
                      {effectiveVisibleCols.includes('description') && (
                        <td className="px-2 py-2">
                          <textarea
                            value={item.description}
                            onChange={(e) => {
                              handleItemChange(index, 'description', e.target.value);
                              e.target.style.height = '28px';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onDoubleClick={() => handleDoubleClick(index, 'description')}
                            onFocus={handleIOSInputFocus}
                            className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                              focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                              hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                              text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                              placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                              transition-all duration-200 text-center whitespace-pre-wrap resize-y overflow-hidden
                              ios-optimized-input
                              ${item.highlight?.description ? highlightClass : ''}`}
                            style={{ 
                              height: '28px',
                              ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                            }}
                          />
                        </td>
                      )}
                      {effectiveVisibleCols.includes('quantity') && (
                        <td className="w-24 px-2 py-2">
                          <div className="flex items-center">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editingQtyIndex === index ? editingQtyAmount : item.quantity.toString()}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*$/.test(value)) {
                                  setEditingQtyAmount(value);
                                  handleItemChange(index, 'quantity', value === '' ? 0 : parseInt(value));
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
                              onDoubleClick={() => handleDoubleClick(index, 'quantity')}
                              className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                                focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                                hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                                text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                                placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                                transition-all duration-200 text-center
                                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                                ios-optimized-input
                                ${item.highlight?.quantity ? highlightClass : ''}`}
                              style={{
                                ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                              }}
                            />
                            {err?.field === 'quantity' && <CellErrorDot title={err.msg} />}
                          </div>
                        </td>
                      )}
                      {effectiveVisibleCols.includes('unit') && (
                        <td className="w-24 px-2 py-2">
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            onDoubleClick={() => handleDoubleClick(index, 'unit')}
                            onFocus={handleIOSInputFocus}
                            className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                              focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                              hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                              text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                              placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                              transition-all duration-200 text-center cursor-pointer
                              appearance-none ios-optimized-input
                              ${item.highlight?.unit ? highlightClass : ''}`}
                            style={{
                              ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                            }}
                          >
                            {availableUnits.map(unit => {
                              const displayUnit = defaultUnits.includes(unit as typeof defaultUnits[number]) ? getUnitDisplay(unit, item.quantity) : unit;
                              return (
                                <option key={unit} value={displayUnit}>
                                  {displayUnit}
                                </option>
                              );
                            })}
                          </select>
                        </td>
                      )}
                      {effectiveVisibleCols.includes('unitPrice') && (
                        <td className="w-32 px-2 py-2">
                          <div className="flex items-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editingPriceIndex === index ? editingPriceAmount : item.unitPrice.toFixed(2)}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*\.?\d*$/.test(value)) {
                                  setEditingPriceAmount(value);
                                  handleItemChange(index, 'unitPrice', value === '' ? 0 : parseFloat(value));
                                }
                              }}
                              onDoubleClick={() => handleDoubleClick(index, 'unitPrice')}
                              onFocus={(e) => {
                                setEditingPriceIndex(index);
                                setEditingPriceAmount(item.unitPrice === 0 ? '' : item.unitPrice.toString());
                                e.target.select();
                                handleIOSInputFocus(e);
                              }}
                              onBlur={() => {
                                setEditingPriceIndex(null);
                                setEditingPriceAmount('');
                              }}
                              className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                                focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                                hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                                text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                                placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                                transition-all duration-200 text-center
                                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                                ios-optimized-input
                                ${item.highlight?.unitPrice ? highlightClass : ''}`}
                              style={{
                                ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                              }}
                            />
                            {err?.field === 'unitPrice' && <CellErrorDot title={err.msg} />}
                          </div>
                        </td>
                      )}
                      {effectiveVisibleCols.includes('amount') && (
                        <td className="w-28 px-2 py-2">
                          <input
                            type="text"
                            value={item.amount.toFixed(2)}
                            readOnly
                            onDoubleClick={() => handleDoubleClick(index, 'amount')}
                            className={`w-full px-3 py-1.5 bg-transparent
                              text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                              placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                              transition-all duration-200 text-center
                              ios-optimized-input
                              ${item.highlight?.amount ? highlightClass : ''}`}
                            style={{
                              ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                            }}
                          />
                        </td>
                      )}
                      {effectiveVisibleCols.includes('remarks') && (
                        <td className="px-2 py-2">
                          <textarea
                            value={item.remarks}
                            onChange={(e) => {
                              handleItemChange(index, 'remarks', e.target.value);
                              e.target.style.height = '28px';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onDoubleClick={() => handleDoubleClick(index, 'remarks')}
                            onFocus={handleIOSInputFocus}
                            className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                              focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                              hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                              text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                              placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                              transition-all duration-200 text-center whitespace-pre-wrap resize-y overflow-hidden
                              ios-optimized-input
                              ${item.highlight?.remarks ? highlightClass : ''}`}
                            style={{ 
                              height: '28px',
                              ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                            }}
                          />
                        </td>
                      )}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Other Fees Table */}
            {(data.otherFees ?? []).length > 0 && (
              <div className={`border border-t-0 border-[#E5E5EA] dark:border-[#2C2C2E]
                bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl overflow-hidden rounded-b-2xl`}>
                <table className="w-full">
                  <tbody className="bg-white/90 dark:bg-[#1C1C1E]/90">
                    {(data.otherFees ?? []).map((fee, index) => (
                      <tr key={fee.id} className={`border-t border-[#E5E5EA] dark:border-[#2C2C2E]`}>
                        <td className={`sticky left-0 z-10 w-12 px-2 py-2 text-center text-sm bg-white/90 dark:bg-[#1C1C1E]/90
                          ${index === (data.otherFees ?? []).length - 1 ? 'rounded-bl-2xl' : ''}`}>
                          <span 
                            className="flex items-center justify-center w-5 h-5 rounded-full 
                              text-xs text-gray-400
                              hover:bg-red-100 hover:text-red-600 
                              cursor-pointer transition-colors"
                            onClick={() => handleOtherFeeSoftDelete(index)}
                            title="Click to delete"
                          >
                            ×
                          </span>
                        </td>
                        <td colSpan={effectiveVisibleCols.includes('description') ? 6 : 5} className="px-2 py-2">
                          <textarea
                            value={fee.description}
                            onChange={(e) => {
                              handleOtherFeeChange(index, 'description', e.target.value);
                              e.target.style.height = '28px';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onDoubleClick={() => handleOtherFeeDoubleClick(index, 'description')}
                            onFocus={handleIOSInputFocus}
                            className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                              focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                              hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                              text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                              placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                              transition-all duration-200 whitespace-pre-wrap resize-y overflow-hidden
                              ios-optimized-input
                              ${fee.highlight?.description ? highlightClass : ''}`}
                            style={{ 
                              height: '28px',
                              ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                            }}
                          />
                        </td>
                        <td className={`w-28 px-2 py-2
                          ${index === (data.otherFees ?? []).length - 1 && !effectiveVisibleCols.includes('remarks') ? 'rounded-br-2xl' : ''}`}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editingOtherFeeIndex === index ? editingOtherFeeAmount : fee.amount.toFixed(2)}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^-?\d*\.?\d*$/.test(value)) {
                                setEditingOtherFeeAmount(value);
                                handleOtherFeeChange(index, 'amount', value === '' ? 0 : parseFloat(value));
                              }
                            }}
                            onFocus={(e) => {
                              setEditingOtherFeeIndex(index);
                              setEditingOtherFeeAmount(fee.amount === 0 ? '' : fee.amount.toString());
                              e.target.select();
                              handleIOSInputFocus(e);
                            }}
                            onBlur={() => {
                              setEditingOtherFeeIndex(null);
                              setEditingOtherFeeAmount('');
                            }}
                            onDoubleClick={() => handleOtherFeeDoubleClick(index, 'amount')}
                            className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                              focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                              hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                              text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                              placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                              transition-all duration-200 text-center whitespace-pre-wrap
                              ios-optimized-input
                              ${fee.highlight?.amount ? highlightClass : ''}`}
                            style={{
                              ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                            }}
                            placeholder="0.00"
                          />
                        </td>
                        {effectiveVisibleCols.includes('remarks') && (
                          <td className={`w-1/5 px-2 py-2
                            ${index === (data.otherFees ?? []).length - 1 ? 'rounded-br-2xl' : ''}`}>
                            <textarea
                              value={fee.remarks || ''}
                              onChange={(e) => {
                                handleOtherFeeChange(index, 'remarks', e.target.value);
                                e.target.style.height = '28px';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              onDoubleClick={() => handleOtherFeeDoubleClick(index, 'remarks')}
                              onFocus={handleIOSInputFocus}
                              className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                                focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                                hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                                text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                                placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                                transition-all duration-200 text-center whitespace-pre-wrap resize-y overflow-hidden
                                ios-optimized-input
                                ${fee.highlight?.remarks ? highlightClass : ''}`}
                              style={{ 
                                height: '28px',
                                ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                              }}
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
    </div>
  );
}; 