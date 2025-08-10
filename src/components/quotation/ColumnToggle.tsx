import { useState } from 'react';
import { Columns, ChevronLeft } from 'lucide-react';
import { useTablePrefsHydrated } from '@/features/quotation/state/useTablePrefs';

const ALL_COLS: { key: any; label: string }[] = [
  { key: 'description', label: 'Description' },
  { key: 'remarks', label: 'Remarks' },
];

export function ColumnToggle() {
  const { visibleCols, toggleCol } = useTablePrefsHydrated();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-0.5">
      {/* 列切换按钮组 - 展开时显示 */}
      {open && (
        <div className="flex items-center gap-0.5 transition-all duration-300">
          {ALL_COLS.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleCol(c.key)}
              className={`px-1.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                visibleCols.includes(c.key)
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* 列切换开关按钮 */}
      <button 
        type="button"
        className="px-3 py-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] 
                   bg-white/90 dark:bg-[#1C1C1E]/90 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]
                   hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 transition-colors
                   flex items-center gap-2"
        onClick={()=>setOpen(o=>!o)}
      >
        <Columns className={`h-4 w-4 transition-all duration-200 ${open ? 'text-gray-400 dark:text-gray-500' : 'text-blue-600 dark:text-blue-400'}`} />
      </button>
    </div>
  );
}
