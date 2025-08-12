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
}

interface ItemsTableEnhancedProps {
  data: PackingData;
  onItemChange: (index: number, field: keyof PackingItem, value: string | number) => void;
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
}

export const ItemsTableEnhanced: React.FC<ItemsTableEnhancedProps> = ({
  data,
  onItemChange,
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
  onExitGroupMode
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

  // iOS输入框样式
  const iosCaretStyle = {
    caretColor: '#007AFF',
    WebkitTextFillColor: '#1D1D1F',
  };

  const iosCaretStyleDark = {
    caretColor: '#0A84FF',
    WebkitTextFillColor: '#F5F5F7',
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

  // 获取可见列
  const effectiveVisibleCols = isHydrated ? visibleCols : ['description', 'quantity', 'unit', 'netWeight', 'grossWeight', 'packageQty'];

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
                {effectiveVisibleCols.includes('hsCode') && data.showHsCode && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[120px]">
                    HS Code
                  </th>
                )}
                {effectiveVisibleCols.includes('description') && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[200px] lg:w-[280px] xl:w-[350px]">Description</th>
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
                    
                    {effectiveVisibleCols.includes('packageQty') && data.showWeightAndPackage && (
                      isInGroup && isFirstInGroup ? (
                        <td rowSpan={groupRowSpan} className="py-2 px-4 text-center align-middle" style={{verticalAlign:'middle'}}>
                          <div className="flex flex-col justify-center items-center h-full">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editingPackageQtyIndex === index ? editingPackageQtyAmount : (item.packageQty > 0 ? item.packageQty.toString() : '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*$/.test(value)) {
                                  setEditingPackageQtyAmount(value);
                                  const newQty = value === '' ? 0 : parseInt(value);
                                  groupItems.forEach((groupItem) => {
                                    const itemIndex = data.items.findIndex(i => i.id === groupItem.id);
                                    if (itemIndex !== -1) {
                                      onItemChange(itemIndex, 'packageQty', newQty);
                                    }
                                  });
                                }
                              }}
                              onFocus={(e) => {
                                setEditingPackageQtyIndex(index);
                                setEditingPackageQtyAmount(item.packageQty === 0 ? '' : item.packageQty.toString());
                                e.target.select();
                                handleIOSInputFocus(e);
                              }}
                              onBlur={(e) => {
                                setEditingPackageQtyIndex(null);
                                setEditingPackageQtyAmount('');
                                const value = parseInt(e.target.value) || 0;
                                if (value > 0) {
                                  groupItems.forEach((groupItem) => {
                                    const itemIndex = data.items.findIndex(i => i.id === groupItem.id);
                                    if (itemIndex !== -1) {
                                      onItemChange(itemIndex, 'packageQty', value);
                                    }
                                  });
                                }
                              }}
                              className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ios-optimized-input"
                              placeholder="0"
                              style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                            />
                          </div>
                        </td>
                      ) : !isInGroup ? (
                        <td className="py-2 px-4 text-center text-sm">
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
                            className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ios-optimized-input"
                            placeholder="0"
                            style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                          />
                        </td>
                      ) : null
                    )}
                    
                    {effectiveVisibleCols.includes('dimensions') && data.showDimensions && (
                      <td className="py-2 px-4 text-center text-sm">
                        <input
                          type="text"
                          value={item.dimensions}
                          onChange={(e) => onItemChange(index, 'dimensions', e.target.value)}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center ios-optimized-input"
                          placeholder="Dimensions"
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Other Fees 表格 */}
      {data.showPrice && data.otherFees && data.otherFees.length > 0 && (
        <div className="mt-6">
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
          />
        </div>
      )}

      {/* 总计信息 */}
      {(data.showWeightAndPackage || (data.showPrice && data.otherFees && data.otherFees.length > 0)) && (
        <div className="flex justify-end items-center py-3 sm:py-4 px-3 sm:px-6 border-t border-[#007AFF]/10 dark:border-[#0A84FF]/10">
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-4 md:gap-6">
              {data.showWeightAndPackage && (
                <>
                  <div className="text-center sm:text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total N.W.</div>
                    <div className="text-sm sm:text-base font-medium">{calculatedTotals.netWeight.toFixed(2)} KGS</div>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total G.W.</div>
                    <div className="text-sm sm:text-base font-medium">{calculatedTotals.grossWeight.toFixed(2)} KGS</div>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Package</div>
                    <div className="text-sm sm:text-base font-medium">{calculatedTotals.packageQty} CTNS</div>
                  </div>
                </>
              )}
              {data.showPrice && (
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
    </div>
  );
};
