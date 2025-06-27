import React, { useEffect, useCallback } from 'react';

// 表格输入框基础样式
const baseInputClassName = `w-full px-2 py-1.5 rounded-lg
  bg-transparent backdrop-blur-sm
  border border-gray-200 dark:border-gray-600
  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
  focus:border-[#007AFF] dark:focus:border-[#0A84FF]
  text-[13px] leading-relaxed text-gray-800 dark:text-gray-100
  placeholder:text-gray-400/70 dark:placeholder:text-gray-500/70
  transition-all duration-200 ease-out
  hover:border-gray-300 dark:hover:border-gray-500`;

// 文本输入框样式
const textInputClassName = `${baseInputClassName} text-left`;

// 数字输入框样式  
const numberInputClassName = `${baseInputClassName} text-center
  [appearance:textfield] 
  [&::-webkit-outer-spin-button]:appearance-none 
  [&::-webkit-inner-spin-button]:appearance-none`;

// 选择框样式
const selectInputClassName = `${baseInputClassName} text-center cursor-pointer
  appearance-none bg-white dark:bg-gray-800`;

// 默认单位列表（需要单复数变化的单位）
const defaultUnits = ['pc', 'set', 'length'] as const;

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
}

interface PackingData {
  items: PackingItem[];
  showHsCode: boolean;
  showDimensions: boolean;
  showWeightAndPackage: boolean;
  showPrice: boolean;
  dimensionUnit: string;
  currency: string;
  customUnits?: string[];
}

interface ItemsTableProps {
  data: PackingData;
  onItemChange: (index: number, field: keyof PackingItem, value: string | number) => void;
  onAddLine: () => void;
  onDeleteLine: (index: number) => void;
  totals: {
    totalPrice: number;
    netWeight: number;
    grossWeight: number;
    packageQty: number;
  };
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
  data,
  onItemChange,
  onAddLine,
  onDeleteLine,
  totals
}) => {
  // 可用单位列表
  const availableUnits = [...defaultUnits, ...(data.customUnits || [])] as const;

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
  }, [data.items, initializeTextareaHeights]);

  // 处理单位的单复数
  const getUnitDisplay = (baseUnit: string, quantity: number) => {
    if (defaultUnits.includes(baseUnit as typeof defaultUnits[number])) {
      return quantity > 1 ? `${baseUnit}s` : baseUnit;
    }
    return baseUnit; // 自定义单位不变化单复数
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

  // 处理数量变更时同时更新单位
  const handleQuantityChange = (index: number, value: string | number) => {
    const quantity = Number(value);
    const baseUnit = data.items[index].unit.replace(/s$/, '');
    const newUnit = defaultUnits.includes(baseUnit as typeof defaultUnits[number]) 
      ? getUnitDisplay(baseUnit, quantity) 
      : data.items[index].unit;
    
    onItemChange(index, 'quantity', value);
    if (newUnit !== data.items[index].unit) {
      onItemChange(index, 'unit', newUnit);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-[1200px] bg-white dark:bg-[#2C2C2E] rounded-xl border border-gray-200 dark:border-[#3A3A3C] overflow-hidden">
          <table className="w-full table-fixed">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-[#3A3A3C]">
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider w-12">No.</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider" style={{width: `${data.showHsCode ? '25%' : '30%'}`}}>Description</th>
                {data.showHsCode && (
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider w-24">HS Code</th>
                )}
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider w-16">Qty</th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider w-16">Unit</th>
                {data.showPrice && (
                  <>
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider w-20">U/Price</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider w-24">Amount</th>
                  </>
                )}
                {data.showWeightAndPackage && (
                  <>
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider w-20">N.W.(kg)</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider w-20">G.W.(kg)</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider w-16">Pkgs</th>
                  </>
                )}
                {data.showDimensions && (
                  <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider w-32">Dimensions ({data.dimensionUnit})</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3A3A3C]">
              {data.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#1C1C1E]/50 transition-colors duration-200">
                  <td className="px-2 py-2 w-12 text-center">
                    <span 
                      className={`flex items-center justify-center w-6 h-6 rounded-full 
                        text-xs transition-all duration-200 ${
                        data.items.length > 1 
                          ? 'text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer'
                          : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      }`}
                      onClick={() => data.items.length > 1 && onDeleteLine(index)}
                      title={data.items.length > 1 ? "Click to delete" : "Cannot delete the last item"}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <textarea
                      value={item.description}
                      onChange={(e) => {
                        onItemChange(index, 'description', e.target.value);
                        e.target.style.height = '28px';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      className={`${textInputClassName} resize-none overflow-hidden whitespace-pre-wrap`}
                      placeholder="Enter product description..."
                      style={{ height: '28px' }}
                      rows={1}
                      onKeyDown={(e) => {
                        // 如果按下回车键且不按住Shift，允许换行
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.stopPropagation(); // 阻止事件冒泡，但允许默认行为（换行）
                        }
                      }}
                    />
                  </td>
                  {data.showHsCode && (
                    <td className="px-2 py-2 w-24">
                                              <input
                          type="text"
                          value={item.hsCode}
                          onChange={(e) => onItemChange(index, 'hsCode', e.target.value)}
                          className={`${baseInputClassName} text-center`}
                          placeholder="HS Code"
                        />
                    </td>
                  )}
                  <td className="px-2 py-2 w-16">
                    <input
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      className={numberInputClassName}
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                  </td>
                  <td className="px-2 py-2 w-16">
                    <select
                      value={item.unit}
                      onChange={(e) => handleUnitChange(index, e.target.value)}
                      className={selectInputClassName}
                    >
                      {availableUnits.map(unit => {
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
                  {data.showPrice && (
                    <>
                      <td className="px-2 py-2 w-20">
                        <input
                          type="number"
                          value={item.unitPrice || ''}
                          onChange={(e) => onItemChange(index, 'unitPrice', e.target.value)}
                          className={numberInputClassName}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-2 py-2 w-24">
                        <div className="text-center py-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                          {data.currency === 'USD' ? '$' : data.currency === 'EUR' ? '€' : '¥'}
                          {item.totalPrice.toFixed(2)}
                        </div>
                      </td>
                    </>
                  )}
                  {data.showWeightAndPackage && (
                    <>
                      <td className="px-2 py-2 w-20">
                        <input
                          type="number"
                          value={item.netWeight || ''}
                          onChange={(e) => onItemChange(index, 'netWeight', e.target.value)}
                          className={numberInputClassName}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-2 py-2 w-20">
                        <input
                          type="number"
                          value={item.grossWeight || ''}
                          onChange={(e) => onItemChange(index, 'grossWeight', e.target.value)}
                          className={numberInputClassName}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-2 py-2 w-16">
                        <input
                          type="number"
                          value={item.packageQty || ''}
                          onChange={(e) => onItemChange(index, 'packageQty', e.target.value)}
                          className={numberInputClassName}
                          placeholder="0"
                          min="0"
                          step="1"
                        />
                      </td>
                    </>
                  )}
                  {data.showDimensions && (
                    <td className="px-2 py-2 w-32">
                      <input
                        type="text"
                        value={item.dimensions}
                        onChange={(e) => onItemChange(index, 'dimensions', e.target.value)}
                        className={`${baseInputClassName} text-center`}
                        placeholder="L×W×H"
                      />
                    </td>
                  )}
                </tr>
              ))}
              
              {/* 总计行 */}
              <tr className="bg-gray-50 dark:bg-[#1C1C1E] font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                <td className="px-2 py-3 text-center">
                  <button
                    type="button"
                    onClick={onAddLine}
                    className="flex items-center justify-center w-6 h-6 rounded-full
                      bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                      hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                      text-[#007AFF] dark:text-[#0A84FF]
                      text-sm font-medium
                      transition-all duration-200"
                    title="Add new line"
                  >
                    +
                  </button>
                </td>
                <td colSpan={
                  3 + // 描述、数量、单位
                  (data.showHsCode ? 1 : 0) + // HS Code列
                  (data.showPrice ? 1 : 0) // 单价列
                } className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">
                  Total:
                </td>
                {data.showPrice && (
                  <td className="px-2 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                    {data.currency === 'USD' ? '$' : data.currency === 'EUR' ? '€' : '¥'}
                    {totals.totalPrice.toFixed(2)}
                  </td>
                )}
                {data.showWeightAndPackage && (
                  <>
                    <td className="px-2 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                      {totals.netWeight.toFixed(2)}
                    </td>
                    <td className="px-2 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                      {totals.grossWeight.toFixed(2)}
                    </td>
                    <td className="px-2 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                      {totals.packageQty}
                    </td>
                  </>
                )}
                {data.showDimensions && (
                  <td className="px-2 py-3"></td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}; 