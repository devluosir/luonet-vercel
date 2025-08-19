import React from 'react';
import { useUnitSelector } from '@/hooks/useUnitHandler';

// 单位选择器组件属性
export interface UnitSelectorProps {
  /** 当前单位 */
  value: string;
  /** 当前数量（用于单复数处理） */
  quantity: number;
  /** 自定义单位列表 */
  customUnits?: string[];
  /** 单位变更回调 */
  onChange?: (unit: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 自定义样式类名 */
  className?: string;
  /** 是否显示数量提示 */
  showQuantityHint?: boolean;
  /** 是否启用单复数处理 */
  enablePluralization?: boolean;
  /** 双击事件处理 */
  onDoubleClick?: () => void;
  /** 焦点事件处理 */
  onFocus?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  /** 失焦事件处理 */
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
}

/**
 * 通用单位选择器组件
 * 支持单复数自动处理、自定义单位、键盘导航等功能
 */
export const UnitSelector: React.FC<UnitSelectorProps> = React.memo(({
  value,
  quantity,
  customUnits = [],
  onChange,
  disabled = false,
  placeholder = '',
  className = '',
  showQuantityHint = false,
  enablePluralization = true,
  onDoubleClick,
  onFocus,
  onBlur,
}) => {
  const { displayUnit, unitOptions, handleSelectChange } = useUnitSelector(
    value,
    quantity,
    customUnits,
    onChange
  );

  // 处理选择变更
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value;
    handleSelectChange(newUnit);
  };

  // 基础样式类
  const baseClassName = `
    w-full px-3 py-2 bg-transparent border border-transparent 
    focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 
    hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
    text-[13px] text-center cursor-pointer appearance-none ios-optimized-input
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-200
  `;

  // 合并样式类
  const selectClassName = `${baseClassName} ${className}`.trim();

  return (
    <div className="relative">
      <select
        value={displayUnit}
        onChange={handleChange}
        onDoubleClick={onDoubleClick}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        className={selectClassName}
        style={{
          caretColor: 'transparent', // 隐藏光标
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        
        {unitOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* 数量提示 */}
      {showQuantityHint && quantity > 0 && (
        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {quantity}
        </div>
      )}
      
      {/* 自定义箭头图标 */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg 
          className="w-4 h-4 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </div>
    </div>
  );
});

UnitSelector.displayName = 'UnitSelector';


