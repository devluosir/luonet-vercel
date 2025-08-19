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
  itemsCount?: number; // 添加主表格项目数量，用于计算连续序号
  effectiveVisibleCols?: string[]; // 添加可见列信息
}

// 参考主表格的输入框样式
const tableInputClassName = `w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center ios-optimized-input`;

const numberInputClassName = `${tableInputClassName} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

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
  showDimensions,
  itemsCount = 0,
  effectiveVisibleCols = []
}: OtherFeesTableProps) {
  return (
    <tbody>
      {otherFees.map((fee, index) => (
        <tr key={fee.id} className="border-b border-[#007AFF]/10 dark:border-[#0A84FF]/10 bg-white/90 dark:bg-[#1C1C1E]/90">
                {/* 序号列 - 与主表格完全一致 */}
                <td className="py-2 px-4 text-center text-sm">
                  <span 
                    className="flex items-center justify-center w-5 h-5 rounded-full text-xs cursor-pointer transition-colors"
                    style={{ color: '#ef4444' }}
                    onClick={() => onDeleteFee(index)}
                    title="Click to delete"
                  >
                    {itemsCount + index + 1}
                  </span>
                </td>
                
                {/* Description列 - 合并所有中间列 */}
                <td className="py-2 px-4 text-center text-[12px]" colSpan={
                  (effectiveVisibleCols.includes('hsCode') && showHsCode ? 1 : 0) +
                  (effectiveVisibleCols.includes('quantity') ? 1 : 0) +
                  (effectiveVisibleCols.includes('unit') ? 1 : 0) +
                  (effectiveVisibleCols.includes('unitPrice') ? 1 : 0) +
                  (effectiveVisibleCols.includes('netWeight') && showWeightAndPackage ? 1 : 0) +
                  (effectiveVisibleCols.includes('grossWeight') && showWeightAndPackage ? 1 : 0) +
                  (effectiveVisibleCols.includes('packageQty') && showWeightAndPackage ? 1 : 0) +
                  (effectiveVisibleCols.includes('dimensions') && showDimensions ? 1 : 0)
                }>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.stopPropagation();
                      }
                    }}
                  />
                </td>
                
                {/* Amount列 */}
                <td className="py-2 px-4 text-center text-sm">
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
                </td>
              </tr>
            ))}
    </tbody>
  );
} 