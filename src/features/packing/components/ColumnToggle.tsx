import { useState } from 'react';
import { Columns } from 'lucide-react';
import { useTablePrefsHydrated } from '../state/useTablePrefs';

const ALL_COLS: { key: string; label: string }[] = [
  { key: 'hsCode', label: 'HS Code' },
  { key: 'price', label: 'Price' },
  { key: 'weightAndPackage', label: 'Weight & Package' },
  { key: 'dimensions', label: 'Dimensions' },
];

interface ColumnToggleProps {
  // 可以根据需要添加更多props
}

export function ColumnToggle({}: ColumnToggleProps) {
  const { visibleCols, toggleCol, setCols } = useTablePrefsHydrated();
  const [open, setOpen] = useState(false);

  // 处理重量和包装列的联动
  const handleWeightAndPackageToggle = () => {
    const weightCols = ['netWeight', 'grossWeight', 'packageQty'];
    const hasAnyWeightCol = weightCols.some(col => visibleCols.includes(col as any));
    
    if (hasAnyWeightCol) {
      // 如果任何一个重量列可见，则隐藏所有重量列
      const newCols = visibleCols.filter(col => !weightCols.includes(col));
      setCols(newCols);
    } else {
      // 如果所有重量列都隐藏，则显示所有重量列
      const newCols = [...visibleCols, ...weightCols];
      setCols(newCols);
    }
  };

  // 处理价格列的联动
  const handlePriceToggle = () => {
    const priceCols = ['unitPrice', 'amount'];
    const hasAnyPriceCol = priceCols.some(col => visibleCols.includes(col as any));
    
    if (hasAnyPriceCol) {
      // 如果任何一个价格列可见，则隐藏所有价格列
      const newCols = visibleCols.filter(col => !priceCols.includes(col));
      setCols(newCols);
    } else {
      // 如果所有价格列都隐藏，则显示所有价格列
      const newCols = [...visibleCols, ...priceCols];
      setCols(newCols);
    }
  };

  // 检查重量和包装列的状态
  const weightCols = ['netWeight', 'grossWeight', 'packageQty'];
  const hasAnyWeightCol = weightCols.some(col => visibleCols.includes(col as any));

  // 检查价格列的状态
  const priceCols = ['unitPrice', 'amount'];
  const hasAnyPriceCol = priceCols.some(col => visibleCols.includes(col as any));

  return (
    <div className="flex items-center gap-0.5">
      {/* 列切换按钮组 - 展开时显示 */}
      {open && (
        <div className="flex items-center gap-0.5 transition-all duration-300">
          {ALL_COLS.map((col) => {
            if (col.key === 'weightAndPackage') {
              // 当价格组关闭时，重量包装组不能关闭
              const isDisabled = !hasAnyPriceCol && !hasAnyWeightCol;
              
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={handleWeightAndPackageToggle}
                  disabled={isDisabled}
                  className={`px-1.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                    isDisabled
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                      : hasAnyWeightCol
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
                  }`}
                  title={isDisabled ? '价格组和重量包装组不能同时关闭' : '切换重量包装组'}
                >
                  {col.label}
                </button>
              );
            }
            
            if (col.key === 'price') {
              // 当重量包装组关闭时，价格组不能关闭
              const isDisabled = !hasAnyWeightCol && !hasAnyPriceCol;
              
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={handlePriceToggle}
                  disabled={isDisabled}
                  className={`px-1.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                    isDisabled
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                      : hasAnyPriceCol
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
                  }`}
                  title={isDisabled ? '价格组和重量包装组不能同时关闭' : '切换价格组'}
                >
                  {col.label}
                </button>
              );
            }
            
            // 处理尺寸列的特殊逻辑
            if (col.key === 'dimensions') {
              const isDimensionsVisible = visibleCols.includes('dimensions');
              const isDisabled = !hasAnyWeightCol; // 当重量包装组关闭时禁用
              
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => !isDisabled && toggleCol(col.key as any)}
                  disabled={isDisabled}
                  className={`px-1.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                    isDisabled
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                      : isDimensionsVisible
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
                  }`}
                  title={isDisabled ? '需要先开启重量包装组' : '切换尺寸列'}
                >
                  {col.label}
                </button>
              );
            }
            
            return (
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
