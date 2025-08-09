import { useState } from 'react';
import { useTablePrefs } from '@/features/quotation/state/useTablePrefs';

const ALL_COLS: { key: any; label: string }[] = [
  { key: 'partName', label: 'Name' },
  { key: 'description', label: 'Desc' },
  { key: 'quantity', label: 'Qty' },
  { key: 'unit', label: 'Unit' },
  { key: 'unitPrice', label: 'Unit Price' },
  { key: 'amount', label: 'Amount' },
  { key: 'remarks', label: 'Remarks' },
];

export function ColumnToggle() {
  const { visibleCols, toggleCol } = useTablePrefs();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        type="button"
        className="px-3 py-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] 
                   bg-white/90 dark:bg-[#1C1C1E]/90 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]
                   hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 transition-colors"
        onClick={()=>setOpen(o=>!o)}
      >
        列
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] 
                        bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl shadow-lg p-3 z-20">
          {ALL_COLS.map(c=>(
            <label key={c.key} className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleCols.includes(c.key)}
                onChange={()=>toggleCol(c.key)}
                className="rounded border-[#E5E5EA] dark:border-[#2C2C2E]"
              />
              <span className="text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">{c.label}</span>
            </label>
          ))}
        </div>
      )}
      {/* 点击外部关闭 */}
      {open && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
