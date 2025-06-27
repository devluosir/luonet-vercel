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
  stampType: 'none' | 'shanghai' | 'hongkong';
  onDocumentTypeChange: (type: 'proforma' | 'packing' | 'both') => void;
  onToggleHsCode: (show: boolean) => void;
  onToggleDimensions: (show: boolean) => void;
  onToggleWeightAndPackage: (show: boolean) => void;
  onTogglePrice: (show: boolean) => void;
  onDimensionUnitChange: (unit: string) => void;
  onCurrencyChange: (currency: string) => void;
  onHeaderTypeChange: (type: 'none' | 'bilingual' | 'english') => void;
  onStampTypeChange: (type: 'none' | 'shanghai' | 'hongkong') => void;
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
  stampType,
  onDocumentTypeChange,
  onToggleHsCode,
  onToggleDimensions,
  onToggleWeightAndPackage,
  onTogglePrice,
  onDimensionUnitChange,
  onCurrencyChange,
  onHeaderTypeChange,
  onStampTypeChange
}) => {
  return (
    <div className={`overflow-hidden transition-all duration-300 ease-in-out
      ${isVisible ? 'opacity-100 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 h-auto' : 'opacity-0 px-0 py-0 h-0'}`}>
      <div className="bg-gray-50 dark:bg-[#1C1C1E] rounded-xl p-3 sm:p-4 space-y-3">
        
        {/* 文档类型选择 - 精简化 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onDocumentTypeChange('proforma')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 text-center ${
              documentType === 'proforma' 
                ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <span className="block sm:hidden">Proforma</span>
            <span className="hidden sm:block lg:hidden">Proforma Invoice</span>
            <span className="hidden lg:block">Proforma Invoice</span>
          </button>
          <button
            type="button"
            onClick={() => onDocumentTypeChange('packing')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 text-center ${
              documentType === 'packing' 
                ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <span className="block sm:hidden">Packing</span>
            <span className="hidden sm:block">Packing List</span>
          </button>
          <button
            type="button"
            onClick={() => onDocumentTypeChange('both')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 text-center sm:col-span-2 lg:col-span-1 ${
              documentType === 'both' 
                ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <span className="block sm:hidden">Both</span>
            <span className="hidden sm:block lg:hidden">Both Types</span>
            <span className="hidden lg:block">Proforma Invoice & Packing List</span>
          </button>
        </div>

        {/* 模板设置 */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
          <div className="grid grid-cols-2 gap-3">
            {/* 文件头类型 */}
            <div>
              <div className="flex flex-wrap gap-1.5">
                {['none', 'bilingual', 'english'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      headerType === type
                        ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white'
                        : 'bg-white/90 dark:bg-[#1c1c1e]/90 text-gray-600 dark:text-gray-400 border border-gray-200/30 dark:border-white/10'
                    }`}
                    onClick={() => onHeaderTypeChange(type as 'none' | 'bilingual' | 'english')}
                  >
                    {type === 'none' ? 'None' : type === 'bilingual' ? 'Bilingual' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            {/* 印章类型 */}
            <div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'none', label: 'None' },
                  { value: 'shanghai', label: 'Shanghai' },
                  { value: 'hongkong', label: 'Hong Kong' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      stampType === value
                        ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white'
                        : 'bg-white/90 dark:bg-[#1c1c1e]/90 text-gray-600 dark:text-gray-400 border border-gray-200/30 dark:border-white/10'
                    }`}
                    onClick={() => onStampTypeChange(value as 'none' | 'shanghai' | 'hongkong')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 显示选项 */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {/* HS Code */}
            <label className="flex items-center space-x-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={showHsCode}
                onChange={(e) => onToggleHsCode(e.target.checked)}
                className="w-4 h-4 text-[#007AFF] bg-gray-100 border-gray-300 rounded focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">HS Code</span>
            </label>
            
            {/* Weight & Package */}
            <label className="flex items-center space-x-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={showWeightAndPackage}
                onChange={(e) => onToggleWeightAndPackage(e.target.checked)}
                className="w-4 h-4 text-[#007AFF] bg-gray-100 border-gray-300 rounded focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Weight & Package</span>
            </label>
            
            {/* Dimensions with unit buttons */}
            <div className="flex items-center space-x-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="checkbox"
                checked={showDimensions}
                onChange={(e) => onToggleDimensions(e.target.checked)}
                className="w-4 h-4 text-[#007AFF] bg-gray-100 border-gray-300 rounded focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Dimensions</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onDimensionUnitChange('cm')}
                  className={`text-xs px-1.5 py-0.5 rounded transition-all duration-200 font-medium min-w-[20px] ${
                    dimensionUnit === 'cm' 
                      ? 'bg-[#007AFF] text-white shadow-sm' 
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                >
                  cm
                </button>
                <button
                  type="button"
                  onClick={() => onDimensionUnitChange('mm')}
                  className={`text-xs px-1.5 py-0.5 rounded transition-all duration-200 font-medium min-w-[20px] ${
                    dimensionUnit === 'mm' 
                      ? 'bg-[#007AFF] text-white shadow-sm' 
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                >
                  mm
                </button>
              </div>
            </div>
            
            {/* Price with currency buttons */}
            <div className="flex items-center space-x-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => onTogglePrice(e.target.checked)}
                className="w-4 h-4 text-[#007AFF] bg-gray-100 border-gray-300 rounded focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Price</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onCurrencyChange('USD')}
                  className={`text-xs px-1.5 py-0.5 rounded transition-all duration-200 font-medium min-w-[20px] ${
                    currency === 'USD' 
                      ? 'bg-[#007AFF] text-white shadow-sm' 
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => onCurrencyChange('EUR')}
                  className={`text-xs px-1.5 py-0.5 rounded transition-all duration-200 font-medium min-w-[20px] ${
                    currency === 'EUR' 
                      ? 'bg-[#007AFF] text-white shadow-sm' 
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                >
                  €
                </button>
                <button
                  type="button"
                  onClick={() => onCurrencyChange('CNY')}
                  className={`text-xs px-1.5 py-0.5 rounded transition-all duration-200 font-medium min-w-[20px] ${
                    currency === 'CNY' 
                      ? 'bg-[#007AFF] text-white shadow-sm' 
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-500'
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