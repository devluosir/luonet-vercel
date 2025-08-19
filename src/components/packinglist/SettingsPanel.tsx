import React, { useState } from 'react';

interface SettingsPanelProps {
  isVisible: boolean;
  documentType: 'proforma' | 'packing' | 'both';
  dimensionUnit: string;
  headerType: 'none' | 'bilingual' | 'english';
  customUnits?: string[];
  onDocumentTypeChange: (type: 'proforma' | 'packing' | 'both') => void;
  onDimensionUnitChange: (unit: string) => void;
  onHeaderTypeChange: (type: 'none' | 'bilingual' | 'english') => void;
  onCustomUnitsChange: (units: string[]) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isVisible,
  documentType,
  dimensionUnit,
  headerType,
  customUnits = [],
  onDocumentTypeChange,
  onDimensionUnitChange,
  onHeaderTypeChange,
  onCustomUnitsChange
}) => {
  const [customUnit, setCustomUnit] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddCustomUnit = () => {
    if (customUnit && !customUnits.includes(customUnit)) {
      onCustomUnitsChange([...customUnits, customUnit]);
      setCustomUnit('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const handleRemoveCustomUnit = (index: number) => {
    const newUnits = customUnits.filter((_, i) => i !== index);
    onCustomUnitsChange(newUnits);
  };

  return (
    <div className={`overflow-hidden transition-all duration-300 ease-in-out
      ${isVisible ? 'opacity-100 px-4 sm:px-6 py-2 h-auto' : 'opacity-0 px-0 py-0 h-0'}`}>
      <div>
        
        {/* 响应式布局容器 */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          
          {/* 第一组：文档类型 */}
          <div className="flex items-center gap-1.5">
            <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Type:</span>
            <div className="flex gap-1">
              {[
                { value: 'proforma', label: 'PI' },
                { value: 'packing', label: 'PL' },
                { value: 'both', label: 'Both' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onDocumentTypeChange(option.value as any)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    documentType === option.value 
                      ? 'bg-[#007AFF] text-white shadow-sm' 
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 分隔线 - 在大屏显示 */}
          <div className="hidden md:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

          {/* 第二组：表头模板 */}
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
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    headerType === option.value
                      ? 'bg-[#007AFF] text-white shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                  }`}
                  onClick={() => onHeaderTypeChange(option.value as any)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>



          {/* 分隔线 - 在大屏显示 */}
          <div className="hidden md:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

          {/* 第三组：尺寸单位 */}
          <div className="flex items-center gap-1.5">
            <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Size Unit:</span>
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => onDimensionUnitChange('cm')}
                className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                  dimensionUnit === 'cm' 
                    ? 'bg-[#007AFF] text-white' 
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-300'
                }`}
              >
                cm
              </button>
              <button
                type="button"
                onClick={() => onDimensionUnitChange('mm')}
                className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                  dimensionUnit === 'mm' 
                    ? 'bg-[#007AFF] text-white' 
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-300'
                }`}
              >
                mm
              </button>
            </div>
          </div>

          {/* 分隔线 - 在大屏显示 */}
          <div className="hidden md:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

          {/* 换行控制：小屏和中屏换行，大屏不换行 */}
          <div className="w-full md:w-auto"></div>

          {/* 第四组：自定义单位 */}
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
            {customUnits.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {customUnits.map((unit, index) => (
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
    </div>
  );
}; 