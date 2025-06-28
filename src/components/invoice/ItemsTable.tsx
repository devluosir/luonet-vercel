import { useState, useEffect, useRef } from 'react';
import type { InvoiceData, LineItem } from '@/types/invoice';

interface ItemsTableProps {
  data: InvoiceData;
  onChange: (index: number, field: keyof LineItem, value: string | number) => void;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({ data, onChange }) => {
  // 状态管理
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editingQtyIndex, setEditingQtyIndex] = useState<number | null>(null);
  const [editingQtyAmount, setEditingQtyAmount] = useState('');
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [editingPriceAmount, setEditingPriceAmount] = useState('');

  // iOS 光标样式
  const iosCaretStyle = {
    caretColor: '#2563eb',
    WebkitCaretColor: '#2563eb'
  };

  const iosCaretStyleDark = {
    caretColor: '#60a5fa',
    WebkitCaretColor: '#60a5fa'
  };

  // 检查深色模式
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // iOS输入优化
  const handleIOSInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!(/iPhone|iPad|iPod/.test(navigator.userAgent))) return;
    
    setTimeout(() => {
      e.target.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
    }, 300);
  };

  // 处理单位的单复数
  const getUnitDisplay = (baseUnit: string, quantity: number) => {
    const defaultUnits = ['pc', 'set', 'length'];
    if (defaultUnits.includes(baseUnit)) {
      return quantity > 1 ? `${baseUnit}s` : baseUnit;
    }
    return baseUnit;
  };

  // 计算金额
  const calculateAmount = (quantity: number, unitPrice: number) => {
    return Number((quantity * unitPrice).toFixed(2));
  };

  // 单位选项
  const unitOptions = ['pc', 'set', 'length'];

  return (
    <div className="space-y-0">
      {/* 移动端卡片视图 - 中屏以下显示 */}
      <div className="block lg:hidden space-y-4">
        {data.items.map((item, index) => (
          <div key={item.lineNo} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
            {/* 卡片头部 */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                Item #{index + 1}
              </div>
            </div>

            {/* 卡片内容 */}
            <div className="grid grid-cols-1 gap-4">
              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Description</label>
                <textarea
                  value={item.description}
                  onChange={(e) => onChange(index, 'description', e.target.value)}
                  onFocus={handleIOSInputFocus}
                  className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                    focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                    text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                    ios-optimized-input resize-y overflow-hidden whitespace-pre-wrap"
                  style={{ 
                    height: '28px',
                    ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                  }}
                  placeholder="Enter description..."
                />
              </div>

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
                        const quantity = value === '' ? 0 : parseInt(value);
                        onChange(index, 'quantity', quantity);
                        onChange(index, 'amount', calculateAmount(quantity, item.unitPrice));
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
                    className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                      ios-optimized-input"
                    style={{
                      ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Unit</label>
                  <select
                    value={item.unit.replace(/s$/, '')}
                    onChange={(e) => {
                      const baseUnit = e.target.value;
                      const unit = getUnitDisplay(baseUnit, item.quantity);
                      onChange(index, 'unit', unit);
                    }}
                    onFocus={handleIOSInputFocus}
                    className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center cursor-pointer
                      appearance-none ios-optimized-input"
                    style={{
                      ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                    }}
                  >
                    {unitOptions.map(unit => {
                      const displayUnit = getUnitDisplay(unit, item.quantity);
                      return (
                        <option key={unit} value={unit}>
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
                        const unitPrice = value === '' ? 0 : parseFloat(value);
                        onChange(index, 'unitPrice', unitPrice);
                        onChange(index, 'amount', calculateAmount(item.quantity, unitPrice));
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
                    className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                      ios-optimized-input"
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
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center cursor-default"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 桌面端表格视图 - 中屏及以上显示 */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="border border-[#E5E5EA] dark:border-[#2C2C2E]
              bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl overflow-hidden rounded-2xl">
              <table className="w-full divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] table-fixed">
                <thead>
                  <tr className="bg-[#F5F5F7] dark:bg-[#3A3A3C] border-b border-[#E5E5EA] dark:border-[#48484A] rounded-t-2xl overflow-hidden">
                    <th className="left-0 z-10 w-12 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]
                      bg-[#F5F5F7] dark:bg-[#3A3A3C] rounded-tl-2xl">No.</th>
                    <th className="w-1/2 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Description</th>
                    <th className="w-16 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Q&apos;TY</th>
                    <th className="w-16 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Unit</th>
                    <th className="w-24 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">U/Price</th>
                    <th className="w-28 px-2 py-3 text-center text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] rounded-tr-2xl">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white/90 dark:bg-[#1C1C1E]/90">
                  {data.items.map((item, index) => (
                    <tr key={item.lineNo} className="border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                      <td className={`sticky left-0 z-10 w-12 px-2 py-2 text-center text-sm bg-white/90 dark:bg-[#1C1C1E]/90
                        ${index === data.items.length - 1 ? 'rounded-bl-2xl' : ''}`}>
                        <span className="text-gray-600 dark:text-gray-400">
                          {index + 1}
                        </span>
                      </td>
                      <td className="w-1/2 px-2 py-2">
                        <textarea
                          value={item.description}
                          onChange={(e) => {
                            onChange(index, 'description', e.target.value);
                            e.target.style.height = '28px';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onFocus={handleIOSInputFocus}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent
                            focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                            placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                            transition-all duration-200 text-center whitespace-pre-wrap resize-y overflow-hidden
                            ios-optimized-input"
                          style={{ 
                            height: '28px',
                            ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                          }}
                          placeholder="Enter description..."
                        />
                      </td>
                      <td className="w-16 px-2 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editingQtyIndex === index ? editingQtyAmount : (item.quantity === 0 ? '' : item.quantity.toString())}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value)) {
                              setEditingQtyAmount(value);
                              const quantity = value === '' ? 0 : parseInt(value);
                              onChange(index, 'quantity', quantity);
                              onChange(index, 'amount', calculateAmount(quantity, item.unitPrice));
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
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent
                            focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                            placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                            transition-all duration-200 text-center
                            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                            ios-optimized-input"
                          style={{
                            ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                          }}
                          placeholder="0"
                        />
                      </td>
                      <td className="w-16 px-2 py-2">
                        <select
                          value={item.unit.replace(/s$/, '')}
                          onChange={(e) => {
                            const baseUnit = e.target.value;
                            const unit = getUnitDisplay(baseUnit, item.quantity);
                            onChange(index, 'unit', unit);
                          }}
                          onFocus={handleIOSInputFocus}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent
                            focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                            placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                            transition-all duration-200 text-center cursor-pointer
                            appearance-none ios-optimized-input"
                          style={{
                            ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                          }}
                        >
                          {unitOptions.map(unit => {
                            const displayUnit = getUnitDisplay(unit, item.quantity);
                            return (
                              <option key={unit} value={unit}>
                                {displayUnit}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="w-24 px-2 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editingPriceIndex === index ? editingPriceAmount : item.unitPrice.toFixed(2)}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d*$/.test(value)) {
                              setEditingPriceAmount(value);
                              const unitPrice = value === '' ? 0 : parseFloat(value);
                              onChange(index, 'unitPrice', unitPrice);
                              onChange(index, 'amount', calculateAmount(item.quantity, unitPrice));
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
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent
                            focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                            hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                            placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                            transition-all duration-200 text-center
                            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                            ios-optimized-input"
                          style={{
                            ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                          }}
                          placeholder="0.00"
                        />
                      </td>
                      <td className={`w-28 px-2 py-2 ${index === data.items.length - 1 ? 'rounded-br-2xl' : ''}`}>
                        <input
                          type="text"
                          value={item.amount.toFixed(2)}
                          readOnly
                          className="w-full px-3 py-1.5 bg-transparent
                            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
                            placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                            transition-all duration-200 text-center cursor-default
                            ios-optimized-input"
                          style={{
                            ...(isDarkMode ? iosCaretStyleDark : iosCaretStyle)
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 