import { useState } from 'react';
import { Columns } from 'lucide-react';
import { useTablePrefsHydrated } from '../state/useTablePrefs';

type Col = 'marks'|'hsCode'|'description'|'quantity'|'unit'|'unitPrice'|'amount'|'netWeight'|'grossWeight'|'packageQty'|'dimensions';

const ALL_COLS: { key: string; label: string }[] = [
  { key: 'marks', label: 'Marks' },
  { key: 'hsCode', label: 'HS Code' },
  { key: 'price', label: 'Price' },
  { key: 'weightAndPackage', label: 'Weight & Package' },
  { key: 'dimensions', label: 'Dimensions' },
];

interface ColumnToggleProps {
  packageQtyMergeMode?: 'auto' | 'manual';
  dimensionsMergeMode?: 'auto' | 'manual';
  marksMergeMode?: 'auto' | 'manual'; // 新增marks合并模式
  onPackageQtyMergeModeChange?: (mode: 'auto' | 'manual') => void;
  onDimensionsMergeModeChange?: (mode: 'auto' | 'manual') => void;
  onMarksMergeModeChange?: (mode: 'auto' | 'manual') => void; // 新增marks合并模式回调
  hasGroupedItems?: boolean;
  showMobileOptions?: boolean; // 新增：控制是否显示移动端选项
  onMobileOptionsChange?: (show: boolean) => void; // 新增：移动端选项显示状态回调
}

export function ColumnToggle({ 
  packageQtyMergeMode = 'auto', 
  dimensionsMergeMode = 'auto',
  marksMergeMode = 'auto', // 新增marks合并模式默认值
  onPackageQtyMergeModeChange,
  onDimensionsMergeModeChange,
  onMarksMergeModeChange, // 新增marks合并模式回调
  hasGroupedItems = false,
  showMobileOptions = false, // 新增：控制是否显示移动端选项
  onMobileOptionsChange // 新增：移动端选项显示状态回调
}: ColumnToggleProps) {
  const { visibleCols, toggleCol, setCols } = useTablePrefsHydrated();
  const [open, setOpen] = useState(false);

  // 处理重量和包装列的联动
  const handleWeightAndPackageToggle = () => {
    const weightCols: Col[] = ['netWeight', 'grossWeight', 'packageQty'];
    const hasAnyWeightCol = weightCols.some(col => visibleCols.includes(col));
    
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
    const priceCols: Col[] = ['unitPrice', 'amount'];
    const hasAnyPriceCol = priceCols.some(col => visibleCols.includes(col));
    
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

  // 切换包装数量合并模式
  const togglePackageQtyMergeMode = () => {
    const newMode = packageQtyMergeMode === 'auto' ? 'manual' : 'auto';
    onPackageQtyMergeModeChange?.(newMode);
  };

  // 切换尺寸合并模式
  const toggleDimensionsMergeMode = () => {
    const newMode = dimensionsMergeMode === 'auto' ? 'manual' : 'auto';
    onDimensionsMergeModeChange?.(newMode);
  };

  // 切换marks合并模式
  const toggleMarksMergeMode = () => {
    const newMode = marksMergeMode === 'auto' ? 'manual' : 'auto';
    onMarksMergeModeChange?.(newMode);
  };

  // 检查重量和包装列的状态
  const weightCols: Col[] = ['netWeight', 'grossWeight', 'packageQty'];
  const hasAnyWeightCol = weightCols.some(col => visibleCols.includes(col));

  // 检查价格列的状态
  const priceCols: Col[] = ['unitPrice', 'amount'];
  const hasAnyPriceCol = priceCols.some(col => visibleCols.includes(col));



  return (
    <div className="flex items-center gap-0.5">
      {/* 列切换按钮组 - 展开时显示 */}
      {open && (
        <>
          {/* 桌面端布局 - 中屏及以上显示 */}
          <div className="hidden md:flex items-center gap-0.5 transition-all duration-300">
              {ALL_COLS.map((col) => {
              if (col.key === 'weightAndPackage') {
                // 当价格组关闭时，重量包装组不能关闭
                const isDisabled = !hasAnyPriceCol && !hasAnyWeightCol;
                
                return (
                  <div key={col.key} className="flex items-center">
                    {/* 重量包装组按钮 */}
                    <button
                      type="button"
                      onClick={handleWeightAndPackageToggle}
                      disabled={isDisabled}
                      className={`px-1.5 py-1 text-xs font-medium rounded-l-lg transition-all duration-200 active:scale-95 ${
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
                    
                    {/* 包装数量合并模式切换按钮 - 仅在无分组数据时显示 */}
                    {hasAnyWeightCol && visibleCols.includes('packageQty') && !hasGroupedItems && (
                      <button
                        type="button"
                        onClick={togglePackageQtyMergeMode}
                        className={`px-1.5 py-1 text-xs font-medium rounded-r-lg transition-all duration-200 active:scale-95 flex items-center gap-1 border-l border-current/20 ${
                          packageQtyMergeMode === 'auto'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-sm'
                        }`}
                        title={packageQtyMergeMode === 'auto' ? '切换到手动合并模式' : '切换到自动合并模式'}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M8 6l4-2 4 2M8 18l4 2 4-2M12 4v16"
                          />
                        </svg>
                        {packageQtyMergeMode === 'auto' ? '自动' : '手动'}
                      </button>
                    )}
                  </div>
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
              
              // 处理marks列的特殊逻辑
              if (col.key === 'marks') {
                const isMarksVisible = visibleCols.includes('marks');
                
                return (
                  <div key={col.key} className="flex items-center">
                    {/* marks列按钮 */}
                    <button
                      type="button"
                      onClick={() => toggleCol(col.key as Col)}
                      className={`px-1.5 py-1 text-xs font-medium rounded-l-lg transition-all duration-200 active:scale-95 ${
                        isMarksVisible
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
                      }`}
                      title="切换marks列"
                    >
                      {col.label}
                    </button>
                    
                    {/* marks合并模式切换按钮 - 仅在无分组数据时显示 */}
                    {isMarksVisible && !hasGroupedItems && (
                      <button
                        type="button"
                        onClick={toggleMarksMergeMode}
                        className={`px-1.5 py-1 text-xs font-medium rounded-r-lg transition-all duration-200 active:scale-95 flex items-center gap-1 border-l border-current/20 ${
                          marksMergeMode === 'auto'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-sm'
                        }`}
                        title={marksMergeMode === 'auto' ? '切换到手动合并模式' : '切换到自动合并模式'}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M8 6l4-2 4 2M8 18l4 2 4-2M12 4v16"
                          />
                        </svg>
                        {marksMergeMode === 'auto' ? '自动' : '手动'}
                      </button>
                    )}
                  </div>
                );
              }
              
              // 处理尺寸列的特殊逻辑
              if (col.key === 'dimensions') {
                const isDimensionsVisible = visibleCols.includes('dimensions');
                const isDisabled = !hasAnyWeightCol; // 当重量包装组关闭时禁用
                
                return (
                  <div key={col.key} className="flex items-center">
                    {/* 尺寸列按钮 */}
                    <button
                      type="button"
                      onClick={() => !isDisabled && toggleCol(col.key as Col)}
                      disabled={isDisabled}
                      className={`px-1.5 py-1 text-xs font-medium rounded-l-lg transition-all duration-200 active:scale-95 ${
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
                    
                    {/* 尺寸合并模式切换按钮 - 仅在无分组数据时显示 */}
                    {isDimensionsVisible && !isDisabled && !hasGroupedItems && (
                      <button
                        type="button"
                        onClick={toggleDimensionsMergeMode}
                        className={`px-1.5 py-1 text-xs font-medium rounded-r-lg transition-all duration-200 active:scale-95 flex items-center gap-1 border-l border-current/20 ${
                          dimensionsMergeMode === 'auto'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-sm'
                        }`}
                        title={dimensionsMergeMode === 'auto' ? '切换到手动合并模式' : '切换到自动合并模式'}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M8 6l4-2 4 2M8 18l4 2 4-2M12 4v16"
                          />
                        </svg>
                        {dimensionsMergeMode === 'auto' ? '自动' : '手动'}
                      </button>
                    )}
                  </div>
                );
              }
              
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => toggleCol(col.key as Col)}
                  className={`px-1.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                    visibleCols.includes(col.key as Col)
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
                  }`}
                >
                  {col.label}
                </button>
              );
            })}
            </div>
          </>
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
          onClick={() => {
            setOpen(o => !o);
            // 同时控制移动端选项的显示
            if (onMobileOptionsChange) {
              onMobileOptionsChange(!showMobileOptions);
            }
          }}
          title="列管理"
        >
          <Columns className="h-4 w-4" />
        </button>
      </div>
    );
}
