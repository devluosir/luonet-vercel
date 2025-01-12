import type { QuotationData } from '@/types/quotation';
import { useState } from 'react';

interface SettingsPanelProps {
  data: QuotationData;
  onChange: (data: QuotationData) => void;
  activeTab: 'quotation' | 'confirmation';
}

const settingsPanelClassName = `bg-[#007AFF]/5 dark:bg-[#0A84FF]/5 backdrop-blur-xl
  border border-[#007AFF]/10 dark:border-[#0A84FF]/10
  rounded-2xl overflow-hidden
  shadow-lg shadow-[#007AFF]/5 dark:shadow-[#0A84FF]/5
  p-4`;

const inputClassName = `w-full px-4 py-2.5 rounded-xl
  bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-lg
  border border-gray-200/30 dark:border-[#2c2c2e]/50
  focus:outline-none focus:ring-2 
  focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
  hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
  text-[15px] leading-relaxed
  text-gray-800 dark:text-gray-200
  placeholder:text-gray-400/60 dark:placeholder:text-gray-500/40
  transition-all duration-300`;

const radioGroupClassName = `flex p-1 gap-2
  bg-gray-100/50 dark:bg-gray-900/50 
  rounded-lg
  border border-gray-200/50 dark:border-gray-700/50`;

const radioButtonClassName = `flex items-center justify-center px-3 py-1.5
  rounded-lg
  text-xs font-medium
  transition-all duration-200
  cursor-pointer
  min-w-[36px]
  border border-transparent
  hover:shadow-md
  active:scale-[0.97]`;

const radioButtonActiveClassName = `bg-white dark:bg-[#1c1c1e] 
  text-[#007AFF] dark:text-[#0A84FF]
  shadow-md
  border-gray-200/50 dark:border-gray-700/50`;

export function SettingsPanel({ data, onChange, activeTab }: SettingsPanelProps) {
  const [showTableSettings, setShowTableSettings] = useState(false);
  const [customUnit, setCustomUnit] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddCustomUnit = () => {
    if (customUnit && !(data.customUnits || []).includes(customUnit)) {
      onChange({
        ...data,
        customUnits: [...(data.customUnits || []), customUnit]
      });
      setCustomUnit('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const renderCustomUnitInput = () => (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type="text"
          value={customUnit}
          onChange={e => setCustomUnit(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustomUnit();
            }
          }}
          placeholder="Add custom unit"
          className="w-32 px-3 py-1.5 rounded-lg
            bg-white/90 dark:bg-[#1c1c1e]/90
            border border-gray-200/30 dark:border-[#2c2c2e]/50
            focus:outline-none focus:ring-2
            focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
            text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
            placeholder:text-[#86868B]"
        />
        {showSuccess && (
          <div className="absolute left-0 right-0 -bottom-6 text-center text-xs text-green-500 dark:text-green-400
            animate-[fadeIn_0.2s_ease-in,fadeOut_0.2s_ease-out_1.8s]">
            Unit added successfully
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleAddCustomUnit}
        className="px-3 py-1.5 rounded-lg
          bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
          hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
          text-[#007AFF] dark:text-[#0A84FF]
          text-[13px] font-medium"
      >
        Add
      </button>
    </div>
  );

  const renderCustomUnits = () => (data.customUnits || []).length > 0 && (
    <div className="flex flex-wrap gap-2 mt-2">
      {(data.customUnits || []).map((unit, index) => (
        <div
          key={index}
          className="flex items-center gap-1 px-2 py-1 rounded-lg
            bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
            text-[#007AFF] dark:text-[#0A84FF]
            text-[13px]"
        >
          <span>{unit}</span>
          <button
            type="button"
            onClick={() => {
              const newUnits = (data.customUnits || []).filter((_, i) => i !== index);
              onChange({
                ...data,
                customUnits: newUnits
              });
            }}
            className="ml-1 w-4 h-4 flex items-center justify-center
              hover:bg-[#007AFF]/20 dark:hover:bg-[#0A84FF]/20
              rounded-full"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className={settingsPanelClassName}>
      {/* 小屏布局 */}
      <div className="flex flex-col gap-4 sm:hidden">
        {/* 第一行：日期和币种 */}
        <div className="flex items-center justify-center gap-4">
          <input
            type="date"
            value={data.date}
            onChange={e => onChange({ ...data, date: e.target.value })}
            className={`${inputClassName} w-[130px]`}
          />
           {/* 币种选择 */}
           <div className={`${radioGroupClassName} h-[38px] w-[120px]`}>
            <label
              className={`${radioButtonClassName} ${
                data.currency === 'USD' ? radioButtonActiveClassName : 
                'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-[#1c1c1e]/60'
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="USD"
                checked={data.currency === 'USD'}
                onChange={e => onChange({ ...data, currency: e.target.value as 'USD' | 'EUR' | 'CNY' })}
                className="sr-only"
              />
              <span>$</span>
            </label>
            <label
              className={`${radioButtonClassName} ${
                data.currency === 'EUR' ? radioButtonActiveClassName : 
                'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-[#1c1c1e]/60'
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="EUR"
                checked={data.currency === 'EUR'}
                onChange={e => onChange({ ...data, currency: e.target.value as 'USD' | 'EUR' | 'CNY' })}
                className="sr-only"
              />
              <span>€</span>
            </label>
            <label
              className={`${radioButtonClassName} ${
                data.currency === 'CNY' ? radioButtonActiveClassName : 
                'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-[#1c1c1e]/60'
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="CNY"
                checked={data.currency === 'CNY'}
                onChange={e => onChange({ ...data, currency: e.target.value as 'USD' | 'EUR' | 'CNY' })}
                className="sr-only"
              />
              <span>¥</span>
            </label>
          </div>
        </div>

        {/* 第二行：Bank复选框和币种选择 */}
        <div className="flex items-center justify-center gap-4">
                {/* HK Stamp复选框 */}
                {activeTab === 'confirmation' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.showStamp}
                      onChange={e => onChange({ ...data, showStamp: e.target.checked })}
                      className="w-3.5 h-3.5 rounded 
                        border-gray-300 dark:border-gray-600
                        text-[#007AFF] dark:text-[#0A84FF]
                        focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                        cursor-pointer"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      HK Stamp
                    </span>
                  </label>
                )}

          {/* Bank复选框 */}
          {activeTab === 'confirmation' && (
            <label className="flex items-center gap-2 cursor-pointer h-[38px] px-4 shrink-0">
              <input
                type="checkbox"
                checked={data.showBank}
                onChange={e => onChange({ ...data, showBank: e.target.checked })}
                className="w-3.5 h-3.5 rounded 
                  border-gray-300 dark:border-gray-600
                  text-[#007AFF] dark:text-[#0A84FF]
                  focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                  cursor-pointer"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Bank
              </span>
            </label>
          )}

          {/* 表格设置按钮 */}
          <button
            type="button"
            onClick={() => setShowTableSettings(!showTableSettings)}
            className={`h-[38px] px-4 rounded-lg
              ${showTableSettings ? 'bg-[#007AFF]/10 dark:bg-[#0A84FF]/10' : 'hover:bg-[#007AFF]/5 dark:hover:bg-[#0A84FF]/5'}
              text-[#007AFF] dark:text-[#0A84FF]
              text-xs font-medium
              transition-all duration-200
              flex items-center gap-2`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="3" y1="15" x2="21" y2="15"></line>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>
            <span>Table</span>
          </button>        
        </div>

        {/* 表格设置展开面板 */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out
          ${showTableSettings ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="pt-2 pb-4 px-4 bg-[#007AFF]/5 dark:bg-[#0A84FF]/5 rounded-xl">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4">
                {/* Description复选框 */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.showDescription}
                    onChange={e => onChange({ ...data, showDescription: e.target.checked })}
                    className="w-3.5 h-3.5 rounded 
                      border-gray-300 dark:border-gray-600
                      text-[#007AFF] dark:text-[#0A84FF]
                      focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                      cursor-pointer"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Description
                  </span>
                </label>
                
                {/* Remarks复选框 */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.showRemarks}
                    onChange={e => onChange({ ...data, showRemarks: e.target.checked })}
                    className="w-3.5 h-3.5 rounded 
                      border-gray-300 dark:border-gray-600
                      text-[#007AFF] dark:text-[#0A84FF]
                      focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                      cursor-pointer"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Remarks
                  </span>
                </label>

              {/* 自定义单位输入区域 */}  
                {renderCustomUnitInput()}
                {renderCustomUnits()}
              </div>
            </div>
          </div>
        </div>

        {/* 第三行：移除原有的 HK Stamp 和 Description/Remarks 复选框组 */}
      </div>

      {/* 中屏布局 */}
      <div className="hidden sm:flex lg:hidden flex-col gap-4">
        {/* 第一行：日期和名字 */}
        <div className="flex items-center justify-center gap-4">
          <input
            type="date"
            value={data.date}
            onChange={e => onChange({ ...data, date: e.target.value })}
            className={`${inputClassName} w-[130px]`}
          />
        </div>

        {/* 第二行：Bank复选框和币种选择 */}
        <div className="flex items-center justify-center gap-4">

                {/* HK Stamp复选框 */}
                {activeTab === 'confirmation' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.showStamp}
                      onChange={e => onChange({ ...data, showStamp: e.target.checked })}
                      className="w-3.5 h-3.5 rounded 
                        border-gray-300 dark:border-gray-600
                        text-[#007AFF] dark:text-[#0A84FF]
                        focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                        cursor-pointer"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      HK Stamp
                    </span>
                  </label>
                )}
          {/* Bank复选框 */}
          {activeTab === 'confirmation' && (
            <label className="flex items-center gap-2 cursor-pointer h-[38px] px-4 shrink-0">
              <input
                type="checkbox"
                checked={data.showBank}
                onChange={e => onChange({ ...data, showBank: e.target.checked })}
                className="w-3.5 h-3.5 rounded 
                  border-gray-300 dark:border-gray-600
                  text-[#007AFF] dark:text-[#0A84FF]
                  focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                  cursor-pointer"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Bank
              </span>
            </label>
          )}
          {/* 表格设置按钮 */}
          <button
            type="button"
            onClick={() => setShowTableSettings(!showTableSettings)}
            className={`h-[38px] px-4 rounded-lg
              ${showTableSettings ? 'bg-[#007AFF]/10 dark:bg-[#0A84FF]/10' : 'hover:bg-[#007AFF]/5 dark:hover:bg-[#0A84FF]/5'}
              text-[#007AFF] dark:text-[#0A84FF]
              text-xs font-medium
              transition-all duration-200
              flex items-center gap-2`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="3" y1="15" x2="21" y2="15"></line>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>
            <span>Table</span>
          </button>
          {/* 币种选择 */}
          <div className={`${radioGroupClassName} h-[38px] w-[120px] shrink-0`}>
            <label
              className={`${radioButtonClassName} ${
                data.currency === 'USD' ? radioButtonActiveClassName : 
                'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-[#1c1c1e]/60'
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="USD"
                checked={data.currency === 'USD'}
                onChange={e => onChange({ ...data, currency: e.target.value as 'USD' | 'EUR' | 'CNY' })}
                className="sr-only"
              />
              <span>$</span>
            </label>
            <label
              className={`${radioButtonClassName} ${
                data.currency === 'EUR' ? radioButtonActiveClassName : 
                'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-[#1c1c1e]/60'
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="EUR"
                checked={data.currency === 'EUR'}
                onChange={e => onChange({ ...data, currency: e.target.value as 'USD' | 'EUR' | 'CNY' })}
                className="sr-only"
              />
              <span>€</span>
            </label>
            <label
              className={`${radioButtonClassName} ${
                data.currency === 'CNY' ? radioButtonActiveClassName : 
                'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-[#1c1c1e]/60'
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="CNY"
                checked={data.currency === 'CNY'}
                onChange={e => onChange({ ...data, currency: e.target.value as 'USD' | 'EUR' | 'CNY' })}
                className="sr-only"
              />
              <span>¥</span>
            </label>
          </div>
        </div>

        {/* 表格设置展开面板 */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out
          ${showTableSettings ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="pt-2 pb-4 px-4 bg-[#007AFF]/5 dark:bg-[#0A84FF]/5 rounded-xl">
            <div className="flex flex-col gap-4 items-center">
              <div className="flex flex-wrap gap-4">
                {/* Description复选框 */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.showDescription}
                    onChange={e => onChange({ ...data, showDescription: e.target.checked })}
                    className="w-3.5 h-3.5 rounded 
                      border-gray-300 dark:border-gray-600
                      text-[#007AFF] dark:text-[#0A84FF]
                      focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                      cursor-pointer"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Description
                  </span>
                </label>
                
                {/* Remarks复选框 */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.showRemarks}
                    onChange={e => onChange({ ...data, showRemarks: e.target.checked })}
                    className="w-3.5 h-3.5 rounded 
                      border-gray-300 dark:border-gray-600
                      text-[#007AFF] dark:text-[#0A84FF]
                      focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                      cursor-pointer"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Remarks
                  </span>
                </label>


              {/* 自定义单位输入区域 */}             
                {renderCustomUnitInput()}
                {renderCustomUnits()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 大屏布局 */}
      <div className="hidden lg:flex items-center justify-between gap-4">
        {/* 日期和名字 */}
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={data.date}
            onChange={e => onChange({ ...data, date: e.target.value })}
            className={`${inputClassName} w-[130px]`}
          />
        </div>

        {/* 控制组 */}
        <div className="flex items-center gap-4">
              {/* HK Stamp复选框 */}
              {activeTab === 'confirmation' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.showStamp}
                    onChange={e => onChange({ ...data, showStamp: e.target.checked })}
                    className="w-3.5 h-3.5 rounded 
                      border-gray-300 dark:border-gray-600
                      text-[#007AFF] dark:text-[#0A84FF]
                      focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                      cursor-pointer"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    HK Stamp
                  </span>
                </label>
              )}

          {/* Bank复选框 */}
          {activeTab === 'confirmation' && (
            <label className="flex items-center gap-2 cursor-pointer h-[38px] px-4 shrink-0">
              <input
                type="checkbox"
                checked={data.showBank}
                onChange={e => onChange({ ...data, showBank: e.target.checked })}
                className="w-3.5 h-3.5 rounded 
                  border-gray-300 dark:border-gray-600
                  text-[#007AFF] dark:text-[#0A84FF]
                  focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                  cursor-pointer"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Bank
              </span>
            </label>
          )}

          {/* 表格设置按钮 */}
          <button
            type="button"
            onClick={() => setShowTableSettings(!showTableSettings)}
            className={`h-[38px] px-4 rounded-lg
              ${showTableSettings ? 'bg-[#007AFF]/10 dark:bg-[#0A84FF]/10' : 'hover:bg-[#007AFF]/5 dark:hover:bg-[#0A84FF]/5'}
              text-[#007AFF] dark:text-[#0A84FF]
              text-xs font-medium
              transition-all duration-200
              flex items-center gap-2`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="3" y1="15" x2="21" y2="15"></line>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>
            <span>Table</span>
          </button>


          {/* 币种选择 */}
          <div className={`${radioGroupClassName} h-[38px] w-[120px] shrink-0`}>
            <label
              className={`${radioButtonClassName} ${
                data.currency === 'USD' ? radioButtonActiveClassName : 
                'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-[#1c1c1e]/60'
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="USD"
                checked={data.currency === 'USD'}
                onChange={e => onChange({ ...data, currency: e.target.value as 'USD' | 'EUR' | 'CNY' })}
                className="sr-only"
              />
              <span>$</span>
            </label>
            <label
              className={`${radioButtonClassName} ${
                data.currency === 'EUR' ? radioButtonActiveClassName : 
                'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-[#1c1c1e]/60'
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="EUR"
                checked={data.currency === 'EUR'}
                onChange={e => onChange({ ...data, currency: e.target.value as 'USD' | 'EUR' | 'CNY' })}
                className="sr-only"
              />
              <span>€</span>
            </label>
            <label
              className={`${radioButtonClassName} ${
                data.currency === 'CNY' ? radioButtonActiveClassName : 
                'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-[#1c1c1e]/60'
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="CNY"
                checked={data.currency === 'CNY'}
                onChange={e => onChange({ ...data, currency: e.target.value as 'USD' | 'EUR' | 'CNY' })}
                className="sr-only"
              />
              <span>¥</span>
            </label>
          </div>
        </div>
      </div>

      {/* 大屏布局的表格设置展开面板 */}
      <div className={`hidden lg:block overflow-hidden transition-all duration-300 ease-in-out mt-4
        ${showTableSettings ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="pt-2 pb-4 px-4 bg-[#007AFF]/5 dark:bg-[#0A84FF]/5 rounded-xl">
          <div className="flex flex-col gap-4 items-end">
            <div className="flex flex-wrap gap-4">
              {/* Description复选框 */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.showDescription}
                  onChange={e => onChange({ ...data, showDescription: e.target.checked })}
                  className="w-3.5 h-3.5 rounded 
                    border-gray-300 dark:border-gray-600
                    text-[#007AFF] dark:text-[#0A84FF]
                    focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                    cursor-pointer"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Description
                </span>
              </label>
              
              {/* Remarks复选框 */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.showRemarks}
                  onChange={e => onChange({ ...data, showRemarks: e.target.checked })}
                  className="w-3.5 h-3.5 rounded 
                    border-gray-300 dark:border-gray-600
                    text-[#007AFF] dark:text-[#0A84FF]
                    focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                    cursor-pointer"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Remarks
                </span>
              </label>



            {/* 自定义单位输入区域 */}
            {renderCustomUnitInput()}
            {renderCustomUnits()}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
} 