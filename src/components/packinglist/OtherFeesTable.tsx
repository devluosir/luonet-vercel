import React from 'react';

interface OtherFee {
  id: number;
  description: string;
  amount: number;
  highlight?: {
    description?: boolean;
    amount?: boolean;
  };
}

interface OtherFeesTableProps {
  otherFees: OtherFee[];
  currency: string;
  editingFeeIndex: number | null;
  editingFeeAmount: string;
  onDeleteFee: (index: number) => void;
  onFeeChange: (index: number, field: keyof OtherFee, value: string | number) => void;
  onFeeDoubleClick: (index: number, field: 'description' | 'amount') => void;
  setEditingFeeIndex: (index: number | null) => void;
  setEditingFeeAmount: (amount: string) => void;
  showWeightAndPackage?: boolean;
  showHsCode?: boolean;
  showDimensions?: boolean;
}

// 参考发票页面的输入框样式
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

const highlightClass = 'text-red-500 dark:text-red-400 font-medium';

export function OtherFeesTable({
  otherFees,
  currency,
  editingFeeIndex,
  editingFeeAmount,
  onDeleteFee,
  onFeeChange,
  onFeeDoubleClick,
  setEditingFeeIndex,
  setEditingFeeAmount,
  showWeightAndPackage,
  showHsCode,
  showDimensions
}: OtherFeesTableProps) {
  return (
    <div className="border-t border-[#007AFF]/10 dark:border-[#0A84FF]/10">
      {otherFees.map((fee, index) => (
        <div key={fee.id} 
             className={`flex items-center ${
               index % 2 === 0 ? 'bg-[#007AFF]/[0.02] dark:bg-[#0A84FF]/[0.02]' : ''
             }`}>
          <div className="w-[40px] px-4">
            <span 
              className="flex items-center justify-center w-6 h-6 rounded-full mx-auto
                        text-xs text-[#86868B] hover:bg-red-500/10 hover:text-red-500 
                        cursor-pointer transition-all duration-200"
              onClick={() => onDeleteFee(index)}
              title="Click to delete"
            >
              ×
            </span>
          </div>
          <div className="flex-1 px-4">
            <textarea
              value={fee.description}
              onChange={(e) => {
                onFeeChange(index, 'description', e.target.value);
                // 自动调整高度
                e.target.style.height = '28px';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onDoubleClick={() => onFeeDoubleClick(index, 'description')}
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
                  const amount = value === '' || value === '-' ? 0 : parseFloat(value) || 0;
                  onFeeChange(index, 'amount', amount);
                }
              }}
              onDoubleClick={() => onFeeDoubleClick(index, 'amount')}
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
  );
} 