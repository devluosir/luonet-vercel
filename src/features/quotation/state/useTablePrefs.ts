import { create } from 'zustand';

type Col = 'partName'|'description'|'quantity'|'unit'|'unitPrice'|'amount'|'remarks';

type TablePrefsState = {
  visibleCols: Col[];
  toggleCol: (c: Col) => void;
  setCols: (cols: Col[]) => void;
};

const DEFAULT_COLS: Col[] = ['partName','quantity','unit','unitPrice','amount'];

export const useTablePrefs = create<TablePrefsState>((set, get) => ({
  visibleCols: (typeof window !== 'undefined'
    && JSON.parse(localStorage.getItem('qt.visibleCols') || 'null')) || DEFAULT_COLS,
  toggleCol: (c) => {
    const now = get().visibleCols;
    const next = now.includes(c) ? now.filter(x=>x!==c) : [...now, c];
    localStorage.setItem('qt.visibleCols', JSON.stringify(next));
    set({ visibleCols: next });
  },
  setCols: (cols) => {
    localStorage.setItem('qt.visibleCols', JSON.stringify(cols));
    set({ visibleCols: cols });
  },
}));
