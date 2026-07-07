import { create } from 'zustand';
import type { PurchaseOrderDraft, PurchaseOrderRecord } from '../types';
import { purchaseOrderService } from '../services/purchase-order.service';

interface PurchaseOrderStore {
  records: PurchaseOrderRecord[];
  isLoading: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  addRecord: (draft: PurchaseOrderDraft) => Promise<void>;
  updateRecord: (id: string, patch: Partial<PurchaseOrderRecord>) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
}

function sortRecords(records: PurchaseOrderRecord[]): PurchaseOrderRecord[] {
  return [...records]
    .filter((record) => record.status !== 'deleted')
    .sort((a, b) => b.purchaseNo.localeCompare(a.purchaseNo));
}

export const usePurchaseOrderStore = create<PurchaseOrderStore>((set, get) => ({
  records: [],
  isLoading: false,
  lastSyncedAt: null,
  error: null,

  init: async () => {
    set({ records: sortRecords(purchaseOrderService.getAll()), isLoading: true, error: null });
    await get().refresh();
  },

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const records = await purchaseOrderService.pullFromD1();
      set({ records: sortRecords(records), lastSyncedAt: new Date(), isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '同步采购订单表失败',
      });
    }
  },

  addRecord: async (draft) => {
    const record = await purchaseOrderService.create(draft);
    const records = sortRecords([...get().records, record]);
    purchaseOrderService.save(records);
    set({ records });
  },

  updateRecord: async (id, patch) => {
    const now = new Date().toISOString();
    const nextPatch = { ...patch, updatedAt: now };
    const records = sortRecords(
      get().records.map((record) => (record.id === id ? { ...record, ...nextPatch } : record))
    );
    purchaseOrderService.save(records);
    set({ records });
    await purchaseOrderService.update(id, nextPatch);
  },

  removeRecord: async (id) => {
    const records = get().records.filter((record) => record.id !== id);
    purchaseOrderService.save(records);
    set({ records });
    await purchaseOrderService.remove(id);
  },
}));
