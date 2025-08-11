'use client';

import React from 'react';
import { useInvoiceStore } from '../state/invoice.store';
import { 
  CURRENCY_OPTIONS, 
  HEADER_TYPE_OPTIONS, 
  INVOICE_TYPE_OPTIONS, 
  STAMP_TYPE_OPTIONS,
  DISPLAY_OPTIONS 
} from '../constants/settings';

/**
 * 发票设置面板组件
 */
export const SettingsPanel = React.memo(() => {
  const {
    data,
    updateData,
    customUnit,
    showUnitSuccess,
    addCustomUnit,
    removeCustomUnit,
    setCustomUnit
  } = useInvoiceStore();

  const handleCurrencyChange = (currency: 'USD' | 'CNY') => {
    updateData({ currency });
  };

  const handleHeaderTypeChange = (headerType: 'none' | 'bilingual' | 'english') => {
    updateData({
      templateConfig: { ...data.templateConfig, headerType }
    });
  };

  const handleInvoiceTypeChange = (invoiceType: 'invoice' | 'commercial' | 'proforma') => {
    updateData({
      templateConfig: { ...data.templateConfig, invoiceType }
    });
  };

  const handleStampTypeChange = (stampType: 'none' | 'shanghai' | 'hongkong') => {
    updateData({
      templateConfig: { ...data.templateConfig, stampType }
    });
  };

  const handleDisplayOptionChange = (option: keyof Pick<typeof data, 'showBank' | 'showHsCode' | 'showDescription'>, value: boolean) => {
    updateData({ [option]: value });
  };

  const handleCustomUnitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomUnit(e.target.value);
  };

  const handleAddCustomUnit = () => {
    if (customUnit && !(data.customUnits || []).includes(customUnit)) {
      addCustomUnit(customUnit);
    }
  };

  const handleCustomUnitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomUnit();
    }
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-3 shadow-sm">
      {/* 响应式布局容器 */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        
        {/* 第一组：币种 */}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Currency:</span>
          <div className="flex gap-1">
            {CURRENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleCurrencyChange(option.value)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  data.currency === option.value 
                    ? 'bg-[#007AFF] text-white shadow-sm' 
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="hidden lg:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

        {/* 第二组：Header */}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Header:</span>
          <div className="flex gap-1">
            {HEADER_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleHeaderTypeChange(option.value)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  data.templateConfig.headerType === option.value 
                    ? 'bg-[#007AFF] text-white shadow-sm' 
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="hidden lg:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

        {/* 第三组：Type */}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Type:</span>
          <div className="flex gap-1">
            {INVOICE_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleInvoiceTypeChange(option.value)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  data.templateConfig.invoiceType === option.value 
                    ? 'bg-[#007AFF] text-white shadow-sm' 
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="hidden lg:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

        {/* 第四组：Stamp */}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Stamp:</span>
          <div className="flex gap-1">
            {STAMP_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleStampTypeChange(option.value)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  data.templateConfig.stampType === option.value 
                    ? 'bg-[#007AFF] text-white shadow-sm' 
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="hidden lg:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

        {/* 第五组：显示选项 */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Show:</span>
          
          {DISPLAY_OPTIONS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-1 cursor-pointer p-1 -m-1 rounded min-h-[32px] touch-manipulation">
              <input
                type="checkbox"
                checked={data[key]}
                onChange={e => handleDisplayOptionChange(key, e.target.checked)}
                className="w-4 h-4 sm:w-3 sm:h-3 flex-shrink-0 appearance-none border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 
                  checked:bg-[#007AFF] checked:border-[#007AFF] checked:dark:bg-[#0A84FF] checked:dark:border-[#0A84FF]
                  focus:ring-2 focus:ring-[#007AFF]/30 focus:ring-offset-1
                  relative before:content-[''] before:absolute before:top-0.5 before:left-1 before:w-1 before:h-2 
                  before:border-r-2 before:border-b-2 before:border-white before:rotate-45 before:scale-0 
                  checked:before:scale-100 before:transition-transform before:duration-200"
                style={{
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              />
              <span className="text-gray-700 dark:text-gray-300 text-[11px] font-medium">{label}</span>
            </label>
          ))}
        </div>

        {/* 分隔线 */}
        <div className="hidden lg:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

        {/* 第六组：自定义单位 */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Units:</span>
          
          {/* 自定义单位输入 */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={customUnit}
                onChange={handleCustomUnitChange}
                onKeyDown={handleCustomUnitKeyDown}
                placeholder="Add custom unit"
                className="w-24 px-2 py-1 rounded text-[9px]
                  bg-white/90 dark:bg-[#1c1c1e]/90
                  border border-gray-200/30 dark:border-[#2c2c2e]/50
                  focus:outline-none focus:ring-1
                  focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                  text-gray-800 dark:text-gray-200
                  placeholder:text-gray-400 placeholder:text-[9px]"
              />
              {showUnitSuccess && (
                <div className="absolute left-0 right-0 -bottom-5 text-center text-[9px] text-green-500 dark:text-green-400
                  animate-[fadeIn_0.2s_ease-in,fadeOut_0.2s_ease-out_1.8s]">
                  Added
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddCustomUnit}
              className="px-2 py-1 rounded text-[9px] font-medium
                bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                text-[#007AFF] dark:text-[#0A84FF]"
            >
              +
            </button>
          </div>

          {/* 已添加的自定义单位 */}
          {(data.customUnits || []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(data.customUnits || []).map((unit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded
                    bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                    text-[#007AFF] dark:text-[#0A84FF]
                    text-[9px]"
                >
                  <span>{unit}</span>
                  <button
                    type="button"
                    onClick={() => removeCustomUnit(index)}
                    className="w-3 h-3 flex items-center justify-center
                      hover:bg-[#007AFF]/20 dark:hover:bg-[#0A84FF]/20
                      rounded-full text-[8px]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
