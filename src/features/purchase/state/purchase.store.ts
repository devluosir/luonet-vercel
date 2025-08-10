import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setIn } from '../utils/path';
import { numberOrZero, safeString } from '../utils/normalizers';
import type { PurchaseDraft, PurchaseItem, Supplier, BankInfo, Settings } from '../utils/types';

const defaultDraft: PurchaseDraft = {
  supplier: { name: '' },
  bank: {},
  settings: { currency: 'USD', stamp: 'none' },
  items: [],
  notes: '',
};

type State = {
  draft: PurchaseDraft;
  init: (data?: Partial<PurchaseDraft>) => void;
  setField: (path: string, value: any) => void;             // 点路径通用写
  addItem: (item?: Partial<PurchaseItem>) => void;
  updateItem: (id: string, patch: Partial<PurchaseItem>) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

export const usePurchaseStore = create<State>()(persist(
  (set, get) => ({
    draft: defaultDraft,
    init: (data) => set({ draft: { ...defaultDraft, ...data, items: data?.items ?? [] }}),
    setField: (path, value) => set(s => ({ draft: setIn({ ...s.draft }, path, value) })),
    addItem: (item) => set(s => ({
      draft: { ...s.draft, items: [...s.draft.items, {
        id: crypto.randomUUID(),
        name: safeString(item?.name ?? ''),
        qty: numberOrZero(item?.qty ?? 1),
        price: numberOrZero(item?.price ?? 0),
        unit: safeString(item?.unit ?? ''),
        remark: safeString(item?.remark ?? ''),
      }] }
    })),
    updateItem: (id, patch) => set(s => ({
      draft: { ...s.draft, items: s.draft.items.map(it => it.id === id ? { ...it, ...patch } : it) }
    })),
    removeItem: (id) => set(s => ({ draft: { ...s.draft, items: s.draft.items.filter(it => it.id !== id) }})),
    clear: () => set({ draft: defaultDraft }),
  }),
  {
    name: 'purchase-draft-v3',
    version: 3,
    migrate: async (state: any, version) => {
      if (!state?.draft) return state;
      
      if (version < 2) {
        // 示例：把旧的 stamp: '' 迁移为 'none'
        if (!state.draft.settings?.stamp) {
          state.draft.settings = { ...(state.draft.settings || {}), stamp: 'none' };
        }
        // 确保所有必需字段都有默认值
        if (!state.draft.settings?.currency) {
          state.draft.settings = { ...(state.draft.settings || {}), currency: 'USD' };
        }
        if (!state.draft.supplier) {
          state.draft.supplier = { name: '' };
        }
        if (!state.draft.bank) {
          state.draft.bank = {};
        }
        if (!state.draft.items) {
          state.draft.items = [];
        }
      }
      
      if (version < 3) {
        // 把 invoiceRequired 从 'true'/'', 迁到 boolean
        const raw = state.draft.bank?.invoiceRequired;
        if (typeof raw === 'string') {
          state.draft.bank.invoiceRequired = raw === 'true';
        }
      }
      
      return state;
    }
  }
));
