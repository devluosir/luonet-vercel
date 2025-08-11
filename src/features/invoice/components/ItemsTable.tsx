'use client';

import React from 'react';
import { useInvoiceStore } from '../state/invoice.store';
import { LineItem, OtherFee } from '../types';
import { INPUT_CLASSNAMES, HIGHLIGHT_CLASS } from '../constants/settings';
import { handleTableKeyDown } from '../utils/keyboardNavigation';

// 默认单位列表
const DEFAULT_UNITS = ['pc', 'set', 'length'];

/**
 * 完全集成的发票商品表格组件
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

  // 处理其他费用描述变化
  const handleOtherFeeDescriptionChange = (id: number, value: string) => {
    updateOtherFee(id, 'description', value);
  };

  // 获取所有可用单位
  const getAllUnits = () => {
    return [...DEFAULT_UNITS, ...(data.customUnits || [])];
  };

  return (
    <div className="space-y-6">
      {/* 桌面端表格视图 */}
      <div className="hidden md:block">
        <div className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">#</th>
                {data.showHsCode && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">HS Code</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">Part Name</th>
                {data.showDescription && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">Description</th>
                )}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Qty</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Unit</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Unit Price</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
              {data.items.map((item, index) => (
                <tr key={item.lineNo} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.lineNo}</td>
                  
                  {data.showHsCode && (
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.hsCode}
                        onChange={(e) => handleHsCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'hsCode')}
                        onDoubleClick={() => handleDoubleClick(index, 'hsCode')}
                        data-row={index}
                        data-column="hsCode"
                        className={`${INPUT_CLASSNAMES.table} ${item.highlight?.hsCode ? HIGHLIGHT_CLASS : ''}`}
                        placeholder="HS Code"
                      />
                    </td>
                  )}
                  
                  <td className="px-4 py-2">
                    <textarea
                      value={item.partname}
                      onChange={(e) => handlePartnameChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'partname')}
                      onDoubleClick={() => handleDoubleClick(index, 'partname')}
                      data-row={index}
                      data-column="partname"
                      className={`${INPUT_CLASSNAMES.table} ${item.highlight?.partname ? HIGHLIGHT_CLASS : ''}`}
                      placeholder="Part Name"
                      rows={1}
                      style={{ resize: 'none' }}
                    />
                  </td>
                  
                  {data.showDescription && (
                    <td className="px-4 py-2">
                      <textarea
                        value={item.description}
                        onChange={(e) => handleDescriptionChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                        onDoubleClick={() => handleDoubleClick(index, 'description')}
                        data-row={index}
                        data-column="description"
                        className={`${INPUT_CLASSNAMES.table} ${item.highlight?.description ? HIGHLIGHT_CLASS : ''}`}
                        placeholder="Description"
                        rows={1}
                        style={{ resize: 'none' }}
                      />
                    </td>
                  )}
                  
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                      onDoubleClick={() => handleDoubleClick(index, 'quantity')}
                      data-row={index}
                      data-column="quantity"
                      className={`${INPUT_CLASSNAMES.number} ${item.highlight?.quantity ? HIGHLIGHT_CLASS : ''}`}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  
                  <td className="px-4 py-2">
                    <select
                      value={item.unit}
                      onChange={(e) => handleUnitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'unit')}
                      onDoubleClick={() => handleDoubleClick(index, 'unit')}
                      data-row={index}
                      data-column="unit"
                      className={`${INPUT_CLASSNAMES.table} ${item.highlight?.unit ? HIGHLIGHT_CLASS : ''}`}
                    >
                      {getAllUnits().map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </td>
                  
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleUnitPriceChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'unitPrice')}
                      onDoubleClick={() => handleDoubleClick(index, 'unitPrice')}
                      data-row={index}
                      data-column="unitPrice"
                      className={`${INPUT_CLASSNAMES.number} ${item.highlight?.unitPrice ? HIGHLIGHT_CLASS : ''}`}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  
                  <td className="px-4 py-2">
                    <div className={`text-center text-sm font-medium ${item.highlight?.amount ? HIGHLIGHT_CLASS : ''}`}>
                      {item.amount.toFixed(2)}
                    </div>
                  </td>
                  
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                      title="删除此行"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Other Fees 桌面端表格 */}
        {data.otherFees && data.otherFees.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Other Fees</h3>
            <div className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {data.otherFees.map((fee, index) => (
                    <tr key={fee.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{index + 1}</td>
                      <td className="px-4 py-2">
                        <textarea
                          value={fee.description}
                          onChange={(e) => handleOtherFeeDescriptionChange(fee.id, e.target.value)}
                          onDoubleClick={() => handleOtherFeeDoubleClick(index, 'description')}
                          className={`${INPUT_CLASSNAMES.table} ${fee.highlight?.description ? HIGHLIGHT_CLASS : ''}`}
                          placeholder="Description"
                          rows={1}
                          style={{ resize: 'none' }}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={fee.amount}
                          onChange={(e) => handleOtherFeeAmountChange(fee.id, e.target.value)}
                          onDoubleClick={() => handleOtherFeeDoubleClick(index, 'amount')}
                          className={`${INPUT_CLASSNAMES.number} ${fee.highlight?.amount ? HIGHLIGHT_CLASS : ''}`}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeOtherFee(fee.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                          title="删除此项"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 移动端卡片视图 */}
      <div className="block md:hidden space-y-4">
        {data.items.map((item, index) => (
          <div key={item.lineNo} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
            {/* 卡片头部 */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                Item #{index + 1}
              </div>
              <button
                onClick={() => removeLineItem(index)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="删除此项"
              >
                ×
              </button>
            </div>

            {/* 卡片内容 */}
            <div className="grid grid-cols-1 gap-4">
              {/* HS Code */}
              {data.showHsCode && (
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">HS Code</label>
                  <input
                    type="text"
                    value={item.hsCode}
                    onChange={(e) => handleHsCodeChange(index, e.target.value)}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] ${item.highlight?.hsCode ? HIGHLIGHT_CLASS : ''}`}
                    placeholder="HS Code"
                  />
                </div>
              )}

              {/* Part Name */}
              <div>
                <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Part Name</label>
                <textarea
                  value={item.partname}
                  onChange={(e) => handlePartnameChange(index, e.target.value)}
                  className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                    focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                    text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] resize-y ${item.highlight?.partname ? HIGHLIGHT_CLASS : ''}`}
                  placeholder="Part Name"
                  rows={2}
                />
              </div>

              {/* Description */}
              {data.showDescription && (
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Description</label>
                  <textarea
                    value={item.description}
                    onChange={(e) => handleDescriptionChange(index, e.target.value)}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] resize-y ${item.highlight?.description ? HIGHLIGHT_CLASS : ''}`}
                    placeholder="Description"
                    rows={2}
                  />
                </div>
              )}

              {/* 数量、单位和单价 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Qty</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center ${item.highlight?.quantity ? HIGHLIGHT_CLASS : ''}`}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Unit</label>
                  <select
                    value={item.unit}
                    onChange={(e) => handleUnitChange(index, e.target.value)}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center ${item.highlight?.unit ? HIGHLIGHT_CLASS : ''}`}
                  >
                    {getAllUnits().map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Unit Price</label>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => handleUnitPriceChange(index, e.target.value)}
                    className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                      focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                      text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center ${item.highlight?.unitPrice ? HIGHLIGHT_CLASS : ''}`}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* 金额 */}
              <div>
                <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Amount</label>
                <div className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                  text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center cursor-default ${item.highlight?.amount ? HIGHLIGHT_CLASS : ''}`}>
                  {item.amount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Other Fees 移动端卡片 */}
        {data.otherFees && data.otherFees.length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] px-1">
              Other Fees
            </div>
            {data.otherFees.map((fee, index) => (
              <div key={fee.id} className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 shadow-sm">
                {/* 卡片头部 */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Other Fee #{index + 1}
                  </div>
                  <button
                    onClick={() => removeOtherFee(fee.id)}
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
                      onChange={(e) => handleOtherFeeDescriptionChange(fee.id, e.target.value)}
                      className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                        focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                        text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] resize-y ${fee.highlight?.description ? HIGHLIGHT_CLASS : ''}`}
                      placeholder="Description"
                      rows={2}
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Amount</label>
                    <input
                      type="number"
                      value={fee.amount}
                      onChange={(e) => handleOtherFeeAmountChange(fee.id, e.target.value)}
                      className={`w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                        focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
                        text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] text-center ${fee.highlight?.amount ? HIGHLIGHT_CLASS : ''}`}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
