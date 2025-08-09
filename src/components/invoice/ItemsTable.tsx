'use client';

import { useState } from 'react';
import { InvoiceData, LineItem } from '@/types/invoice';

// 高亮样式常量
const highlightClass = 'text-red-500 dark:text-red-400 font-medium';

// 基础样式定义
const tableInputClassName = `w-full px-3 py-2 rounded-xl
  bg-transparent backdrop-blur-sm
  border border-transparent
  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20
  text-[14px] leading-relaxed text-gray-800 dark:text-gray-100
  placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
  transition-all duration-300 ease-out
  hover:bg-[#007AFF]/5 dark:hover:bg-[#0A84FF]/5
  text-center whitespace-pre-wrap
  ios-optimized-input`;

const numberInputClassName = `${tableInputClassName}
  [appearance:textfield] 
  [&::-webkit-outer-spin-button]:appearance-none 
  [&::-webkit-inner-spin-button]:appearance-none
  text-center`;

// 默认单位列表
const defaultUnits = ['pc', 'set', 'length'];

interface ItemsTableProps {
  invoiceData: InvoiceData;
  setInvoiceData: React.Dispatch<React.SetStateAction<InvoiceData>>;
  updateLineItem: (index: number, field: keyof LineItem, value: string | number) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, rowIndex: number, column: string) => void;
  handleDoubleClick: (index: number, field: keyof Exclude<LineItem['highlight'], undefined>) => void;
  handleOtherFeeDoubleClick: (index: number, field: 'description' | 'amount') => void;
  customUnits: string[];
}

export default function ItemsTable({
  invoiceData,
  setInvoiceData,
  updateLineItem,
  handleKeyDown,
  handleDoubleClick,
  handleOtherFeeDoubleClick,
  customUnits
}: ItemsTableProps) {
  // 编辑状态变量
  const [editingQuantityIndex, setEditingQuantityIndex] = useState<number | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string>('');
  const [editingUnitPriceIndex, setEditingUnitPriceIndex] = useState<number | null>(null);
  const [editingUnitPrice, setEditingUnitPrice] = useState<string>('');
  const [editingFeeIndex, setEditingFeeIndex] = useState<number | null>(null);
  const [editingFeeAmount, setEditingFeeAmount] = useState<string>('');

  const _customUnits = customUnits;

  return (
    <div className="space-y-2">
      {/* 移动端卡片视图 - 中屏以下显示 */}
      <div className="block md:hidden space-y-4">
        {invoiceData.items.map((item, index) => (
          <div key={item.lineNo} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
            {/* 卡片头部 */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                Item #{index + 1}
              </div>
              <button
                onClick={() => {
                  setInvoiceData(prev => ({
                    ...prev,
                    items: prev.items
                      .filter((_, i) => i !== index)
                      .map((item, i) => ({
                        ...item,
                        lineNo: i + 1
                      }))
                  }));
                }}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="删除此项"
              >
                ×
              </button>
            </div>

            {/* 卡片内容 */}
            <div className="grid grid-cols-1 gap-4">
              {/* HS Code */}
              {invoiceData.showHsCode && (
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">HS Code</label>
                  <input
                    type="text"
                    value={item.hsCode}
                    onChange={e => updateLineItem(index, 'hsCode', e.target.value)}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                      ios-optimized-input ${item.highlight?.hsCode ? highlightClass : ''}`}
                    placeholder="Enter HS Code..."
                  />
                </div>
              )}

              {/* Part Name */}
              <div>
                <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Part Name</label>
                <textarea
                  value={item.partname}
                  onChange={e => updateLineItem(index, 'partname', e.target.value)}
                  className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                    focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                    text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                    ios-optimized-input resize-y overflow-hidden whitespace-pre-wrap ${item.highlight?.partname ? highlightClass : ''}`}
                  style={{ height: '28px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = '28px';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                  placeholder="Enter part name..."
                />
              </div>

              {/* Description */}
              {invoiceData.showDescription && (
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Description</label>
                  <textarea
                    value={item.description}
                    onChange={e => updateLineItem(index, 'description', e.target.value)}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                      ios-optimized-input resize-y overflow-hidden whitespace-pre-wrap ${item.highlight?.description ? highlightClass : ''}`}
                    style={{ height: '28px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = '28px';
                      target.style.height = `${target.scrollHeight}px`;
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
                    value={editingQuantityIndex === index ? editingQuantity : (item.quantity === 0 ? '' : item.quantity.toString())}
                    onChange={e => {
                      const inputValue = e.target.value;
                      if (/^\d*$/.test(inputValue)) {
                        setEditingQuantity(inputValue);
                        const value = parseInt(inputValue);
                        if (!isNaN(value) || inputValue === '') {
                          updateLineItem(index, 'quantity', value || 0);
                        }
                      }
                    }}
                    onFocus={(e) => {
                      setEditingQuantityIndex(index);
                      setEditingQuantity(item.quantity === 0 ? '' : item.quantity.toString());
                      e.target.select();
                    }}
                    onBlur={() => {
                      setEditingQuantityIndex(null);
                      setEditingQuantity('');
                    }}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                      ios-optimized-input ${item.highlight?.quantity ? highlightClass : ''}`}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Unit</label>
                  <select
                    value={item.unit || 'pc'}
                    onChange={e => {
                      updateLineItem(index, 'unit', e.target.value);
                    }}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center cursor-pointer
                      appearance-none ios-optimized-input ${item.highlight?.unit ? highlightClass : ''}`}
                  >
                    <option value="pc">pc{item.quantity > 1 ? 's' : ''}</option>
                    <option value="set">set{item.quantity > 1 ? 's' : ''}</option>
                    <option value="length">length{item.quantity > 1 ? 's' : ''}</option>
                    {_customUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
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
                    value={editingUnitPriceIndex === index ? editingUnitPrice : item.unitPrice.toFixed(2)}
                    onChange={e => {
                      const inputValue = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(inputValue) || inputValue === '') {
                        setEditingUnitPrice(inputValue);
                        const value = parseFloat(inputValue);
                        if (!isNaN(value)) {
                          updateLineItem(index, 'unitPrice', value);
                        }
                      }
                    }}
                    onFocus={(e) => {
                      setEditingUnitPriceIndex(index);
                      setEditingUnitPrice(item.unitPrice === 0 ? '' : item.unitPrice.toString());
                      e.target.select();
                    }}
                    onBlur={() => {
                      setEditingUnitPriceIndex(null);
                      setEditingUnitPrice('');
                    }}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                      ios-optimized-input ${item.highlight?.unitPrice ? highlightClass : ''}`}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Amount</label>
                  <input
                    type="text"
                    value={item.amount.toFixed(2)}
                    readOnly
                    className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center cursor-default ${item.highlight?.amount ? highlightClass : ''}`}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Other Fees 卡片 - 移动端 */}
        {invoiceData.otherFees && invoiceData.otherFees.length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] px-1">
              Other Fees
            </div>
            {invoiceData.otherFees.map((fee, index) => (
              <div key={fee.id} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
                {/* 卡片头部 */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Other Fee #{index + 1}
                  </div>
                  <button
                    onClick={() => {
                      const newFees = invoiceData.otherFees?.filter(f => f.id !== fee.id) || [];
                      setInvoiceData(prev => ({ ...prev, otherFees: newFees }));
                    }}
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
                        const newFees = [...(invoiceData.otherFees || [])];
                        newFees[index] = { ...fee, description: e.target.value };
                        setInvoiceData(prev => ({ ...prev, otherFees: newFees }));
                        e.target.style.height = '28px';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                        focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                        text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                        ios-optimized-input resize-y overflow-hidden whitespace-pre-wrap ${fee.highlight?.description ? highlightClass : ''}`}
                      style={{ height: '28px' }}
                      placeholder="Enter other fee description..."
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
                          setEditingFeeAmount(inputValue);
                          const value = parseFloat(inputValue);
                          if (!isNaN(value)) {
                            const newFees = [...(invoiceData.otherFees || [])];
                            newFees[index] = { ...fee, amount: value };
                            setInvoiceData(prev => ({ ...prev, otherFees: newFees }));
                          }
                        }
                      }}
                      onFocus={(e) => {
                        setEditingFeeIndex(index);
                        setEditingFeeAmount(fee.amount === 0 ? '' : fee.amount.toString());
                        e.target.select();
                      }}
                      onBlur={() => {
                        setEditingFeeIndex(null);
                        setEditingFeeAmount('');
                      }}
                      className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                        focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                        text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center
                        ios-optimized-input ${fee.highlight?.amount ? highlightClass : ''}`}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 桌面端表格视图 - 中屏及以上显示 */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200/30 dark:border-white/10
                    bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl shadow-lg">
        <div className="min-w-[600px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#007AFF]/10 dark:border-[#0A84FF]/10
                            bg-[#007AFF]/5 dark:bg-[#0A84FF]/5">
                <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[40px]">No.</th>
                {invoiceData.showHsCode && (
                  <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[120px]">
                    HS Code
                  </th>
                )}
                <th className="py-2 px-4 text-center text-[12px] font-bold text-gray-700 dark:text-gray-300 w-[150px] md:w-[210px]">Part Name</th>
                {invoiceData.showDescription && (
                  <th className="py-2 px-4 text-center text-[12px] font-bold text-gray-700 dark:text-gray-300 flex-1">Description</th>
                )}
                <th className="py-2 px-4 text-center text-[12px] font-bold text-gray-700 dark:text-gray-300 w-[100px]">Q&apos;TY</th>
                <th className="py-2 px-4 text-center text-[12px] font-bold text-gray-700 dark:text-gray-300 w-[100px]">Unit</th>
                <th className="py-2 px-4 text-center text-[12px] font-bold text-gray-700 dark:text-gray-300 w-[130px]">U/Price</th>
                <th className="py-2 px-4 text-center text-[12px] font-bold text-gray-700 dark:text-gray-300 w-[150px]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item, index) => (
                <tr key={item.lineNo} 
                    className="border-b border-[#007AFF]/10 dark:border-[#0A84FF]/10 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="py-1 px-1 text-sm">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full 
                                   hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors"
                          onClick={() => {
                            setInvoiceData(prev => ({
                              ...prev,
                              items: prev.items
                                .filter((_, i) => i !== index)
                                .map((item, i) => ({
                                  ...item,
                                  lineNo: i + 1
                                }))
                            }));
                          }}
                          title="Click to delete"
                    >
                      {item.lineNo}
                    </span>
                  </td>
                  {invoiceData.showHsCode && (
                    <td className="py-1.5 px-1">
                      <input
                        type="text"
                        value={item.hsCode}
                        onChange={e => updateLineItem(index, 'hsCode', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'hsCode')}
                        onDoubleClick={() => handleDoubleClick(index, 'hsCode')}
                        data-row={index}
                        data-column="hsCode"
                        className={`${tableInputClassName} ${item.highlight?.hsCode ? highlightClass : ''}`}
                        placeholder="HS Code"
                      />
                    </td>
                  )}
                  <td className="py-1.5 px-1">
                    <textarea
                      value={item.partname}
                      onChange={e => updateLineItem(index, 'partname', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'partname')}
                      onDoubleClick={() => handleDoubleClick(index, 'partname')}
                      data-row={index}
                      data-column="partname"
                      rows={1}
                      className={`${item.highlight?.partname ? highlightClass : ''}
                        w-full
                        resize-none
                        text-center
                        py-2 px-3
                        border border-transparent
                        rounded-lg
                        transition-colors
                        hover:bg-gray-50 dark:hover:bg-gray-800
                        hover:border-[#007AFF]/50 dark:hover:border-[#0A84FF]/50
                        focus:bg-gray-50 dark:focus:bg-gray-800
                        focus:border-[#007AFF]/50 dark:focus:border-[#0A84FF]/50
                        focus:ring-0 focus:outline-none
                        bg-transparent
                        placeholder:text-gray-300 dark:placeholder:text-gray-600
                        text-[13px] leading-[15px]
                        whitespace-pre-wrap
                        overflow-y-hidden
                      `}
                      placeholder="Part Name"
                      style={{ 
                        height: 'auto',
                        minHeight: '41px'
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                    />
                  </td>
                  {invoiceData.showDescription && (
                    <td className="py-1 px-1">
                      <textarea
                        value={item.description}
                        onChange={e => updateLineItem(index, 'description', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                        onDoubleClick={() => handleDoubleClick(index, 'description')}
                        data-row={index}
                        data-column="description"
                        rows={1}
                        className={`${item.highlight?.description ? highlightClass : ''}
                          w-full
                          resize-none
                          text-center
                          py-2 px-3
                          border border-transparent
                          rounded-lg
                          transition-colors
                          hover:bg-gray-50 dark:hover:bg-gray-800
                          hover:border-[#007AFF]/50 dark:hover:border-[#0A84FF]/50
                          focus:bg-gray-50 dark:focus:bg-gray-800
                          focus:border-[#007AFF]/50 dark:focus:border-[#0A84FF]/50
                          focus:ring-0 focus:outline-none
                          bg-transparent
                          placeholder:text-gray-300 dark:placeholder:text-gray-600
                          text-[13px] leading-[15px]
                          whitespace-pre-wrap
                          overflow-y-hidden
                        `}
                        placeholder="Enter description"
                        style={{ 
                          height: 'auto',
                          minHeight: '41px'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                      />
                    </td>
                  )}
                  <td className="py-1.5 px-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editingQuantityIndex === index ? editingQuantity : item.quantity.toString()}
                      onChange={e => {
                        const inputValue = e.target.value;
                        if (/^\d*$/.test(inputValue)) {
                          setEditingQuantity(inputValue);
                          const value = parseInt(inputValue);
                          if (!isNaN(value) || inputValue === '') {
                            updateLineItem(index, 'quantity', value || 0);
                          }
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                      onDoubleClick={() => handleDoubleClick(index, 'quantity')}
                      data-row={index}
                      data-column="quantity"
                      onFocus={(e) => {
                        setEditingQuantityIndex(index);
                        setEditingQuantity(item.quantity === 0 ? '' : item.quantity.toString());
                        e.target.select();
                      }}
                      onBlur={() => {
                        setEditingQuantityIndex(null);
                        setEditingQuantity('');
                      }}
                      className={`${numberInputClassName} ${item.highlight?.quantity ? highlightClass : ''}`}
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <select
                      value={item.unit || 'pc'}
                      onChange={e => {
                        updateLineItem(index, 'unit', e.target.value);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, index, 'unit')}
                      onDoubleClick={() => handleDoubleClick(index, 'unit')}
                      data-row={index}
                      data-column="unit"
                      className={`${tableInputClassName} appearance-none ${item.highlight?.unit ? highlightClass : ''}`}
                    >
                      <option value="pc">pc{item.quantity > 1 ? 's' : ''}</option>
                      <option value="set">set{item.quantity > 1 ? 's' : ''}</option>
                      <option value="length">length{item.quantity > 1 ? 's' : ''}</option>
                      {_customUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 px-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editingUnitPriceIndex === index ? editingUnitPrice : item.unitPrice.toFixed(2)}
                      onChange={e => {
                        const inputValue = e.target.value;
                        if (/^\d*\.?\d{0,2}$/.test(inputValue) || inputValue === '') {
                          setEditingUnitPrice(inputValue);
                          const value = parseFloat(inputValue);
                          if (!isNaN(value)) {
                            updateLineItem(index, 'unitPrice', value);
                          }
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, index, 'unitPrice')}
                      onDoubleClick={() => handleDoubleClick(index, 'unitPrice')}
                      data-row={index}
                      data-column="unitPrice"
                      onFocus={(e) => {
                        setEditingUnitPriceIndex(index);
                        setEditingUnitPrice(item.unitPrice === 0 ? '' : item.unitPrice.toString());
                        e.target.select();
                      }}
                      onBlur={() => {
                        setEditingUnitPriceIndex(null);
                        setEditingUnitPrice('');
                      }}
                      className={`${numberInputClassName} ${item.highlight?.unitPrice ? highlightClass : ''}`}
                    />
                  </td>
                  <td className="py-1 px-1">
                    <input
                      type="text"
                      value={item.amount.toFixed(2)}
                      readOnly
                      onDoubleClick={() => handleDoubleClick(index, 'amount')}
                      className={`${numberInputClassName} ${item.highlight?.amount ? highlightClass : ''}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Other Fees 区域 */}
          {invoiceData.otherFees && invoiceData.otherFees.length > 0 && (
            <div className="border-t border-[#007AFF]/10 dark:border-[#0A84FF]/10">
              {invoiceData.otherFees.map((fee, index) => (
                <div key={fee.id} 
                     className={`flex items-center ${
                       index % 2 === 0 ? 'bg-[#007AFF]/[0.02] dark:bg-[#0A84FF]/[0.02]' : ''
                     }`}>
                  <div className="w-[40px] px-4">
                    <span 
                      className="flex items-center justify-center w-6 h-6 rounded-full mx-auto
                                text-xs text-[#86868B] hover:bg-red-500/10 hover:text-red-500 
                                cursor-pointer transition-all duration-200"
                      onClick={() => {
                        const newFees = invoiceData.otherFees?.filter(f => f.id !== fee.id) || [];
                        setInvoiceData(prev => ({ ...prev, otherFees: newFees }));
                      }}
                      title="Click to delete"
                    >
                      ×
                    </span>
                  </div>
                  <div className="flex-1 px-4">
                    <textarea
                      value={fee.description}
                      onChange={(e) => {
                        const newFees = [...(invoiceData.otherFees || [])];
                        newFees[index] = { ...fee, description: e.target.value };
                        setInvoiceData(prev => ({ ...prev, otherFees: newFees }));
                        // 自动调整高度
                        e.target.style.height = '28px';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onDoubleClick={() => handleOtherFeeDoubleClick(index, 'description')}
                      placeholder="Other Fee"
                      className={`${tableInputClassName} text-center whitespace-pre-wrap resize-y overflow-hidden ${fee.highlight?.description ? highlightClass : ''}`}
                      style={{ height: '28px' }}
                    />
                  </div>
                  <div className="w-[160px] px-4">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editingFeeIndex === index ? editingFeeAmount : fee.amount.toFixed(2)}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^-?\d*\.?\d{0,2}$/.test(value) || value === '' || value === '-') {
                          setEditingFeeAmount(value);
                          const newFees = [...(invoiceData.otherFees || [])];
                          newFees[index] = { ...fee, amount: value === '' || value === '-' ? 0 : parseFloat(value) || 0 };
                          setInvoiceData(prev => ({ ...prev, otherFees: newFees }));
                        }
                      }}
                      onDoubleClick={() => handleOtherFeeDoubleClick(index, 'amount')}
                      onFocus={(e) => {
                        setEditingFeeIndex(index);
                        setEditingFeeAmount(fee.amount === 0 ? '' : fee.amount.toString());
                        e.target.select();
                      }}
                      onBlur={() => {
                        setEditingFeeIndex(null);
                        setEditingFeeAmount('');
                      }}
                      placeholder="0.00"
                      className={`${numberInputClassName} ${fee.highlight?.amount ? highlightClass : ''}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 