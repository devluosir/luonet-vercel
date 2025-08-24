import { create } from 'zustand';
import { useEffect, useState } from 'react';
import { getLocalStorageJSON, setLocalStorage } from '../../../utils/safeLocalStorage';

type Col = 'marks'|'hsCode'|'description'|'quantity'|'unit'|'unitPrice'|'amount'|'netWeight'|'grossWeight'|'packageQty'|'dimensions';

type TablePrefsState = {
  visibleCols: Col[];
  hydrated: boolean;
  toggleCol: (c: Col) => void;
  setCols: (cols: Col[]) => void;
  hydrate: () => void;
};

const DEFAULT_COLS: Col[] = ['description','quantity','unit','netWeight','grossWeight','packageQty','dimensions'];

export const useTablePrefs = create<TablePrefsState>((set, get) => ({
  visibleCols: DEFAULT_COLS, // 服务器端始终使用默认值
  hydrated: false,
  toggleCol: (c) => {
    const now = get().visibleCols;
    const next = now.includes(c) ? now.filter(x=>x!==c) : [...now, c];
    // 确保核心列始终显示
    const coreCols: Col[] = ['description', 'quantity', 'unit'];
    
    // 处理重量包装组与尺寸的关系
    const weightCols: Col[] = ['netWeight', 'grossWeight', 'packageQty'];
    const hasAnyWeightCol = weightCols.some(col => next.includes(col));
    
    // 处理价格组与重量包装组的关系
    const priceCols: Col[] = ['unitPrice', 'amount'];
    const hasAnyPriceCol = priceCols.some(col => next.includes(col));
    
    // 如果重量包装组关闭，则强制关闭尺寸列
    let finalCols = Array.from(new Set([...coreCols, ...next]));
    if (!hasAnyWeightCol) {
      finalCols = finalCols.filter(col => col !== 'dimensions');
    }
    
    // 确保价格组和重量包装组不能同时不显示
    if (!hasAnyPriceCol && !hasAnyWeightCol) {
      // 如果两个组都关闭，则重新开启价格组（默认选择）
      finalCols = [...finalCols, ...priceCols];
    }
    
    setLocalStorage('pk.visibleCols', finalCols);
    set({ visibleCols: finalCols });
  },
  setCols: (cols) => {
    // 确保核心列始终显示
    const coreCols: Col[] = ['description', 'quantity', 'unit'];
    
    // 处理重量包装组与尺寸的关系
    const weightCols: Col[] = ['netWeight', 'grossWeight', 'packageQty'];
    const hasAnyWeightCol = weightCols.some(col => cols.includes(col));
    
    // 处理价格组与重量包装组的关系
    const priceCols: Col[] = ['unitPrice', 'amount'];
    const hasAnyPriceCol = priceCols.some(col => cols.includes(col));
    
    // 如果重量包装组关闭，则强制关闭尺寸列
    let finalCols = Array.from(new Set([...coreCols, ...cols]));
    if (!hasAnyWeightCol) {
      finalCols = finalCols.filter(col => col !== 'dimensions');
    }
    
    // 确保价格组和重量包装组不能同时不显示
    if (!hasAnyPriceCol && !hasAnyWeightCol) {
      // 如果两个组都关闭，则重新开启价格组（默认选择）
      finalCols = [...finalCols, ...priceCols];
    }
    
    setLocalStorage('pk.visibleCols', finalCols);
    set({ visibleCols: finalCols });
  },
  hydrate: () => {
    if (typeof window !== 'undefined' && !get().hydrated) {
      const parsed = getLocalStorageJSON('pk.visibleCols', null);
      // 确保核心列始终显示
      const coreCols: Col[] = ['description', 'quantity', 'unit'];
      const initialCols = parsed || DEFAULT_COLS;
      
      // 处理重量包装组与尺寸的关系
      const weightCols: Col[] = ['netWeight', 'grossWeight', 'packageQty'];
      const hasAnyWeightCol = weightCols.some(col => initialCols.includes(col));
      
      // 处理价格组与重量包装组的关系
      const priceCols: Col[] = ['unitPrice', 'amount'];
      const hasAnyPriceCol = priceCols.some(col => initialCols.includes(col));
      
      // 如果重量包装组关闭，则强制关闭尺寸列
      let finalCols = Array.from(new Set([...coreCols, ...initialCols]));
      if (!hasAnyWeightCol) {
        finalCols = finalCols.filter(col => col !== 'dimensions');
      }
      
      // 确保价格组和重量包装组不能同时不显示
      if (!hasAnyPriceCol && !hasAnyWeightCol) {
        // 如果两个组都关闭，则重新开启价格组（默认选择）
        finalCols = [...finalCols, ...priceCols];
      }
      
      set({ 
        visibleCols: finalCols,
        hydrated: true 
      });
    }
  },
}));

// Hook for client-side hydration
export const useTablePrefsHydrated = () => {
  const store = useTablePrefs();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // 使用 setTimeout 确保在渲染后执行
    const timer = setTimeout(() => {
      store.hydrate();
      setIsHydrated(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [store]);

  return {
    ...store,
    isHydrated: isHydrated && store.hydrated
  };
};
