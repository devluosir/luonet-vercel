import { useState } from 'react';
import { Columns } from 'lucide-react';

interface ColumnToggleProps {
  visibleCols: string[];
  onToggleCol: (col: string) => void;
  availableCols: string[];
}

const COLUMN_LABELS: Record<string, string> = {
  hsCode: 'HS Code',
  partName: 'Part Name',
  description: 'Description',
  remarks: 'Remarks'
};

export function ColumnToggle({ 
  visibleCols, 
  onToggleCol,
  availableCols
}: ColumnToggleProps) {
  const [open, setOpen] = useState(false);

  // 检查按钮是否应该被禁用（互锁逻辑）
  const isButtonDisabled = (col: string) => {
    // 只有 Part Name 和 Description 有互锁关系
    if (col === 'partName' || col === 'description') {
      // 如果当前列是可见的
      if (visibleCols.includes(col)) {
        // 检查另一个列是否不可见
        const otherCol = col === 'partName' ? 'description' : 'partName';
        if (!visibleCols.includes(otherCol)) {
          // 如果另一个列不可见，则当前列不能被隐藏（互锁）
          return true;
        }
      }
    }
    return false;
  };

  // 处理按钮点击
  const handleToggleCol = (col: string) => {
    // 如果按钮被禁用，不执行任何操作
    if (isButtonDisabled(col)) {
      return;
    }
    
    // 执行列切换
    onToggleCol(col);
  };

  return (
    <div className="flex items-center gap-0.5">
      {/* 列切换按钮组 - 展开时显示 */}
      {open && (
        <div className="flex items-center gap-0.5 transition-all duration-300">
          {availableCols.map((col) => {
            const isDisabled = isButtonDisabled(col);
            return (
              <button
                key={col}
                type="button"
                onClick={() => handleToggleCol(col)}
                disabled={isDisabled}
                className={`px-1.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                  isDisabled
                    ? 'bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400 cursor-not-allowed'
                    : visibleCols.includes(col)
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
                }`}
                title={isDisabled ? 'Part Name 和 Description 至少需要显示一个列' : undefined}
              >
                {COLUMN_LABELS[col] || col}
              </button>
            );
          })}
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
