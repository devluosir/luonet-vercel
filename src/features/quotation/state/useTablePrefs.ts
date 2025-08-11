import { create } from 'zustand';
import { useEffect, useState } from 'react';
import { getLocalStorageJSON, setLocalStorage } from '@/utils/safeLocalStorage';

type Col = 'partName'|'description'|'quantity'|'unit'|'unitPrice'|'amount'|'remarks';

type TablePrefsState = {
  visibleCols: Col[];
  hydrated: boolean;
  toggleCol: (c: Col) => void;
  setCols: (cols: Col[]) => void;
  hydrate: () => void;
};

const DEFAULT_COLS: Col[] = ['partName','quantity','unit','unitPrice','amount','remarks'];

export const useTablePrefs = create<TablePrefsState>((set, get) => ({
  visibleCols: DEFAULT_COLS, // 服务器端始终使用默认值
  hydrated: false,
  toggleCol: (c) => {
    const now = get().visibleCols;
    const next = now.includes(c) ? now.filter(x=>x!==c) : [...now, c];
    setLocalStorage('qt.visibleCols', next);
    set({ visibleCols: next });
  },
  setCols: (cols) => {
    setLocalStorage('qt.visibleCols', cols);
    set({ visibleCols: cols });
  },
  hydrate: () => {
    if (typeof window !== 'undefined' && !get().hydrated) {
      const parsed = getLocalStorageJSON('qt.visibleCols', null);
      set({ 
        visibleCols: parsed || DEFAULT_COLS,
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
