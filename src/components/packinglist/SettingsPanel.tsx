import React from 'react';

interface SettingsPanelProps {
  isVisible: boolean;
  documentType: 'proforma' | 'packing' | 'both';
  showHsCode: boolean;
  showDimensions: boolean;
  showWeightAndPackage: boolean;
  showPrice: boolean;
  dimensionUnit: string;
  currency: string;
  headerType: 'none' | 'bilingual' | 'english';
  onDocumentTypeChange: (type: 'proforma' | 'packing' | 'both') => void;
  onToggleHsCode: (show: boolean) => void;
  onToggleDimensions: (show: boolean) => void;
  onToggleWeightAndPackage: (show: boolean) => void;
  onTogglePrice: (show: boolean) => void;
  onDimensionUnitChange: (unit: string) => void;
  onCurrencyChange: (currency: string) => void;
  onHeaderTypeChange: (type: 'none' | 'bilingual' | 'english') => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isVisible,
  documentType,
  showHsCode,
  showDimensions,
  showWeightAndPackage,
  showPrice,
  dimensionUnit,
  currency,
  headerType,
  onDocumentTypeChange,
  onToggleHsCode,
  onToggleDimensions,
  onToggleWeightAndPackage,
  onTogglePrice,
  onDimensionUnitChange,
  onCurrencyChange,
  onHeaderTypeChange
}) => {
  return (
    <div className={`overflow-hidden transition-all duration-300 ease-in-out
      ${isVisible ? 'opacity-100 px-4 sm:px-6 py-2 h-auto' : 'opacity-0 px-0 py-0 h-0'}`}>
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-3 shadow-sm">
        
        {/* 紧凑的全部设置 - 单行布局 */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          
          {/* 文档类型 */}
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

          {/* 分隔线 */}
          <div className="h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

          {/* 表头模板 */}
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

          {/* 分隔线 */}
          <div className="h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

          {/* 显示选项 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Show:</span>
            
            {/* HS Code */}
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showHsCode}
                onChange={(e) => onToggleHsCode(e.target.checked)}
                className="w-3 h-3 text-[#007AFF] bg-white border-gray-300 rounded focus:ring-[#007AFF] focus:ring-1"
              />
              <span className="text-gray-700 dark:text-gray-300 text-[11px] font-medium">HS</span>
            </label>
            
            {/* Weight & Package */}
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showWeightAndPackage}
                onChange={(e) => onToggleWeightAndPackage(e.target.checked)}
                className="w-3 h-3 text-[#007AFF] bg-white border-gray-300 rounded focus:ring-[#007AFF] focus:ring-1"
              />
              <span className="text-gray-700 dark:text-gray-300 text-[11px] font-medium">Weight</span>
            </label>
            
            {/* Dimensions */}
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={showDimensions}
                onChange={(e) => onToggleDimensions(e.target.checked)}
                className="w-3 h-3 text-[#007AFF] bg-white border-gray-300 rounded focus:ring-[#007AFF] focus:ring-1"
              />
              <span className="text-gray-700 dark:text-gray-300 text-[11px] font-medium">Size</span>
              <div className="flex gap-0.5 ml-1">
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
            
            {/* Price */}
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => onTogglePrice(e.target.checked)}
                className="w-3 h-3 text-[#007AFF] bg-white border-gray-300 rounded focus:ring-[#007AFF] focus:ring-1"
              />
              <span className="text-gray-700 dark:text-gray-300 text-[11px] font-medium">Price</span>
              <div className="flex gap-0.5 ml-1">
                <button
                  type="button"
                  onClick={() => onCurrencyChange('USD')}
                  className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                    currency === 'USD' 
                      ? 'bg-[#007AFF] text-white' 
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-300'
                  }`}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => onCurrencyChange('EUR')}
                  className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                    currency === 'EUR' 
                      ? 'bg-[#007AFF] text-white' 
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-300'
                  }`}
                >
                  €
                </button>
                <button
                  type="button"
                  onClick={() => onCurrencyChange('CNY')}
                  className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                    currency === 'CNY' 
                      ? 'bg-[#007AFF] text-white' 
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-300'
                  }`}
                >
                  ¥
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 