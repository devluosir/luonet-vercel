import { useState } from 'react';
import { Columns, ChevronLeft } from 'lucide-react';
import { useTablePrefsHydrated } from '@/features/quotation/state/useTablePrefs';

const ALL_COLS: { key: any; label: string }[] = [
  { key: 'description', label: 'Description' },
  { key: 'remarks', label: 'Remarks' },
];

interface ColumnToggleProps {
  descriptionMergeMode?: 'auto' | 'manual';
  remarksMergeMode?: 'auto' | 'manual';
  onDescriptionMergeModeChange?: (mode: 'auto' | 'manual') => void;
  onRemarksMergeModeChange?: (mode: 'auto' | 'manual') => void;
}

export function ColumnToggle({ 
  descriptionMergeMode = 'auto', 
  remarksMergeMode = 'auto',
  onDescriptionMergeModeChange,
  onRemarksMergeModeChange
}: ColumnToggleProps) {
  const { visibleCols, toggleCol } = useTablePrefsHydrated();
  const [open, setOpen] = useState(false);

  // 暂时禁用description列的合并模式切换功能
  // const toggleDescriptionMergeMode = () => {
  //   const newMode = descriptionMergeMode === 'auto' ? 'manual' : 'auto';
  //   onDescriptionMergeModeChange?.(newMode);
  // };

  const toggleRemarksMergeMode = () => {
    const newMode = remarksMergeMode === 'auto' ? 'manual' : 'auto';
    onRemarksMergeModeChange?.(newMode);
  };

  return (
    <div className="flex items-center gap-0.5">
      {/* 列切换按钮组 - 展开时显示 */}
      {open && (
        <div className="flex items-center gap-0.5 transition-all duration-300">
          {/* Description 按钮组 - 包含Description和合并按钮 */}
          <div className="flex items-center">
            {/* Description 按钮 */}
            <button
              type="button"
              onClick={() => toggleCol('description')}
              className={`px-1.5 py-1 text-xs font-medium rounded-l-lg transition-all duration-200 active:scale-95 ${
                visibleCols.includes('description')
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
              }`}
            >
              Description
            </button>
            
            {/* 合并模式切换按钮 - 紧贴Description按钮 - 暂时禁用 */}
            {/* {visibleCols.includes('description') && (
              <button
                type="button"
                onClick={toggleDescriptionMergeMode}
                className={`px-1.5 py-1 text-xs font-medium rounded-r-lg transition-all duration-200 active:scale-95 flex items-center gap-1 border-l border-current/20 ${
                  descriptionMergeMode === 'auto'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-sm'
                }`}
                title={descriptionMergeMode === 'auto' ? '切换到手动合并模式' : '切换到自动合并模式'}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M8 6l4-2 4 2M8 18l4 2 4-2M12 4v16"
                  />
                </svg>
                {descriptionMergeMode === 'auto' ? '自动' : '手动'}
              </button>
            )} */}
          </div>
          
          {/* Remarks 按钮组 - 包含Remarks和合并按钮 */}
          <div className="flex items-center">
            {/* Remarks 按钮 */}
            <button
              type="button"
              onClick={() => toggleCol('remarks')}
              className={`px-1.5 py-1 text-xs font-medium rounded-l-lg transition-all duration-200 active:scale-95 ${
                visibleCols.includes('remarks')
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
              }`}
            >
              Remarks
            </button>
            
            {/* 合并模式切换按钮 - 紧贴Remarks按钮 */}
            {visibleCols.includes('remarks') && (
              <button
                type="button"
                onClick={toggleRemarksMergeMode}
                className={`px-1.5 py-1 text-xs font-medium rounded-r-lg transition-all duration-200 active:scale-95 flex items-center gap-1 border-l border-current/20 ${
                  remarksMergeMode === 'auto'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-sm'
                }`}
                title={remarksMergeMode === 'auto' ? '切换到手动合并模式' : '切换到自动合并模式'}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M8 6l4-2 4 2M8 18l4 2 4-2M12 4v16"
                  />
                </svg>
                {remarksMergeMode === 'auto' ? '自动' : '手动'}
              </button>
            )}
          </div>
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
