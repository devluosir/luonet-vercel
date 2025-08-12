import type { QuotationData } from '@/types/quotation';
import { getDefaultNotes } from '@/utils/getDefaultNotes';
import { useState } from 'react';

interface SettingsPanelProps {
  data: QuotationData;
  onChange: (data: QuotationData) => void;
  activeTab: 'quotation' | 'confirmation';
}

export function SettingsPanel({ data, onChange, activeTab }: SettingsPanelProps) {
  const [customUnit, setCustomUnit] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // 动态处理From选项
  const fromOptions = ['Roger', 'Sharon', 'Emily', 'Summer', 'Nina'];
  // 大小写不敏感的重复检查
  if (data.from && !fromOptions.some(option => option.toLowerCase() === data.from.toLowerCase())) {
    fromOptions.unshift(data.from);
  }

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

  const handleRemoveCustomUnit = (index: number) => {
    const newUnits = (data.customUnits || []).filter((_, i) => i !== index);
    onChange({
      ...data,
      customUnits: newUnits
    });
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-3 shadow-sm">
      
      {/* 响应式布局容器 */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        
        {/* 第一组：来源 */}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">From:</span>
          <select
            value={data.from}
            onChange={(e) => {
              const newValue = e.target.value;
              onChange({
                ...data,
                from: newValue,
                notes: getDefaultNotes(newValue, activeTab)
              });
            }}
            className="px-2 py-1 rounded text-[11px] font-medium
              bg-white/90 dark:bg-[#1c1c1e]/90
              border border-gray-200/30 dark:border-[#2c2c2e]/50
              focus:outline-none focus:ring-1
              focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
              text-gray-800 dark:text-gray-200"
          >
            {fromOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* 分隔线 */}
        <div className="hidden md:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

        {/* 第二组：币种 */}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Currency:</span>
          <div className="flex gap-1">
            {[
              { value: 'USD', label: '$' },
              { value: 'EUR', label: '€' },
              { value: 'CNY', label: '¥' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...data, currency: option.value as 'USD' | 'EUR' | 'CNY' })}
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
        <div className="hidden md:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

        {/* 第三组：Header */}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Header:</span>
          <div className="flex gap-1">
            {[
              { value: 'none', label: 'None' },
              { value: 'bilingual', label: 'CN+EN' },
              { value: 'english', label: 'EN' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({
                  ...data,
                  templateConfig: {
                    ...data.templateConfig,
                    headerType: option.value as 'none' | 'bilingual' | 'english'
                  }
                })}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  data.templateConfig?.headerType === option.value 
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
        <div className="hidden md:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

        {/* 换行控制：小屏换行，中屏不换行 */}
        <div className="w-full sm:w-auto"></div>





        {/* 第五组：自定义单位 */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Units:</span>
          
          {/* 自定义单位输入 */}
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
                className="w-24 px-2 py-1 rounded text-[9px]
                  bg-white/90 dark:bg-[#1c1c1e]/90
                  border border-gray-200/30 dark:border-[#2c2c2e]/50
                  focus:outline-none focus:ring-1
                  focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                  text-gray-800 dark:text-gray-200
                  placeholder:text-gray-400 placeholder:text-[9px]"
                style={{ caretColor: '#007AFF' }}
              />
              {showSuccess && (
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
                    onClick={() => handleRemoveCustomUnit(index)}
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
}

// 性能调试标记（开发模式下可启用）
if (process.env.NODE_ENV === 'development') {
  // SettingsPanel.whyDidYouRender = true;
} 