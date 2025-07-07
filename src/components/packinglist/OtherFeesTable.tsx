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
}

const tableInputClassName = `w-full px-3 py-2 bg-transparent border border-transparent
  focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
  hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
  text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
  placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
  transition-all duration-200 text-center`;

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
  setEditingFeeAmount
}: OtherFeesTableProps) {
  return (
    <div className="overflow-hidden border-t-0 border border-[#E5E5EA] dark:border-[#2C2C2E]
      bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-b-2xl">
      <table className="w-full">
        <tbody>
          {otherFees.map((fee, index) => (
            <tr key={fee.id}
              className="border-t border-[#E5E5EA] dark:border-[#2C2C2E]"
            >
              <td className="w-[60px] px-4 py-2 text-center text-sm text-[#86868B] dark:text-gray-500">
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full 
                    text-xs text-[#86868B] hover:bg-red-500/10 hover:text-red-500 
                    cursor-pointer transition-all duration-200"
                  onClick={() => onDeleteFee(index)}
                  title="Click to delete"
                >
                  ×
                </span>
              </td>
              <td className="px-4 py-2" style={{ width: 'calc(280px + 180px + 100px + 100px + 120px)' }}>
                <input
                  type="text"
                  value={fee.description}
                  onChange={(e) => onFeeChange(index, 'description', e.target.value)}
                  onDoubleClick={() => onFeeDoubleClick(index, 'description')}
                  placeholder="Other Fee"
                  className={`${tableInputClassName} ${fee.highlight?.description ? highlightClass : ''}`}
                />
              </td>
              <td className="w-[160px] px-4 py-2">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 