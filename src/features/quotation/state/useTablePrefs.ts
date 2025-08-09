import { create } from 'zustand';
import { useEffect, useState } from 'react';

type Col = 'partName'|'description'|'quantity'|'unit'|'unitPrice'|'amount'|'remarks';

type TablePrefsState = {
  visibleCols: Col[];
  hydrated: boolean;
  toggleCol: (c: Col) => void;
  setCols: (cols: Col[]) => void;
  hydrate: () => void;
};

const DEFAULT_COLS: Col[] = ['partName','quantity','unit','unitPrice','amount'];

export const useTablePrefs = create<TablePrefsState>((set, get) => ({
  visibleCols: DEFAULT_COLS, // 服务器端始终使用默认值
  hydrated: false,
  toggleCol: (c) => {
    const now = get().visibleCols;
    const next = now.includes(c) ? now.filter(x=>x!==c) : [...now, c];
    if (typeof window !== 'undefined') {
      localStorage.setItem('qt.visibleCols', JSON.stringify(next));
    }
    set({ visibleCols: next });
  },
  setCols: (cols) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qt.visibleCols', JSON.stringify(cols));
    }
    set({ visibleCols: cols });
  },
  hydrate: () => {
    if (typeof window !== 'undefined' && !get().hydrated) {
      try {
        const saved = localStorage.getItem('qt.visibleCols');
        const parsed = saved ? JSON.parse(saved) : null;
        set({ 
          visibleCols: parsed || DEFAULT_COLS,
          hydrated: true 
        });
      } catch (e) {
        console.warn('Failed to parse table preferences:', e);
        set({ hydrated: true });
      }
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
