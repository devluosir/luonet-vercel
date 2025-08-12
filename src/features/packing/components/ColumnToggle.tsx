import { useState } from 'react';
import { Columns } from 'lucide-react';
import { useTablePrefsHydrated } from '../state/useTablePrefs';

const ALL_COLS: { key: string; label: string }[] = [
  { key: 'hsCode', label: 'HS Code' },
  { key: 'description', label: 'Description' },
  { key: 'quantity', label: 'Qty' },
  { key: 'unit', label: 'Unit' },
  { key: 'unitPrice', label: 'U/Price' },
  { key: 'amount', label: 'Amount' },
  { key: 'netWeight', label: 'N.W.' },
  { key: 'grossWeight', label: 'G.W.' },
  { key: 'packageQty', label: 'Pkgs' },
  { key: 'dimensions', label: 'Dimensions' },
];

interface ColumnToggleProps {
  // 可以根据需要添加更多props
}

export function ColumnToggle({}: ColumnToggleProps) {
  const { visibleCols, toggleCol } = useTablePrefsHydrated();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-0.5">
      {/* 列切换按钮组 - 展开时显示 */}
      {open && (
        <div className="flex items-center gap-0.5 transition-all duration-300">
          {ALL_COLS.map((col) => (
            <button
              key={col.key}
              type="button"
              onClick={() => toggleCol(col.key as any)}
              className={`px-1.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                visibleCols.includes(col.key as any)
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
              }`}
            >
              {col.label}
            </button>
          ))}
        </div>
      )}

      {/* 列切换开关按钮 */}
      <button 
        type="button"
        className="relative inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] 
                   bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 
                   text-sm font-medium text-blue-700 dark:text-blue-300
                   hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/30 dark:hover:to-indigo-800/30 
                   hover:border-blue-300 dark:hover:border-blue-600
                   transition-all duration-200 shadow-sm hover:shadow-md"
        onClick={()=>setOpen(o=>!o)}
        title="列管理"
      >
        <Columns className="h-4 w-4" />
      </button>
    </div>
  );
}
