import React, { useState, useEffect, useCallback } from 'react';
import { ImportDataButton } from './ImportDataButton';
import type { QuotationData, LineItem } from '@/types/quotation';

interface ItemsTableProps {
  data: QuotationData;
  onChange: (data: QuotationData) => void;
}

// Add highlight class constant
const highlightClass = 'text-red-500 dark:text-red-400 font-medium';

// 默认单位列表（需要单复数变化的单位）
const defaultUnits = ['pc', 'set', 'length'] as const;

// 简化的iOS光标优化样式 - 与invoice页面保持一致
const iosCaretStyle = {
  caretColor: '#007AFF',
  WebkitCaretColor: '#007AFF',
} as React.CSSProperties;

// 暗色模式的光标颜色
const iosCaretStyleDark = {
  caretColor: '#0A84FF',
  WebkitCaretColor: '#0A84FF',
} as React.CSSProperties;

export const ItemsTable: React.FC<ItemsTableProps> = ({ data, onChange }) => {
  // 可用单位列表
  const availableUnits = [...defaultUnits, ...(data.customUnits || [])] as const;

  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [editingPriceAmount, setEditingPriceAmount] = useState<string>('');
  const [editingQtyIndex, setEditingQtyIndex] = useState<number | null>(null);
  const [editingQtyAmount, setEditingQtyAmount] = useState<string>('');
  const [editingOtherFeeIndex, setEditingOtherFeeIndex] = useState<number | null>(null);
  const [editingOtherFeeAmount, setEditingOtherFeeAmount] = useState<string>('');
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

  // 简化的iOS输入框优化处理函数
  const handleIOSInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const element = e.target;
    
    // 设置光标颜色
    element.style.caretColor = isDarkMode ? '#0A84FF' : '#007AFF';
    (element.style as any).webkitCaretColor = isDarkMode ? '#0A84FF' : '#007AFF';
    
    // 延迟滚动到可视区域，避免键盘遮挡
    setTimeout(() => {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }, 300);
  };

  // 添加表格宽度设置的逻辑
  useEffect(() => {
    const mainTable = document.querySelector('table');
    if (mainTable) {
      document.documentElement.style.setProperty('--table-width', `${mainTable.offsetWidth}px`);
    }
  }, [data.items.length, data.showDescription, data.showRemarks]);

  // 初始化函数，用于调整所有textarea的高度
  const initializeTextareaHeights = useCallback(() => {
    setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        textarea.style.height = '28px';
        textarea.style.height = `${textarea.scrollHeight}px`;
      });
    }, 0);
  }, []);

  // 在组件挂载时调用一次初始化函数
  useEffect(() => {
    initializeTextareaHeights();
  }, [initializeTextareaHeights]);

  // 在数据变化时调整所有textarea的高度
  useEffect(() => {
    initializeTextareaHeights();
  }, [data.items, data.otherFees, initializeTextareaHeights]);

  // 处理键盘导航
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    index: number,
    field: keyof LineItem
  ) => {
    const fields: (keyof LineItem)[] = ['partName'];
    if (data.showDescription) fields.push('description');
    fields.push('quantity', 'unit', 'unitPrice');
    if (data.showRemarks) fields.push('remarks');

    const currentFieldIndex = fields.indexOf(field);
    const currentRowIndex = index;

    // 如果是文本区域且按下回车键，不阻止默认行为（允许换行）
    if ((field === 'partName' || field === 'description') && e.key === 'Enter' && !e.shiftKey) {
      e.stopPropagation(); // 阻止事件冒泡，但允许默认行为（换行）
      return;
    }

    switch (e.key) {
      case 'Tab':
        if (!e.shiftKey && currentFieldIndex < fields.length - 1) {
          e.preventDefault();
          const nextField = document.querySelector<HTMLElement>(
            `[data-row="${index}"][data-field="${fields[currentFieldIndex + 1]}"]`
          );
          nextField?.focus();
        } else if (e.shiftKey && currentFieldIndex > 0) {
          e.preventDefault();
          const prevField = document.querySelector<HTMLElement>(
            `[data-row="${index}"][data-field="${fields[currentFieldIndex - 1]}"]`
          );
          prevField?.focus();
        }
        break;
      case 'ArrowUp':
        if (currentRowIndex > 0) {
          const upField = document.querySelector<HTMLElement>(
            `[data-row="${index - 1}"][data-field="${field}"]`
          );
          upField?.focus();
        }
        break;
      case 'ArrowDown':
        if (currentRowIndex < data.items.length - 1) {
          const downField = document.querySelector<HTMLElement>(
            `[data-row="${index + 1}"][data-field="${field}"]`
          );
          downField?.focus();
        }
        break;
      case 'ArrowLeft':
        if (currentFieldIndex > 0) {
          const prevField = document.querySelector<HTMLElement>(
            `[data-row="${index}"][data-field="${fields[currentFieldIndex - 1]}"]`
          );
          prevField?.focus();
        }
        break;
      case 'ArrowRight':
        if (currentFieldIndex < fields.length - 1) {
          const nextField = document.querySelector<HTMLElement>(
            `[data-row="${index}"][data-field="${fields[currentFieldIndex + 1]}"]`
          );
          nextField?.focus();
        }
        break;
    }
  };

  // 处理导入的数据
  const handleImport = (newItems: typeof data.items) => {
    // 处理每个项目的单位单复数
    const processedItems = newItems.map(item => {
      const baseUnit = item.unit.replace(/s$/, '');
      return {
        ...item,
        unit: defaultUnits.includes(baseUnit as typeof defaultUnits[number]) ? getUnitDisplay(baseUnit, item.quantity) : item.unit
      };
    });

    onChange({
      ...data,
      items: processedItems
    });
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
    
    // 处理文本字段，去除引号
    if (typeof value === 'string') {
      value = value.replace(/^"|"$/g, '');
    }
    
    if (field === 'unit') {
      // 处理单位变更,根据当前数量决定是否需要复数形式
      const baseUnit = value.toString().replace(/s$/, '');
      const quantity = newItems[index].quantity;
      newItems[index] = {
        ...newItems[index],
        unit: defaultUnits.includes(baseUnit as typeof defaultUnits[number]) ? getUnitDisplay(baseUnit, quantity) : value.toString()
      };
    } else if (field === 'quantity') {
      // 更新数量时,同时更新单位的单复数
      const quantity = Number(value);
      const baseUnit = newItems[index].unit.replace(/s$/, '');
      newItems[index] = {
        ...newItems[index],
        quantity,
        unit: defaultUnits.includes(baseUnit as typeof defaultUnits[number]) ? getUnitDisplay(baseUnit, quantity) : newItems[index].unit
      };
    } else if (field === 'partName') {
      // 特殊处理 partName 字段，保留换行符
      newItems[index] = {
        ...newItems[index],
        [field]: value.toString()
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };
    }

    // 如果更改了数量或单价,自动计算金额
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
    }

    onChange({
      ...data,
      items: newItems
    });
  };

  // 处理单元格粘贴
  const handleCellPaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>, index: number, field: keyof LineItem) => {
    // 阻止事件冒泡
    e.stopPropagation();
    
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const pasteText = e.clipboardData.getData('text');
    
    // 如果没有粘贴内容，直接返回
    if (!pasteText) return;
    
    // 对于数字类型的字段，需要验证和处理
    switch (field) {
      case 'quantity':
        if (!/^\d+$/.test(pasteText)) {
          e.preventDefault();
          alert('数量必须是正整数');
          return;
        }
        const quantity = parseInt(pasteText);
        if (quantity < 0) {
          e.preventDefault();
          alert('数量不能为负数');
          return;
        }
        // 让默认粘贴行为发生，然后在下一个事件循环中更新数据
        setTimeout(() => {
          handleItemChange(index, field, quantity);
        }, 0);
        break;
        
      case 'unitPrice':
        if (!/^\d*\.?\d*$/.test(pasteText)) {
          e.preventDefault();
          alert('单价必须是有效的数字');
          return;
        }
        const unitPrice = parseFloat(pasteText);
        if (isNaN(unitPrice) || unitPrice < 0) {
          e.preventDefault();
          alert('请输入有效的单价');
          return;
        }
        // 让默认粘贴行为发生，然后在下一个事件循环中更新数据
        setTimeout(() => {
          handleItemChange(index, field, unitPrice);
        }, 0);
        break;
        
      case 'unit':
        e.preventDefault();
        // 单位处理，自动处理单复数
        const baseUnit = pasteText.toLowerCase().replace(/s$/, '');
        if (defaultUnits.includes(baseUnit as typeof defaultUnits[number])) {
          const quantity = data.items[index].quantity;
          handleItemChange(index, field, getUnitDisplay(baseUnit, quantity));
        } else {
          handleItemChange(index, field, pasteText);
        }
        break;
        
      default:
        // 对于其他字段（partName, description, remarks），让默认粘贴行为发生，然后在下一个事件循环中更新数据
        setTimeout(() => {
          handleItemChange(index, field, target.value);
        }, 0);
    }
  };

  // 处理软删除
  const handleSoftDelete = (index: number) => {
    onChange({
      ...data,
      items: data.items.filter((_, i) => i !== index)
    });
  };

  // 处理其他费用的更改
  const handleOtherFeeChange = (index: number, field: 'description' | 'amount' | 'remarks', value: string | number) => {
    const newFees = [...(data.otherFees ?? [])];
    newFees[index] = {
      ...newFees[index],
      [field]: value
    };
    onChange({
      ...data,
      otherFees: newFees
    });
  };

  // 处理其他费用的双击高亮
  const handleOtherFeeDoubleClick = (index: number, field: 'description' | 'amount' | 'remarks') => {
    const newFees = [...(data.otherFees ?? [])];
    newFees[index] = {
      ...newFees[index],
      highlight: {
        ...newFees[index].highlight,
        [field]: !newFees[index].highlight?.[field]
      }
    };
    onChange({
      ...data,
      otherFees: newFees
    });
  };

  // 处理其他费用的删除
  const handleOtherFeeSoftDelete = (index: number) => {
    onChange({
      ...data,
      otherFees: data.otherFees?.filter((_, i) => i !== index)
    });
  };

  // 添加处理双击事件的函数
  const handleDoubleClick = (index: number, field: keyof Exclude<LineItem['highlight'], undefined>) => {
    const newItems = [...data.items];
    newItems[index] = {
      ...newItems[index],
      highlight: {
        ...newItems[index].highlight,
        [field]: !newItems[index].highlight?.[field]
      }
    };
    onChange({
      ...data,
      items: newItems
    });
  };

  return (
    <div className="space-y-0">
      <ImportDataButton onImport={handleImport} />
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 px-1">
        提示：双击单元格可以切换红色高亮显示
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className={`border border-[#E5E5EA] dark:border-[#2C2C2E]
            bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl overflow-hidden
            ${(data.otherFees ?? []).length > 0 ? 'rounded-t-2xl' : 'rounded-2xl'}`}>
            <table className="min-w-full divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] table-fixed">
              <thead>
                <tr className={`bg-[#F5F5F7] dark:bg-[#3A3A3C]
                  border-b border-[#E5E5EA] dark:border-[#48484A]
                  ${(data.otherFees ?? []).length === 0 ? 'rounded-t-2xl overflow-hidden' : ''}`}>
                  <th className={`left-0 z-10 w-[50px] px-1 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]
                    bg-[#F5F5F7] dark:bg-[#3A3A3C]
                    ${(data.otherFees ?? []).length === 0 ? 'rounded-tl-2xl' : ''}`}>No.</th>
                  <th className="min-w-[150px] max-w-[250px] w-fit px-1 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap">Part Name</th>
                  {data.showDescription && (
                    <th className="min-w-[150px] w-fit px-1 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Description</th>
                  )}
                  <th className="w-[80px] min-w-[80px] px-1 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Q&apos;TY</th>
                  <th className="w-[80px] min-w-[80px] px-1 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Unit</th>
                  <th className="w-[100px] min-w-[100px] px-1 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">U/Price</th>
                  <th className="w-[100px] min-w-[100px] px-1 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Amount</th>
                  {data.showRemarks && (
                    <th className={`w-[250px] min-w-[250px] max-w-[250px] px-1 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]
                      ${(data.otherFees ?? []).length === 0 ? 'rounded-tr-2xl' : ''}`}>Remarks</th>
                  )}
                  {!data.showRemarks && (
                    <th className={`w-[50px] min-w-[50px] px-1 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]
                      ${(data.otherFees ?? []).length === 0 ? 'rounded-tr-2xl' : ''}`}></th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white/90 dark:bg-[#1C1C1E]/90">
                {data.items.map((item, index) => (
                  <tr key={item.id} 
                    className="border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <td className={`sticky left-0 z-10 w-[50px] px-1 py-2 text-center text-sm bg-white/90 dark:bg-[#1C1C1E]/90
                      ${index === data.items.length - 1 && !data.otherFees?.length ? 'rounded-bl-2xl' : ''}`}>
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
                    <td className="min-w-[150px] w-fit px-1 py-2 bg-white/90 dark:bg-[#1C1C1E]/90">
                      <textarea
                        value={item.partName}
                        data-row={index}
                        data-field="partName"
                        onChange={(e) => {
                          handleItemChange(index, 'partName', e.target.value);
                          e.target.style.height = '28px';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onDoubleClick={() => handleDoubleClick(index, 'partName')}
                        onKeyDown={(e) => handleKeyDown(e, index, 'partName')}
                        onPaste={(e) => handleCellPaste(e, index, 'partName')}
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
                    </td>
                    {data.showDescription && (
                      <td className="min-w-[150px] w-fit px-1 py-2">
                        <textarea
                          value={item.description}
                          data-row={index}
                          data-field="description"
                          onChange={(e) => {
                            handleItemChange(index, 'description', e.target.value);
                            e.target.style.height = '28px';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onDoubleClick={() => handleDoubleClick(index, 'description')}
                          onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                          onPaste={(e) => handleCellPaste(e, index, 'description')}
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
                    <td className="w-[80px] min-w-[80px] px-1 py-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editingQtyIndex === index ? editingQtyAmount : item.quantity.toString()}
                        data-row={index}
                        data-field="quantity"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d*$/.test(value)) {
                            setEditingQtyAmount(value);
                            handleItemChange(index, 'quantity', value === '' ? 0 : parseInt(value));
                          }
                        }}
                        onDoubleClick={() => handleDoubleClick(index, 'quantity')}
                        onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                        onPaste={(e) => handleCellPaste(e, index, 'quantity')}
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
                    </td>
                    <td className="w-[80px] min-w-[80px] px-1 py-2">
                      <select
                        value={item.unit}
                        data-row={index}
                        data-field="unit"
                        onChange={(e) => {
                          handleItemChange(index, 'unit', e.target.value);
                        }}
                        onDoubleClick={() => handleDoubleClick(index, 'unit')}
                        onKeyDown={(e) => handleKeyDown(e, index, 'unit')}
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
                    <td className="w-[100px] min-w-[100px] px-1 py-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editingPriceIndex === index ? editingPriceAmount : item.unitPrice.toFixed(2)}
                        data-row={index}
                        data-field="unitPrice"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d*\.?\d*$/.test(value)) {
                            setEditingPriceAmount(value);
                            handleItemChange(index, 'unitPrice', value === '' ? 0 : parseFloat(value));
                          }
                        }}
                        onDoubleClick={() => handleDoubleClick(index, 'unitPrice')}
                        onKeyDown={(e) => handleKeyDown(e, index, 'unitPrice')}
                        onPaste={(e) => handleCellPaste(e, index, 'unitPrice')}
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
                    </td>
                    <td className={`w-[100px] min-w-[100px] px-1 py-2
                      ${!data.showRemarks && index === data.items.length - 1 && !data.otherFees?.length ? 'rounded-br-2xl' : ''}`}>
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
                    {data.showRemarks && (
                      <td className={`w-[250px] min-w-[250px] max-w-[250px] px-1 py-2
                        ${index === data.items.length - 1 && !data.otherFees?.length ? 'rounded-br-2xl' : ''}`}>
                        <textarea
                          value={item.remarks}
                          data-row={index}
                          data-field="remarks"
                          onChange={(e) => {
                            handleItemChange(index, 'remarks', e.target.value);
                            e.target.style.height = '28px';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onDoubleClick={() => handleDoubleClick(index, 'remarks')}
                          onKeyDown={(e) => handleKeyDown(e, index, 'remarks')}
                          onPaste={(e) => handleCellPaste(e, index, 'remarks')}
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
                ))}
              </tbody>
            </table>
          </div>

          {(data.otherFees ?? []).length > 0 && (
            <div className={`border border-t-0 border-[#E5E5EA] dark:border-[#2C2C2E]
              bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl overflow-hidden
              ${data.items.length === 0 ? 'rounded-t-2xl' : ''} rounded-b-2xl`}>
              <table className="min-w-full">
                <tbody className="bg-white/90 dark:bg-[#1C1C1E]/90">
                  {(data.otherFees ?? []).map((fee, index) => (
                    <tr key={fee.id} 
                      className={`border-t border-[#E5E5EA] dark:border-[#2C2C2E]
                        ${index === (data.otherFees ?? []).length - 1 ? 'overflow-hidden' : ''}`}>
                      <td className={`sticky left-0 z-10 w-[50px] px-1 py-2 text-center text-sm bg-white/90 dark:bg-[#1C1C1E]/90
                        ${index === (data.otherFees ?? []).length - 1 ? 'rounded-bl-2xl overflow-hidden' : ''}`}>
                        <span 
                          className={`flex items-center justify-center w-5 h-5 rounded-full 
                            text-xs text-gray-400
                            hover:bg-red-100 hover:text-red-600 
                            cursor-pointer transition-colors
                            ${index === (data.otherFees ?? []).length - 1 ? 'rounded-bl-2xl' : ''}`}
                          onClick={() => handleOtherFeeSoftDelete(index)}
                          title="Click to delete"
                        >
                          ×
                        </span>
                      </td>
                      <td colSpan={data.showDescription ? 6 : 5} className={`px-1 py-2
                        ${index === (data.otherFees ?? []).length - 1 && !data.showRemarks ? '' : ''}`}>
                        <textarea
                          value={fee.description}
                          onChange={(e) => {
                            handleOtherFeeChange(index, 'description', e.target.value);
                            e.target.style.height = '28px';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onDoubleClick={() => handleOtherFeeDoubleClick(index, 'description')}
                          placeholder="Other Fee"
                          className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                            focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                            placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                            transition-all duration-200 whitespace-pre-wrap resize-y overflow-hidden
                            ios-optimized-input
                            ${fee.highlight?.description ? highlightClass : ''}
                            ${index === (data.otherFees ?? []).length - 1 && !data.showRemarks ? 'rounded-br-2xl' : ''}`}
                          style={{ 
                            height: '28px',
                            ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                          }}
                        />
                      </td>
                      <td className={`w-[120px] min-w-[120px] px-1 py-2
                        ${index === (data.otherFees ?? []).length - 1 && !data.showRemarks ? 'rounded-br-2xl' : ''}`}>
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
                          onDoubleClick={() => handleOtherFeeDoubleClick(index, 'amount')}
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
                          className={`w-full px-3 py-1.5 bg-transparent border border-transparent
                            focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                            placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                            transition-all duration-200
                            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                            ios-optimized-input
                            ${fee.highlight?.amount ? highlightClass : ''}
                            ${index === (data.otherFees ?? []).length - 1 && !data.showRemarks ? 'rounded-br-2xl' : ''}`}
                          style={{
                            ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                          }}
                        />
                      </td>
                      {data.showRemarks && (
                        <td className={`w-[250px] min-w-[250px] max-w-[250px] px-1 py-2
                          ${index === (data.otherFees ?? []).length - 1 ? 'rounded-br-2xl' : ''}`}>
                          <textarea
                            value={fee.remarks || ''}
                            onChange={(e) => {
                              handleOtherFeeChange(index, 'remarks', e.target.value);
                              e.target.style.height = '28px';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onDoubleClick={() => handleOtherFeeDoubleClick(index, 'remarks')}
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
  );
}; 