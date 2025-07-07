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

// 统一输入框样式与主表格
const tableInputClassName = `w-full px-3 py-1.5 bg-transparent border border-transparent
  focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
  hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
  text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
  placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
  transition-all duration-200 text-center
  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
  ios-optimized-input`;

const highlightClass = 'bg-yellow-100/50 dark:bg-yellow-900/30';

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
    <div className="border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
      <table className="w-full">
        <tbody>
          {otherFees.map((fee, index) => (
            <tr key={fee.id}
              className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50"
            >
              {/* 序号/删除按钮列 */}
              <td className="w-[40px] px-4 py-2 text-center text-[12px] text-[#86868B] dark:text-gray-500">
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full 
                    text-xs text-[#86868B] hover:bg-red-500/10 hover:text-red-500 
                    cursor-pointer transition-all duration-200 mx-auto"
                  onClick={() => onDeleteFee(index)}
                  title="Click to delete"
                >
                  ×
                </span>
              </td>

              {/* Description 列 */}
              <td className="px-4 py-2" style={{ width: getDescriptionWidth() }}>
                <input
                  type="text"
                  value={fee.description}
                  onChange={(e) => onFeeChange(index, 'description', e.target.value)}
                  onDoubleClick={() => onFeeDoubleClick(index, 'description')}
                  placeholder="Other Fee"
                  className={`${tableInputClassName} text-left ${fee.highlight?.description ? highlightClass : ''}`}
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
              <td className="w-[150px] px-4 py-2">
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
                  className={`${tableInputClassName} ${fee.highlight?.amount ? highlightClass : ''}`}
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