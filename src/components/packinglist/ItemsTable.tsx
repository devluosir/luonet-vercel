import React, { useState, useEffect, useCallback } from 'react';
import { OtherFeesTable } from './OtherFeesTable';
import { ColumnToggle } from '../../features/packing/components/ColumnToggle';

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

// 导入单位处理模块
import { useUnitHandler } from '@/hooks/useUnitHandler';
import { UnitSelector } from '@/components/ui/UnitSelector';

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
  groupId?: string; // 新增：分组ID
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
  // 新增：分组相关状态
  isInGroupMode?: boolean;
  currentGroupId?: string;
  packageQtyMergeMode?: 'auto' | 'manual';
  dimensionsMergeMode?: 'auto' | 'manual';
}

interface ItemsTableProps {
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
  // 新增：分组相关props
  onEnterGroupMode?: () => void;
  onExitGroupMode?: () => void;
  onDataChange?: (data: PackingData) => void;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
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
  onExitGroupMode,
  onDataChange
}) => {
  // 使用单位处理Hook
  const { 
    handleItemChange: handleUnitItemChange, 
    getDisplayUnit, 
    allUnits 
  } = useUnitHandler(data.customUnits || []);

  // 编辑状态管理
  const [editingQtyIndex, setEditingQtyIndex] = useState<number | null>(null);
  const [editingQtyAmount, setEditingQtyAmount] = useState<string>('');
  const [editingNetWeightIndex, setEditingNetWeightIndex] = useState<number | null>(null);
  const [editingNetWeightAmount, setEditingNetWeightAmount] = useState<string>('');
  const [editingGrossWeightIndex, setEditingGrossWeightIndex] = useState<number | null>(null);
  const [editingGrossWeightAmount, setEditingGrossWeightAmount] = useState<string>('');
  const [editingPackageQtyIndex, setEditingPackageQtyIndex] = useState<number | null>(null);
  const [editingPackageQtyAmount, setEditingPackageQtyAmount] = useState<string>('');
  const [editingUnitPriceIndex, setEditingUnitPriceIndex] = useState<number | null>(null);
  const [editingUnitPriceAmount, setEditingUnitPriceAmount] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // iOS光标优化样式
  const iosCaretStyle = {
    caretColor: '#007AFF',
    WebkitCaretColor: '#007AFF',
  } as React.CSSProperties;

  const iosCaretStyleDark = {
    caretColor: '#0A84FF',
    WebkitCaretColor: '#0A84FF',
  } as React.CSSProperties;

  // iOS输入框优化处理函数
  const handleIOSInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const element = e.target;
    
    // 设置光标颜色
    element.style.caretColor = isDarkMode ? '#0A84FF' : '#007AFF';
    (element.style as any).webkitCaretColor = isDarkMode ? '#0A84FF' : '#007AFF';
  };

  // 初始化函数，用于调整所有textarea的高度
  const initializeTextareaHeights = useCallback(() => {
    setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      if (textareas && textareas.length > 0) {
        textareas.forEach(textarea => {
          textarea.style.height = '28px';
          textarea.style.height = `${textarea.scrollHeight}px`;
        });
      }
    }, 0);
  }, []);

  // 在组件挂载时调用一次初始化函数
  useEffect(() => {
    initializeTextareaHeights();
  }, [initializeTextareaHeights]);

  // 在数据变化时调整所有textarea的高度
  useEffect(() => {
    initializeTextareaHeights();
  }, [data.items, initializeTextareaHeights]);

  // 处理单位变更
  const handleUnitChange = (index: number, value: string) => {
    const item = data.items[index];
    const result = handleUnitItemChange(item, 'unit', value);
    onItemChange(index, 'unit', result.unit);
  };

  // 处理数量变更时同时更新单位（确保只接受整数）
  const handleQuantityChange = (index: number, value: string | number) => {
    // 确保只接受整数
    const quantity = typeof value === 'string' ? parseInt(value) || 0 : Math.floor(Number(value));
    const item = data.items[index];
    const result = handleUnitItemChange(item, 'quantity', quantity);
    
    onItemChange(index, 'quantity', result.quantity);
    // 如果单位发生变化，同时更新单位
    if (result.unit !== item.unit) {
      onItemChange(index, 'unit', result.unit);
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

  // 处理分组数据渲染
  const renderGroupedItems = () => {
    const groupedItems: Array<{
      items: PackingItem[];
      groupId?: string;
      isGroup: boolean;
      groupTotals: {
        netWeight: number;
        grossWeight: number;
        packageQty: number;
        dimensions: string;
      };
    }> = [];

    let currentGroup: typeof groupedItems[0] | null = null;

    data.items.forEach((item, index) => {
      if (item.groupId && data.isInGroupMode) {
        // 在分组模式中，有groupId的项目
        if (!currentGroup || currentGroup.groupId !== item.groupId) {
          // 开始新组
          currentGroup = {
            items: [item],
            groupId: item.groupId,
            isGroup: true,
            groupTotals: {
              netWeight: item.netWeight,
              grossWeight: item.grossWeight,
              packageQty: item.packageQty,
              dimensions: item.dimensions
            }
          };
          groupedItems.push(currentGroup);
        } else {
          // 添加到当前组
          currentGroup.items.push(item);
          // 只取第一个项目的值，不累加
          // currentGroup.groupTotals.netWeight += item.netWeight;
          // currentGroup.groupTotals.grossWeight += item.grossWeight;
          // currentGroup.groupTotals.packageQty += item.packageQty;
          // 尺寸取第一个非空的
          if (!currentGroup.groupTotals.dimensions && item.dimensions) {
            currentGroup.groupTotals.dimensions = item.dimensions;
          }
        }
      } else {
        // 不在分组中的项目，单独处理
        if (currentGroup) {
          currentGroup = null;
        }
        groupedItems.push({
          items: [item],
          isGroup: false,
          groupTotals: {
            netWeight: 0,
            grossWeight: 0,
            packageQty: 0,
            dimensions: ''
          }
        });
      }
    });

    return groupedItems;
  };

  // 修改 handleOtherFeeChange 的类型
  const handleOtherFeeChange = (index: number, field: OtherFeeField, value: string | number) => {
    // ... existing code ...
  };

  return (
    <div className="space-y-0">
      {/* 移动端按钮行 */}
      <div className="block md:hidden mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 分组按钮 */}
            <button
              type="button"
              onClick={() => {
                if (data.isInGroupMode) {
                  onDataChange?.({ ...data, isInGroupMode: false, currentGroupId: undefined });
                } else {
                  onDataChange?.({ ...data, isInGroupMode: true, currentGroupId: `group_${Date.now()}` });
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                data.isInGroupMode 
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40'
                  : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/40'
              }`}
            >
              {data.isInGroupMode ? 'Exit Group' : 'Add Group'}
            </button>

            <button
              type="button"
              onClick={() => {
                const newItem = {
                  id: Date.now(),
                  serialNo: '',
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
                  unit: '',
                  groupId: data.currentGroupId
                };
                onDataChange?.({ ...data, items: [...data.items, newItem] });
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/40 text-xs font-medium transition-all duration-200"
            >
              Add Item
            </button>

            {data.showPrice && (
              <button
                type="button"
                onClick={() => {
                  const newOtherFee = {
                    id: Date.now(),
                    description: '',
                    amount: 0
                  };
                  onDataChange?.({ 
                    ...data, 
                    otherFees: [...(data.otherFees || []), newOtherFee] 
                  });
                }}
                className="px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40 text-xs font-medium transition-all duration-200"
              >
                Add Fee
              </button>
            )}
          </div>

          {/* 列设置按钮 - 右侧 */}
          <div className="flex items-center gap-2">
            <ColumnToggle 
              packageQtyMergeMode={data.packageQtyMergeMode || 'auto'}
              dimensionsMergeMode={data.dimensionsMergeMode || 'auto'}
              onPackageQtyMergeModeChange={(mode) => {
                onDataChange?.({ ...data, packageQtyMergeMode: mode });
              }}
              onDimensionsMergeModeChange={(mode) => {
                onDataChange?.({ ...data, dimensionsMergeMode: mode });
              }}
            />
          </div>
        </div>
      </div>

      {/* 移动端和平板卡片视图 - 中屏以下显示 */}
      <div className="block md:hidden space-y-4">
        {data.items.map((item, index) => {
          // 检查当前项目是否在组内
          const isInGroup = !!item.groupId;
          const groupItems = isInGroup ? data.items.filter(i => i.groupId === item.groupId) : [];
          const isFirstInGroup = isInGroup && groupItems[0]?.id === item.id;
          
          return (
          <div key={item.id} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Item #{index + 1}</span>
              {data.items.length > 1 && (
                <button
                  onClick={() => handleSoftDelete(index)}
                  className="flex items-center justify-center w-5 h-5 rounded-full text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 cursor-pointer transition-colors"
                >
                  ×
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Marks */}
              <div>
                <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Marks</label>
                <input
                  type="text"
                  value={item.marks || ''}
                  onChange={(e) => onItemChange(index, 'marks', e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                    focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                    text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                    placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                    ios-optimized-input"
                  placeholder="Marks"
                />
              </div>
              
              {/* 描述 */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Description</label>
                <textarea
                  value={item.description}
                  onChange={(e) => {
                    onItemChange(index, 'description', e.target.value);
                    e.target.style.height = '28px';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                    focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                    text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                    placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                    transition-all duration-200 resize-none overflow-hidden min-h-[60px]
                    ios-optimized-input"
                  placeholder="Enter product description..."
                />
              </div>
              
              {/* HS Code */}
              {data.showHsCode && (
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">HS Code</label>
                  <input
                    type="text"
                    value={item.hsCode}
                    onChange={(e) => onItemChange(index, 'hsCode', e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                      placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                      ios-optimized-input"
                    placeholder="HS Code"
                  />
                </div>
              )}
              
              {/* 数量 */}
              <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Quantity</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editingQtyIndex === index ? editingQtyAmount : item.quantity.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                        setEditingQtyAmount(value);
                        // 只在输入过程中更新数量，不触发单位更新
                        const quantity = value === '' ? 0 : parseInt(value);
                        onItemChange(index, 'quantity', quantity);
                      }
                    }}
                    onFocus={(e) => {
                      setEditingQtyIndex(index);
                      setEditingQtyAmount(item.quantity.toString());
                      e.target.select();
                      handleIOSInputFocus(e);
                    }}
                    onBlur={() => {
                      setEditingQtyIndex(null);
                      setEditingQtyAmount('');
                      // 失焦时更新单位（如果需要）
                      const item = data.items[index];
                      const result = handleUnitItemChange(item, 'quantity', item.quantity);
                      if (result.unit !== item.unit) {
                        onItemChange(index, 'unit', result.unit);
                      }
                    }}
                  className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                      [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                      ios-optimized-input"
                    placeholder="0"
                    style={{
                      ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                    }}
                  />
                </div>
              
              {/* 单位 */}
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Unit</label>
                  <UnitSelector
                    value={item.unit}
                    quantity={item.quantity}
                    customUnits={data.customUnits || []}
                    onChange={(unit) => handleUnitChange(index, unit)}
                    className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center cursor-pointer appearance-none
                      ios-optimized-input"
                  />
                </div>

              {/* 价格相关字段 */}
              {data.showPrice && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Unit Price</label>
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
                      className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                        focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                        text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                        ios-optimized-input"
                      placeholder="0.00"
                      style={{
                        ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Total Amount</label>
                    <input
                      type="text"
                      value={item.totalPrice.toFixed(2)}
                      readOnly
                      className={`${baseInputClassName} text-center`}
                      style={iosCaretStyle}
                    />
                  </div>
                </>
              )}

              {/* 重量和包装字段 */}
              {data.showWeightAndPackage && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Net Weight (kg)</label>
                      {isInGroup && isFirstInGroup ? (
                        // 组内第一行显示合并的重量，可编辑
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.netWeight > 0 ? item.netWeight.toFixed(2) : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d*$/.test(value)) {
                              const newWeight = value === '' ? 0 : parseFloat(value);
                              // 更新组内所有项目的净重
                              groupItems.forEach((groupItem) => {
                                const itemIndex = data.items.findIndex(i => i.id === groupItem.id);
                                if (itemIndex !== -1) {
                                  onItemChange(itemIndex, 'netWeight', newWeight);
                                }
                              });
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select();
                            handleIOSInputFocus(e);
                          }}
                          className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                            focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center font-medium
                            ios-optimized-input"
                          placeholder="0.00"
                          style={{
                            ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                          }}
                        />
                      ) : isInGroup ? (
                        // 组内其他行显示合并的重量，只读
                        <div className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg text-[13px] text-[#86868B] dark:text-[#86868B] text-center">
                          {item.netWeight > 0 ? item.netWeight.toFixed(2) : ''}
                        </div>
                      ) : (
                        // 普通行显示可编辑的输入框
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
                      onBlur={(e) => {
                        setEditingNetWeightIndex(null);
                        setEditingNetWeightAmount('');
                        // 确保在失去焦点时最终值被正确保存
                        const finalValue = parseFloat(e.target.value) || 0;
                        onItemChange(index, 'netWeight', finalValue);
                      }}
                      className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                        focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                        text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                        ios-optimized-input"
                      placeholder="0.00"
                      style={{
                        ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                      }}
                    />
                      )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Gross Weight (kg)</label>
                      {isInGroup && isFirstInGroup ? (
                        // 组内第一行显示合并的重量，可编辑
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.grossWeight > 0 ? item.grossWeight.toFixed(2) : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d*$/.test(value)) {
                              const newWeight = value === '' ? 0 : parseFloat(value);
                              // 更新组内所有项目的毛重
                              groupItems.forEach((groupItem) => {
                                const itemIndex = data.items.findIndex(i => i.id === groupItem.id);
                                if (itemIndex !== -1) {
                                  onItemChange(itemIndex, 'grossWeight', newWeight);
                                }
                              });
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select();
                            handleIOSInputFocus(e);
                          }}
                          className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                            focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center font-medium
                            ios-optimized-input"
                          placeholder="0.00"
                          style={{
                            ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                          }}
                        />
                      ) : isInGroup ? (
                        // 组内其他行显示合并的重量，只读
                        <div className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg text-[13px] text-[#86868B] dark:text-[#86868B] text-center">
                          {item.grossWeight > 0 ? item.grossWeight.toFixed(2) : ''}
                        </div>
                      ) : (
                        // 普通行显示可编辑的输入框
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
                      onBlur={(e) => {
                        setEditingGrossWeightIndex(null);
                        setEditingGrossWeightAmount('');
                        // 确保在失去焦点时最终值被正确保存
                        const finalValue = parseFloat(e.target.value) || 0;
                        onItemChange(index, 'grossWeight', finalValue);
                      }}
                      className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                        focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                        text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                        ios-optimized-input"
                      placeholder="0.00"
                      style={{
                        ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                      }}
                    />
                      )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Packages</label>
                      {isInGroup && isFirstInGroup ? (
                        // 组内第一行显示合并的包装数量，可编辑
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.packageQty > 0 ? item.packageQty.toString() : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value)) {
                              const newPackageQty = value === '' ? 0 : parseInt(value);
                              // 更新组内所有项目的包装数量
                              groupItems.forEach((groupItem) => {
                                const itemIndex = data.items.findIndex(i => i.id === groupItem.id);
                                if (itemIndex !== -1) {
                                  onItemChange(itemIndex, 'packageQty', newPackageQty);
                                }
                              });
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select();
                            handleIOSInputFocus(e);
                          }}
                          className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                            focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center font-medium
                            ios-optimized-input"
                          placeholder="0"
                          style={{
                            ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                          }}
                        />
                      ) : isInGroup ? (
                        // 组内其他行显示合并的包装数量，只读
                        <div className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg text-[13px] text-[#86868B] dark:text-[#86868B] text-center">
                          {item.packageQty > 0 ? item.packageQty.toString() : ''}
                        </div>
                      ) : (
                        // 普通行显示可编辑的输入框
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
                      onBlur={(e) => {
                        setEditingPackageQtyIndex(null);
                        setEditingPackageQtyAmount('');
                        // 确保在失去焦点时最终值被正确保存
                        const finalValue = parseInt(e.target.value) || 0;
                        onItemChange(index, 'packageQty', finalValue);
                      }}
                      className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                        focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                            placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                            transition-all duration-200 text-center
                        ios-optimized-input"
                      placeholder="0"
                      style={{
                        ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                      }}
                    />
                      )}
              </div>
                </>
              )}

              {/* 尺寸字段 */}
              {data.showDimensions && (
                <div className={data.showWeightAndPackage ? "" : "sm:col-span-2"}>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">
                    Dimensions ({data.dimensionUnit})
                  </label>
                    {isInGroup && isFirstInGroup ? (
                      // 组内第一行显示合并的尺寸，可编辑
                      <input
                        type="text"
                        value={item.dimensions}
                        onChange={(e) => {
                          const newDimensions = e.target.value;
                          // 更新组内所有项目的尺寸
                          groupItems.forEach((groupItem) => {
                            const itemIndex = data.items.findIndex(i => i.id === groupItem.id);
                            if (itemIndex !== -1) {
                              onItemChange(itemIndex, 'dimensions', newDimensions);
                            }
                          });
                        }}
                        className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                          focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                          text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center font-medium
                          ios-optimized-input"
                        placeholder={`Dimensions (${data.dimensionUnit})`}
                      />
                    ) : isInGroup ? (
                      // 组内其他行显示合并的尺寸，只读
                      <div className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg text-[13px] text-[#86868B] dark:text-[#86868B] text-center">
                        {item.dimensions}
                      </div>
                    ) : (
                      // 普通行显示可编辑的输入框
                  <input
                    type="text"
                    value={item.dimensions}
                    onChange={(e) => onItemChange(index, 'dimensions', e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                      ios-optimized-input"
                        placeholder={`Dimensions (${data.dimensionUnit})`}
                  />
                    )}
                </div>
              )}
            </div>
          </div>
          );
        })}
        
        {/* 移动端按钮区域 */}
        <div className="space-y-3">
          {/* 分组按钮 */}
          <button
            type="button"
            onClick={data.isInGroupMode ? onExitGroupMode : onEnterGroupMode}
            className={`w-full py-3 border-2 border-dashed rounded-xl transition-colors ${
              data.isInGroupMode 
                ? 'border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:border-red-400 dark:hover:border-red-500'
                : 'border-[#E5E5EA] dark:border-[#2C2C2E] text-[#86868B] dark:text-[#86868B] hover:border-[#0066CC] hover:text-[#0066CC] dark:hover:border-[#0A84FF] dark:hover:text-[#0A84FF]'
            }`}
          >
            {data.isInGroupMode ? 'Exit Group' : 'Add Group'}
          </button>
          
          {/* 添加行按钮 */}
        <button
          type="button"
          onClick={onAddLine}
          className="w-full py-3 border-2 border-dashed border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl
            text-[#86868B] dark:text-[#86868B] hover:border-[#0066CC] hover:text-[#0066CC] 
            dark:hover:border-[#0A84FF] dark:hover:text-[#0A84FF] transition-colors"
        >
          + Add Item
        </button>
        </div>

        {/* Other Fees 表格 - 移动端视图 */}
        {data.showPrice && data.otherFees && data.otherFees.length > 0 && (
          <div className="md:hidden mt-4">
            <div className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
              <h3 className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">Other Fees</h3>
              <div className="space-y-4">
                {data.otherFees.map((fee, index) => (
                  <div key={fee.id} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
                    {/* 卡片头部 */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                      <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                        Other Fee #{index + 1}
                      </div>
                      <button
                        onClick={() => onDeleteOtherFee?.(index)}
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
                            onOtherFeeChange?.(index, 'description', e.target.value);
                            e.target.style.height = '28px';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onDoubleClick={() => onOtherFeeDoubleClick?.(index, 'description')}
                          placeholder="Enter other fee description..."
                          className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                            focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                            ios-optimized-input resize-y overflow-hidden whitespace-pre-wrap ${fee.highlight?.description ? 'text-red-500 dark:text-red-400 font-medium' : ''}`}
                          style={{ height: '28px' }}
                        />
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Amount</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editingFeeIndex === index ? editingFeeAmount : fee.amount.toFixed(2)}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (/^-?\d*\.?\d{0,2}$/.test(inputValue) || inputValue === '') {
                              setEditingFeeAmount?.(inputValue);
                              const value = parseFloat(inputValue);
                              if (!isNaN(value)) {
                                onOtherFeeChange?.(index, 'amount', value);
                              }
                            }
                          }}
                          onDoubleClick={() => onOtherFeeDoubleClick?.(index, 'amount')}
                          onFocus={(e) => {
                            setEditingFeeIndex?.(index);
                            setEditingFeeAmount?.(fee.amount === 0 ? '' : fee.amount.toString());
                            e.target.select();
                          }}
                          onBlur={() => {
                            setEditingFeeIndex?.(null);
                            setEditingFeeAmount?.('');
                          }}
                          placeholder="0.00"
                          className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                            focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                            placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                            ios-optimized-input ${fee.highlight?.amount ? 'text-red-500 dark:text-red-400 font-medium' : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 移动端总计信息 */}
        {(data.showWeightAndPackage || (data.showPrice && data.otherFees && data.otherFees.length > 0)) && (
          <div className="flex justify-end items-center py-3 sm:py-4 px-3 sm:px-6 border-t border-[#007AFF]/10 dark:border-[#0A84FF]/10">
            <div className="w-full sm:w-auto">
              {/* 移动端网格布局 */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 sm:flex sm:items-center sm:gap-4 md:gap-6 bg-[#F5F5F7]/50 dark:bg-[#2C2C2E]/50 p-2.5 rounded-xl sm:bg-transparent sm:dark:bg-transparent sm:p-0">
                {data.showWeightAndPackage && (
                  <>
                    <div className="text-center sm:text-right bg-white/80 dark:bg-[#1C1C1E]/80 rounded-lg p-2 sm:p-0 sm:bg-transparent sm:dark:bg-transparent">
                      <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Total N.W.</div>
                      <div className="text-sm sm:text-base font-medium">{calculatedTotals.netWeight.toFixed(2)} KGS</div>
                    </div>
                    <div className="text-center sm:text-right bg-white/80 dark:bg-[#1C1C1E]/80 rounded-lg p-2 sm:p-0 sm:bg-transparent sm:dark:bg-transparent">
                      <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Total G.W.</div>
                      <div className="text-sm sm:text-base font-medium">{calculatedTotals.grossWeight.toFixed(2)} KGS</div>
                    </div>
                    <div className="text-center sm:text-right bg-white/80 dark:bg-[#1C1C1E]/80 rounded-lg p-2 sm:p-0 sm:bg-transparent sm:dark:bg-transparent">
                      <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Total Package</div>
                      <div className="text-sm sm:text-base font-medium">{calculatedTotals.packageQty} CTNS</div>
                    </div>
                  </>
                )}
                {data.showPrice && (
                  <div className="text-center sm:text-right bg-white/80 dark:bg-[#1C1C1E]/80 rounded-lg p-2 sm:p-0 sm:bg-transparent sm:dark:bg-transparent">
                    <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Total Amount</div>
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

      {/* 桌面端表格视图 - 中屏及以上显示 */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200/30 dark:border-white/10
                    bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl shadow-lg">
        <div className="min-w-[800px] lg:min-w-[1000px] xl:min-w-[1200px]">
          <table className="w-full">
              <thead>
              <tr className="border-b border-[#007AFF]/10 dark:border-[#0A84FF]/10
                            bg-[#007AFF]/5 dark:bg-[#0A84FF]/5">
                <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[40px]">No.</th>
                {data.showHsCode && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[120px]">
                    HS Code
                  </th>
                )}
                <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[200px] lg:w-[280px] xl:w-[350px]">Description</th>
                <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[100px]">Qty</th>
                <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[100px]">Unit</th>
                {data.showPrice && (
                  <>
                                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[120px] lg:w-[140px]">U/Price</th>
                <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[130px] lg:w-[150px]">Amount</th>
                  </>
                )}
                {data.showWeightAndPackage && (
                  <>
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[100px]">
                    N.W.<br/> (kg)
                  </th>
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[100px]">
                    G.W.<br/> (kg)
                  </th>
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[100px]">Pkgs</th>
                  </>
                )}
                {data.showDimensions && (
                <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[140px] lg:w-[160px]">
                  Dimensions<br/>({data.dimensionUnit})
                </th>
                )}
              </tr>
              </thead>
            <tbody>
              {/* 商品行（支持分组合并单元格和分组底色） */}
              {(() => {
                // 记录已处理的组ID，避免重复渲染rowSpan
                const renderedGroupIds = new Set<string>();
                return data.items.map((item, index) => {
                  const isInGroup = !!item.groupId;
                  const groupItems = isInGroup ? data.items.filter(i => i.groupId === item.groupId) : [];
                  const isFirstInGroup = isInGroup && groupItems[0]?.id === item.id;
                  const groupRowSpan = isInGroup ? groupItems.length : 1;
                  // 组底色
                  const groupBg = isInGroup ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white/90 dark:bg-[#1C1C1E]/90';
                  // 只在组内第一行渲染合并单元格
                  return (
                    <tr key={item.id} className={`border-b border-[#007AFF]/10 dark:border-[#0A84FF]/10 ${groupBg}`}>
                      <td className="py-2 px-4 text-center text-sm">
                      <span 
                          className="flex items-center justify-center w-5 h-5 rounded-full text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 cursor-pointer transition-colors"
                        onClick={() => handleSoftDelete(index)}
                      >
                        {index + 1}
                      </span>
                    </td>
                  {data.showHsCode && (
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
                  <td className="py-2 px-4 text-center text-sm">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editingQtyIndex === index ? editingQtyAmount : item.quantity.toString()}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d*$/.test(value)) {
                            setEditingQtyAmount(value);
                            // 只在输入过程中更新数量，不触发单位更新
                            const quantity = value === '' ? 0 : parseInt(value);
                            onItemChange(index, 'quantity', quantity);
                          }
                        }}
                        onFocus={(e) => {
                          setEditingQtyIndex(index);
                          setEditingQtyAmount(item.quantity.toString());
                          e.target.select();
                          handleIOSInputFocus(e);
                        }}
                        onBlur={() => {
                          setEditingQtyIndex(null);
                          setEditingQtyAmount('');
                          // 失焦时更新单位（如果需要）
                          const item = data.items[index];
                          const result = handleUnitItemChange(item, 'quantity', item.quantity);
                          if (result.unit !== item.unit) {
                            onItemChange(index, 'unit', result.unit);
                          }
                        }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ios-optimized-input"
                        placeholder="0"
                          style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                      />
                    </td>
                  <td className="py-2 px-4 text-center text-sm">
                      <UnitSelector
                        value={item.unit}
                        quantity={item.quantity}
                        customUnits={data.customUnits || []}
                        onChange={(unit) => handleUnitChange(index, unit)}
                        className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center cursor-pointer appearance-none ios-optimized-input"
                      />
                    </td>
                    {data.showPrice && (
                      <>
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
                      <td className="py-2 px-4 text-center text-sm">
                          <input
                            type="text"
                            value={item.totalPrice.toFixed(2)}
                            readOnly
                            className={`${baseInputClassName} text-center`}
                            style={iosCaretStyle}
                          />
                        </td>
                      </>
                    )}
                      {/* 合并单元格：只在组内第一行渲染，rowSpan=组内行数 */}
                    {data.showWeightAndPackage && (
                        isInGroup && isFirstInGroup ? (
                          <>
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
                                      const newPackageQty = value === '' ? 0 : parseInt(value);
                                      groupItems.forEach((groupItem) => {
                                        const itemIndex = data.items.findIndex(i => i.id === groupItem.id);
                                        if (itemIndex !== -1) {
                                          onItemChange(itemIndex, 'packageQty', newPackageQty);
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
                                  onBlur={() => {
                                    setEditingPackageQtyIndex(null);
                                    setEditingPackageQtyAmount('');
                                  }}
                                  className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center font-medium ios-optimized-input"
                                  placeholder="0"
                                  style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                                />
                              </div>
                            </td>
                          </>
                        ) : isInGroup ? null : (
                          // 普通行
                      <>
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
                                                  onBlur={(e) => {
                              setEditingNetWeightIndex(null);
                              setEditingNetWeightAmount('');
                              // 确保在失去焦点时最终值被正确保存
                              const finalValue = parseFloat(e.target.value) || 0;
                              onItemChange(index, 'netWeight', finalValue);
                            }}
                              className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                                text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center ios-optimized-input"
                            placeholder="0.00"
                                style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                          />
                        </td>
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
                                                  onBlur={(e) => {
                              setEditingGrossWeightIndex(null);
                              setEditingGrossWeightAmount('');
                              // 确保在失去焦点时最终值被正确保存
                              const finalValue = parseFloat(e.target.value) || 0;
                              onItemChange(index, 'grossWeight', finalValue);
                            }}
                              className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                                text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center ios-optimized-input"
                            placeholder="0.00"
                                style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                          />
                        </td>
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
                            onBlur={(e) => {
                              setEditingPackageQtyIndex(null);
                              setEditingPackageQtyAmount('');
                              // 确保在失去焦点时最终值被正确保存
                              const finalValue = parseInt(e.target.value) || 0;
                              onItemChange(index, 'packageQty', finalValue);
                            }}
                                className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                                    text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7]
                                    placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                                    transition-all duration-200 text-center
                                ios-optimized-input"
                            placeholder="0"
                                style={{ ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle) }}
                          />
                        </td>
                      </>
                        )
                    )}
                      {/* 尺寸列合并单元格 */}
                    {data.showDimensions && (
                        isInGroup && isFirstInGroup ? (
                          <td rowSpan={groupRowSpan} className="py-2 px-4 text-center align-middle" style={{verticalAlign:'middle'}}>
                            <div className="flex flex-col justify-center items-center h-full">
                              <input
                                type="text"
                                value={item.dimensions}
                                onChange={(e) => {
                                  const newDimensions = e.target.value;
                                  groupItems.forEach((groupItem) => {
                                    const itemIndex = data.items.findIndex(i => i.id === groupItem.id);
                                    if (itemIndex !== -1) {
                                      onItemChange(itemIndex, 'dimensions', newDimensions);
                                    }
                                  });
                                }}
                                className="w-32 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-medium"
                                placeholder={`Dimensions (${data.dimensionUnit})`}
                              />
                            </div>
                          </td>
                        ) : isInGroup ? null : (
                    <td className="py-2 px-4 text-center text-sm">
                        <input
                          type="text"
                          value={item.dimensions}
                          onChange={(e) => onItemChange(index, 'dimensions', e.target.value)}
                              className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center ios-optimized-input"
                              placeholder={`Dimensions (${data.dimensionUnit})`}
                        />
                      </td>
                        )
                    )}
                  </tr>
                  );
                });
              })()}
              </tbody>
            </table>

          {/* Other Fees 表格 */}
          {data.showPrice && data.otherFees && data.otherFees.length > 0 && (
            <OtherFeesTable
              otherFees={data.otherFees || []}
              currency={data.currency}
              editingFeeIndex={editingFeeIndex || null}
              editingFeeAmount={editingFeeAmount || ''}
              onDeleteFee={onDeleteOtherFee || (() => {})}
              onFeeChange={onOtherFeeChange || (() => {})}
              onFeeDoubleClick={onOtherFeeDoubleClick || (() => {})}
              setEditingFeeIndex={setEditingFeeIndex || (() => {})}
              setEditingFeeAmount={setEditingFeeAmount || (() => {})}
              showWeightAndPackage={data.showWeightAndPackage}
              showHsCode={data.showHsCode}
              showDimensions={data.showDimensions}
            />
          )}

          {/* 总计行 - 无论是否显示价格，只要有重量或包装数量就显示 */}
          {(data.showWeightAndPackage || (data.showPrice && data.otherFees && data.otherFees.length > 0)) && (
            <div className="flex justify-end items-center py-3 sm:py-4 px-3 sm:px-6 border-t border-[#007AFF]/10 dark:border-[#0A84FF]/10">
              <div className="w-full sm:w-auto">
                {/* 移动端网格布局 */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-2 sm:flex sm:items-center sm:gap-4 md:gap-6 bg-[#F5F5F7]/50 dark:bg-[#2C2C2E]/50 p-2.5 rounded-xl sm:bg-transparent sm:dark:bg-transparent sm:p-0">
                  {data.showWeightAndPackage && (
                    <>
                      <div className="text-center sm:text-right bg-white/80 dark:bg-[#1C1C1E]/80 rounded-lg p-2 sm:p-0 sm:bg-transparent sm:dark:bg-transparent">
                        <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Total N.W.</div>
                        <div className="text-sm sm:text-base font-medium">{calculatedTotals.netWeight.toFixed(2)} KGS</div>
                      </div>
                      <div className="text-center sm:text-right bg-white/80 dark:bg-[#1C1C1E]/80 rounded-lg p-2 sm:p-0 sm:bg-transparent sm:dark:bg-transparent">
                        <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Total G.W.</div>
                        <div className="text-sm sm:text-base font-medium">{calculatedTotals.grossWeight.toFixed(2)} KGS</div>
                      </div>
                      <div className="text-center sm:text-right bg-white/80 dark:bg-[#1C1C1E]/80 rounded-lg p-2 sm:p-0 sm:bg-transparent sm:dark:bg-transparent">
                        <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Total Package</div>
                        <div className="text-sm sm:text-base font-medium">{calculatedTotals.packageQty} CTNS</div>
                      </div>
                    </>
                  )}
                  {data.showPrice && (
                    <div className="text-center sm:text-right bg-white/80 dark:bg-[#1C1C1E]/80 rounded-lg p-2 sm:p-0 sm:bg-transparent sm:dark:bg-transparent">
                      <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Total Amount</div>
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
      </div>
    </div>
  );
}; 