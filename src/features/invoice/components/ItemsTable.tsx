'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useInvoiceStore } from '../state/invoice.store';
import { LineItem, OtherFee } from '../types';
import { INPUT_CLASSNAMES, HIGHLIGHT_CLASS } from '../constants/settings';
import { handleTableKeyDown } from '../utils/keyboardNavigation';
import { ImportDataButton } from './ImportDataButton';
import { ColumnToggle } from './ColumnToggle';
import { QuickImport } from './QuickImport';

// 默认单位列表
const DEFAULT_UNITS = ['pc', 'set', 'length'];

// 合并单元格信息类型
export interface MergedCellInfo {
  startRow: number;
  endRow: number;
  content: string;
  isMerged: boolean;
}

// 文本域通用属性
type TextareaCommonProps = {
  isDarkMode: boolean;
  onFocusIOS: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  className?: string;
  title?: string;
};

// 自动增长文本域组件
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
      style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
      placeholder={placeholder}
      title={title}
    />
  );
};

/**
 * 完全集成的发票商品表格组件 - 集成报价页面功能
 */
export const ItemsTable = React.memo(() => {
  const {
    data,
    updateData,
    updateLineItem,
    addLineItem,
    removeLineItem,
    addOtherFee,
    removeOtherFee,
    updateOtherFee,
    handleDoubleClick,
    handleOtherFeeDoubleClick,
    focusedCell,
    setFocusedCell
  } = useInvoiceStore();

  // 状态管理
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [editingPriceAmount, setEditingPriceAmount] = useState<string>('');
  const [editingQtyIndex, setEditingQtyIndex] = useState<number | null>(null);
  const [editingQtyAmount, setEditingQtyAmount] = useState<string>('');
  const [editingOtherFeeIndex, setEditingOtherFeeIndex] = useState<number | null>(null);
  const [editingOtherFeeAmount, setEditingOtherFeeAmount] = useState<string>('');
  const [importPreset, setImportPreset] = useState<{ raw: string; parsed: any } | null>(null);

  // 列显示状态 - HS code、Part Name、Description、Remarks 可控，其他列常显
  // 互锁规则：Part Name 和 Description 至少必须显示一个
  const visibleCols = useMemo(() => {
    const cols = [];
    if (data.showHsCode) cols.push('hsCode');
    if (data.showPartName) cols.push('partName');
    if (data.showDescription) cols.push('description');
    if (data.showRemarks) cols.push('remarks');
    // 确保 Part Name 和 Description 至少有一个显示（互锁约束）
    if (!cols.includes('partName') && !cols.includes('description')) {
      cols.push('description'); // 默认显示 Description
    }
    return cols;
  }, [data.showHsCode, data.showPartName, data.showDescription, data.showRemarks]);

  // 检测暗色模式
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





  // 处理键盘导航
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    rowIndex: number,
    column: string
  ) => {
    handleTableKeyDown(e, rowIndex, column, data, setFocusedCell);
  };

  // 处理数量变化
  const handleQuantityChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateLineItem(index, 'quantity', numValue);
  };

  // 处理单价变化
  const handleUnitPriceChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateLineItem(index, 'unitPrice', numValue);
  };

  // 处理其他费用金额变化
  const handleOtherFeeAmountChange = (id: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateOtherFee(id, 'amount', numValue);
  };

  // 处理单位变化
  const handleUnitChange = (index: number, value: string) => {
    updateLineItem(index, 'unit', value);
  };

  // 处理HS Code变化
  const handleHsCodeChange = (index: number, value: string) => {
    updateLineItem(index, 'hsCode', value);
  };

  // 处理商品名称变化
  const handlePartnameChange = (index: number, value: string) => {
    updateLineItem(index, 'partname', value);
  };

  // 处理描述变化
  const handleDescriptionChange = (index: number, value: string) => {
    updateLineItem(index, 'description', value);
  };

  // 处理备注变化
  const handleRemarksChange = (index: number, value: string) => {
    updateLineItem(index, 'remarks', value);
  };

  // 处理其他费用描述变化
  const handleOtherFeeDescriptionChange = (id: number, value: string) => {
    updateOtherFee(id, 'description', value);
  };

  // 处理其他费用备注变化
  const handleOtherFeeRemarksChange = (id: number, value: string) => {
    updateOtherFee(id, 'remarks', value);
  };

  // 获取所有可用单位
  const getAllUnits = () => {
    return [...DEFAULT_UNITS, ...(data.customUnits || [])];
  };

  // 获取单位显示文本
  const getUnitDisplay = (baseUnit: string, quantity: number) => {
    if (DEFAULT_UNITS.includes(baseUnit)) return quantity === 1 ? baseUnit : `${baseUnit}s`;
    return baseUnit;
  };

  // 处理导入数据
  const handleImport = (newItems: LineItem[]) => {
    const processed = newItems.map((item, index) => {
      const baseUnit = (item.unit || 'pc').replace(/s$/, '');
      return {
        ...item,
        lineNo: data.items.length + index + 1,
        unit: DEFAULT_UNITS.includes(baseUnit) ? getUnitDisplay(baseUnit, item.quantity) : item.unit,
        amount: item.quantity * item.unitPrice,
      };
    });
    
    // 更新数据
    updateData({ items: [...data.items, ...processed] });
  };

  // 处理插入导入数据
  const handleInsertImported = (rows: any[], replaceMode = false) => {
    const mapped: LineItem[] = rows.map((r, index) => {
      const quantity = Number(r.quantity) || 0;
      const unitPrice = Number(r.unitPrice) || 0;
      return {
        lineNo: replaceMode ? index + 1 : data.items.length + index + 1,
        hsCode: r.hsCode || '',
        partname: r.partName || r.partname || '',
        description: r.description || '',
        quantity,
        unit: r.unit || 'pc',
        unitPrice,
        amount: quantity * unitPrice,
        remarks: r.remarks || '',
        highlight: {}
      } as LineItem;
    });
    
    const finalItems = replaceMode ? mapped : [...data.items, ...mapped];
    updateData({ items: finalItems });
  };

  // 数量输入属性
  const qtyInputProps = (index: number) => {
    const item = data.items?.[index];
    if (!item) return { value: '', onChange: () => {}, onFocus: () => {}, onBlur: () => {} };
    
    return {
      value: editingQtyIndex === index ? editingQtyAmount : (item.quantity === 0 ? '' : String(item.quantity)),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        if (/^\d*$/.test(v)) {
          setEditingQtyAmount(v);
          handleQuantityChange(index, v === '' ? '0' : v);
        }
      },
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        setEditingQtyIndex(index);
        setEditingQtyAmount(item.quantity === 0 ? '' : String(item.quantity));
        e.target.select();
      },
      onBlur: () => {
        setEditingQtyIndex(null);
        setEditingQtyAmount('');
      },
    };
  };

  // 价格输入属性
  const priceInputProps = (index: number) => {
    const item = data.items?.[index];
    if (!item) return { value: '', onChange: () => {}, onFocus: () => {}, onBlur: () => {} };
    
    return {
      value: editingPriceIndex === index ? editingPriceAmount : item.unitPrice.toFixed(2),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        if (/^\d*\.?\d*$/.test(v)) {
          setEditingPriceAmount(v);
          handleUnitPriceChange(index, v === '' ? '0' : v);
        }
      },
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        setEditingPriceIndex(index);
        setEditingPriceAmount(item.unitPrice === 0 ? '' : String(item.unitPrice));
        e.target.select();
      },
      onBlur: () => {
        setEditingPriceIndex(null);
        setEditingPriceAmount('');
      },
    };
  };

  // 处理软删除
  const handleSoftDelete = (index: number) => {
    removeLineItem(index);
  };

  // 处理其他费用软删除
  const handleOtherFeeSoftDelete = (index: number) => {
    const fee = data.otherFees?.[index];
    if (fee) {
      removeOtherFee(fee.id);
    }
  };

  // 列切换功能 - 直接更新 store 中的显示设置
  const toggleCol = (col: string) => {
    if (col === 'hsCode') {
      updateData({ showHsCode: !data.showHsCode });
    } else if (col === 'partName') {
      updateData({ showPartName: !data.showPartName });
    } else if (col === 'description') {
      updateData({ showDescription: !data.showDescription });
    } else if (col === 'remarks') {
      updateData({ showRemarks: !data.showRemarks });
    }
  };

  // 获取有效可见列 - HS code、Part Name、Description、Remarks 可控，其他列常显
  const effectiveVisibleCols = visibleCols.filter(col => 
    ['hsCode', 'partName', 'description', 'remarks'].includes(col)
  );

  // 焦点处理
  const onFocusIOS = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const el = e.target as HTMLElement & { style: any };
    el.style.caretColor = isDarkMode ? '#0A84FF' : '#007AFF';
    el.style.webkitCaretColor = isDarkMode ? '#0A84FF' : '#007AFF';
  };

  return (
    <div className="space-y-0">
      {/* 工具栏 */}
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
            visibleCols={effectiveVisibleCols}
            onToggleCol={toggleCol}
            availableCols={['hsCode', 'partName', 'description', 'remarks']}
          />
          <QuickImport
            onInsert={handleInsertImported}
            presetRaw={importPreset?.raw}
            presetParsed={importPreset?.parsed}
            onClosePreset={() => setImportPreset(null)}
          />
        </div>
      </div>

      {/* 移动端卡片 */}
      <div className="block md:hidden space-y-4">
        {data.items.map((item, index) => (
          <div key={item.lineNo} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Item #{index + 1}</div>
              <button type="button" onClick={() => handleSoftDelete(index)} className="transition-colors p-1 text-gray-400 hover:bg-red-100 hover:text-red-600" title="删除此项">
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* HS Code */}
              {effectiveVisibleCols.includes('hsCode') && (
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">HS Code</label>
                  <input
                    type="text"
                    value={item.hsCode}
                    onChange={(e) => handleHsCodeChange(index, e.target.value)}
                    onDoubleClick={() => handleDoubleClick(index, 'hsCode')}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] ${item.highlight?.hsCode ? HIGHLIGHT_CLASS : ''}`}
                    placeholder="HS Code"
                  />
                </div>
              )}

              {/* Part Name */}
              {effectiveVisibleCols.includes('partName') && (
              <div>
                <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Part Name</label>
                  <AutoGrowTextarea
                  value={item.partname}
                  onChange={(e) => handlePartnameChange(index, e.target.value)}
                    onDoubleClick={() => handleDoubleClick(index, 'partname')}
                    isDarkMode={isDarkMode}
                    onFocusIOS={onFocusIOS}
                    className={`${item.highlight?.partname ? HIGHLIGHT_CLASS : ''} border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg py-2`}
                    placeholder="Enter part name..."
                />
              </div>
              )}

              {/* Description */}
              {effectiveVisibleCols.includes('description') && (
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Description</label>
                  <AutoGrowTextarea
                    value={item.description}
                    onChange={(e) => handleDescriptionChange(index, e.target.value)}
                    onDoubleClick={() => handleDoubleClick(index, 'description')}
                    isDarkMode={isDarkMode}
                    onFocusIOS={onFocusIOS}
                    className={`${item.highlight?.description ? HIGHLIGHT_CLASS : ''} border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg py-2`}
                    placeholder="Enter description..."
                  />
                </div>
              )}

              {/* Qty + Unit - 始终显示 */}
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
                        text-[13px] text-center ios-optimized-input ${item.highlight?.quantity ? HIGHLIGHT_CLASS : ''}`}
                      style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Unit</label>
                  <select
                    value={item.unit}
                    onChange={(e) => handleUnitChange(index, e.target.value)}
                      onDoubleClick={() => handleDoubleClick(index, 'unit')}
                      onFocus={onFocusIOS}
                      className={`w-full px-3 py-2 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                        focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                        text-[13px] text-center cursor-pointer appearance-none ios-optimized-input ${item.highlight?.unit ? HIGHLIGHT_CLASS : ''}`}
                      style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
                    >
                      {getAllUnits().map((unit) => {
                        const display = DEFAULT_UNITS.includes(unit)
                          ? getUnitDisplay(unit, item.quantity)
                          : unit;
                        return (
                          <option key={unit} value={display}>
                            {display}
                      </option>
                        );
                      })}
                  </select>
                </div>
              </div>

              {/* U/Price + Amount - 始终显示 */}
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
                        text-[13px] text-center ios-optimized-input ${item.highlight?.unitPrice ? HIGHLIGHT_CLASS : ''}`}
                      style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
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
                      className={`w-full px-3 py-2 bg-transparent text-[13px] text-center ios-optimized-input ${
                              item.highlight?.amount ? HIGHLIGHT_CLASS : ''
                            }`}
                      style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
                  />
                </div>
              </div>

              {/* Remarks */}
              {effectiveVisibleCols.includes('remarks') && (
              <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Remarks</label>
                  <AutoGrowTextarea
                    value={item.remarks || ''}
                    onChange={(e) => handleRemarksChange(index, e.target.value)}
                    onDoubleClick={() => handleDoubleClick(index, 'remarks')}
                    isDarkMode={isDarkMode}
                    onFocusIOS={onFocusIOS}
                    className={`${item.highlight?.remarks ? HIGHLIGHT_CLASS : ''}`}
                    placeholder="Enter remarks..."
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Other Fees (mobile) */}
        {(data.otherFees ?? []).length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] px-1">Other Fees</div>
            {(data.otherFees ?? []).map((fee, index) => (
              <div key={fee.id} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Other Fee #{index + 1}</div>
                  <button type="button" onClick={() => handleOtherFeeSoftDelete(index)} className="transition-colors p-1 text-gray-400 hover:bg-red-100 hover:text-red-600" title="删除此项">
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Description</label>
                    <AutoGrowTextarea
                      value={fee.description}
                      onChange={(e) => handleOtherFeeDescriptionChange(fee.id, e.target.value)}
                      onDoubleClick={() => handleOtherFeeDoubleClick(index, 'description')}
                      isDarkMode={isDarkMode}
                      onFocusIOS={onFocusIOS}
                      className={`${fee.highlight?.description ? HIGHLIGHT_CLASS : ''}`}
                    />
                  </div>

                  {/* Other Fees Remarks */}
                  {effectiveVisibleCols.includes('remarks') && (
                    <div>
                      <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Remarks</label>
                      <AutoGrowTextarea
                        value={fee.remarks || ''}
                        onChange={(e) => handleOtherFeeRemarksChange(fee.id, e.target.value)}
                        onDoubleClick={() => handleOtherFeeDoubleClick(index, 'remarks')}
                        isDarkMode={isDarkMode}
                        onFocusIOS={onFocusIOS}
                        className={`${fee.highlight?.remarks ? HIGHLIGHT_CLASS : ''}`}
                        placeholder="Enter remarks..."
                      />
                    </div>
                  )}

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
                          handleOtherFeeAmountChange(fee.id, v === '' ? '0' : v);
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
                        text-[13px] text-center ios-optimized-input ${fee.highlight?.amount ? HIGHLIGHT_CLASS : ''}`}
                      style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 桌面端表格 */}
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
                    {effectiveVisibleCols.includes('hsCode') && (
                      <th className="px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap min-w-[120px]">
                        HS Code
                      </th>
                    )}
                    {effectiveVisibleCols.includes('partName') && (
                      <th className="px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap min-w-[120px]">
                        Part Name
                      </th>
                    )}
                    {effectiveVisibleCols.includes('description') && (
                      <th className="px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] min-w-[120px]">Description</th>
                    )}
                    <th className="w-24 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Q&apos;TY</th>
                    <th className="w-24 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Unit</th>
                    <th className="w-32 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">U/Price</th>
                    <th className="w-28 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Amount</th>
                    {effectiveVisibleCols.includes('remarks') && (
                      <th
                        className={`w-40 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] ${
                          (data.otherFees ?? []).length === 0 ? 'rounded-tr-2xl' : ''
                        }`}
                      >
                        Remarks
                      </th>
                    )}
                    {(!effectiveVisibleCols.includes('remarks') || effectiveVisibleCols.length === 0) && (
                      <th
                        className={`w-12 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] ${
                          (data.otherFees ?? []).length === 0 ? 'rounded-tr-2xl' : ''
                        }`}
                      />
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white/90 dark:bg-[#1C1C1E]/90">
                  {data.items.map((item, index) => (
                    <tr key={item.lineNo} className="border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                      <td
                        className={`sticky left-0 z-10 w-12 px-2 py-2 text-center text-sm bg-white/90 dark:bg-[#1C1C1E]/90 ${
                          index === data.items.length - 1 && !data.otherFees?.length ? 'rounded-bl-2xl' : ''
                        }`}
                      >
                        <span
                          className="flex items-center justify-center w-5 h-5 rounded-full text-xs cursor-pointer transition-colors"
                          onClick={() => handleSoftDelete(index)}
                          title="Click to delete"
                        >
                          {index + 1}
                        </span>
                      </td>

                      {effectiveVisibleCols.includes('hsCode') && (
                        <td className="px-2 py-2 bg-white/90 dark:bg-[#1C1C1E]/90">
                          <input
                            type="text"
                            value={item.hsCode}
                            onChange={(e) => handleHsCodeChange(index, e.target.value)}
                            onDoubleClick={() => handleDoubleClick(index, 'hsCode')}
                            className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                              focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                              text-[13px] text-center ios-optimized-input ${item.highlight?.hsCode ? HIGHLIGHT_CLASS : ''}`}
                            style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
                            placeholder="HS Code"
                          />
                        </td>
                      )}

                      {effectiveVisibleCols.includes('partName') && (
                        <td className="px-2 py-2 bg-white/90 dark:bg-[#1C1C1E]/90">
                          <AutoGrowTextarea
                            value={item.partname}
                            onChange={(e) => handlePartnameChange(index, e.target.value)}
                            onDoubleClick={() => handleDoubleClick(index, 'partname')}
                            isDarkMode={isDarkMode}
                            onFocusIOS={onFocusIOS}
                            className={`${item.highlight?.partname ? HIGHLIGHT_CLASS : ''}`}
                          />
                        </td>
                      )}

                      {effectiveVisibleCols.includes('description') && (
                        <td className="px-2 py-2 bg-white/90 dark:bg-[#1C1C1E]/90">
                          <AutoGrowTextarea
                            value={item.description}
                            onChange={(e) => handleDescriptionChange(index, e.target.value)}
                            onDoubleClick={() => handleDoubleClick(index, 'description')}
                            isDarkMode={isDarkMode}
                            onFocusIOS={onFocusIOS}
                            className={`${item.highlight?.description ? HIGHLIGHT_CLASS : ''}`}
                          />
                        </td>
                      )}

                      <td className="w-24 px-2 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          {...qtyInputProps(index)}
                          onDoubleClick={() => handleDoubleClick(index, 'quantity')}
                          className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                            focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                            text-[13px] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                            [&::-webkit-inner-spin-button]:appearance-none ios-optimized-input ${item.highlight?.quantity ? HIGHLIGHT_CLASS : ''}`}
                          style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
                        />
                      </td>

                      <td className="w-24 px-2 py-2">
                        <select
                          value={item.unit}
                          onChange={(e) => handleUnitChange(index, e.target.value)}
                          onDoubleClick={() => handleDoubleClick(index, 'unit')}
                          onFocus={onFocusIOS}
                          className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                            focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                            text-[13px] text-center cursor-pointer appearance-none ios-optimized-input ${item.highlight?.unit ? HIGHLIGHT_CLASS : ''}`}
                          style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
                        >
                          {getAllUnits().map((unit) => {
                            const display = DEFAULT_UNITS.includes(unit)
                              ? getUnitDisplay(unit, item.quantity)
                              : unit;
                            return (
                              <option key={unit} value={display}>
                                {display}
                              </option>
                            );
                          })}
                        </select>
                      </td>

                      <td className="w-32 px-2 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          {...priceInputProps(index)}
                          onDoubleClick={() => handleDoubleClick(index, 'unitPrice')}
                          className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
                            focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                            text-[13px] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                            [&::-webkit-inner-spin-button]:appearance-none ios-optimized-input ${item.highlight?.unitPrice ? HIGHLIGHT_CLASS : ''}`}
                          style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
                        />
                      </td>

                      <td className="w-28 px-2 py-2">
                        <input
                          type="text"
                          value={item.amount.toFixed(2)}
                          readOnly
                          onDoubleClick={() => handleDoubleClick(index, 'amount')}
                          className={`w-full px-3 py-1.5 bg-transparent text-[13px] text-center ios-optimized-input ${
                            item.highlight?.amount ? HIGHLIGHT_CLASS : ''
                          }`}
                          style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
                        />
                      </td>

                      {effectiveVisibleCols.includes('remarks') && (
                        <td className="w-40 px-2 py-2">
                          <AutoGrowTextarea
                            value={item.remarks || ''}
                            onChange={(e) => handleRemarksChange(index, e.target.value)}
                            onDoubleClick={() => handleDoubleClick(index, 'remarks')}
                            isDarkMode={isDarkMode}
                            onFocusIOS={onFocusIOS}
                            className={`${item.highlight?.remarks ? HIGHLIGHT_CLASS : ''}`}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
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
                            className="flex items-center justify-center w-5 h-5 rounded-full text-xs cursor-pointer transition-colors"
                            onClick={() => handleOtherFeeSoftDelete(index)}
                            title="Click to delete"
                          >
                            ×
                          </span>
                        </td>
                        <td 
                          colSpan={
                            (effectiveVisibleCols.includes('hsCode') ? 1 : 0) +
                            (effectiveVisibleCols.includes('partName') ? 1 : 0) +
                            (effectiveVisibleCols.includes('description') ? 1 : 0) +
                            3 // Q'TY, Unit, U/Price
                          } 
                          className="px-2 py-2 bg-white/90 dark:bg-[#1C1C1E]/90"
                        >
                          <AutoGrowTextarea
                            value={fee.description}
                            onChange={(e) => handleOtherFeeDescriptionChange(fee.id, e.target.value)}
                            onDoubleClick={() => handleOtherFeeDoubleClick(index, 'description')}
                            isDarkMode={isDarkMode}
                            onFocusIOS={onFocusIOS}
                            className={`${fee.highlight?.description ? HIGHLIGHT_CLASS : ''} text-center`}
                          />
                        </td>
                        <td className="w-28 px-2 py-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editingOtherFeeIndex === index ? editingOtherFeeAmount : fee.amount.toFixed(2)}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (/^-?\d*\.?\d*$/.test(v)) {
                                setEditingOtherFeeAmount(v);
                                handleOtherFeeAmountChange(fee.id, v === '' ? '0' : v);
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
                              text-[13px] text-center whitespace-pre-wrap ios-optimized-input ${fee.highlight?.amount ? HIGHLIGHT_CLASS : ''}`}
                            style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
                            placeholder="0.00"
                          />
                        </td>
                        {effectiveVisibleCols.includes('remarks') && (
                          <td className={`w-40 px-2 py-2 ${index === (data.otherFees ?? []).length - 1 ? 'rounded-br-2xl' : ''}`}>
                            <AutoGrowTextarea
                              value={fee.remarks || ''}
                              onChange={(e) => handleOtherFeeRemarksChange(fee.id, e.target.value)}
                              onDoubleClick={() => handleOtherFeeDoubleClick(index, 'remarks')}
                              isDarkMode={isDarkMode}
                              onFocusIOS={onFocusIOS}
                              className={`${fee.highlight?.remarks ? HIGHLIGHT_CLASS : ''} text-center`}
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
});
