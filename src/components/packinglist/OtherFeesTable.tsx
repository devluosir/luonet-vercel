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
  // 计算description列的宽度
  const getDescriptionWidth = () => {
    let totalWidth = 40; // 删除按钮列宽度
    
    // 基础列宽度
    const qtyWidth = 100; // Q'TY 列宽度
    const unitWidth = 100; // Unit 列宽度
    const amountWidth = 150; // Amount 列宽度
    
    // 添加基础列宽度
    totalWidth += qtyWidth + unitWidth + amountWidth;

    // 根据显示选项添加额外宽度
    if (showHsCode) {
      totalWidth += 120; // HS Code 列
    }
    if (showWeightAndPackage) {
      totalWidth += 300; // N.W.、G.W.、Package 列 (100px * 3)
    }
    if (showDimensions) {
      totalWidth += 120; // Dimensions 列
    }

    return `calc(100% - ${totalWidth}px)`;
  };

  return (
    <div className="border-t border-[#007AFF]/10 dark:border-[#0A84FF]/10">
      <table className="w-full">
        <tbody>
          {otherFees.map((fee, index) => (
            <tr key={fee.id}
              className={`border-b border-[#007AFF]/10 dark:border-[#0A84FF]/10 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 ${
                index % 2 === 0 ? 'bg-[#007AFF]/[0.02] dark:bg-[#0A84FF]/[0.02]' : ''
              }`}
            >
              {/* 序号/删除按钮列 */}
              <td className="w-[40px] px-4 py-2 text-center">
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full mx-auto
                    text-xs text-[#86868B] hover:bg-red-500/10 hover:text-red-500 
                    cursor-pointer transition-all duration-200"
                  onClick={() => onDeleteFee(index)}
                  title="Click to delete"
                >
                  ×
                </span>
              </td>

              {/* Description 列 */}
              <td className="px-4 py-1.5" style={{ width: getDescriptionWidth() }}>
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
              </td>

              {/* 占位列：Q'TY */}
              <td className="w-[100px] px-4 py-2"></td>

              {/* 占位列：Unit */}
              <td className="w-[100px] px-4 py-2"></td>

              {/* 可选：HS Code */}
              {showHsCode && (
                <td className="w-[120px] px-4 py-2"></td>
              )}

              {/* Amount 列 */}
              <td className="w-[160px] px-4 py-1.5">
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

              {/* 可选：重量和包装列 */}
              {showWeightAndPackage && (
                <>
                  <td className="w-[100px] px-4 py-2"></td>
                  <td className="w-[100px] px-4 py-2"></td>
                  <td className="w-[100px] px-4 py-2"></td>
                </>
              )}

              {/* 可选：尺寸列 */}
              {showDimensions && (
                <td className="w-[120px] px-4 py-2"></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 