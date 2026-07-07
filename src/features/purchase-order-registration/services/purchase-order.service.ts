import { getLocalStorageJSON, setLocalStorage } from '@/utils/safeLocalStorage';
import type { PurchaseOrderDraft, PurchaseOrderRecord } from '../types';

const STORAGE_KEY = 'purchase_order_table_records';
const API_BASE = '/api/purchase-order';
const PAGE_SIZE = 2000;

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const purchaseOrderService = {
  getAll(): PurchaseOrderRecord[] {
    return getLocalStorageJSON<PurchaseOrderRecord[]>(STORAGE_KEY, []);
  },

  save(records: PurchaseOrderRecord[]): void {
    setLocalStorage(STORAGE_KEY, records);
  },

  buildRecord(draft: PurchaseOrderDraft): PurchaseOrderRecord {
    const now = new Date().toISOString();
    return {
      ...draft,
      id: createId(),
      createdAt: now,
      updatedAt: now,
      status: 'active',
    };
  },

  async pullFromD1(): Promise<PurchaseOrderRecord[]> {
    const all: PurchaseOrderRecord[] = [];
    let offset = 0;

    while (true) {
      const res = await fetch(`${API_BASE}?limit=${PAGE_SIZE}&offset=${offset}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('获取采购订单表失败');
      const data = await res.json() as { records?: PurchaseOrderRecord[]; total?: number };
      const page = Array.isArray(data.records) ? data.records : [];
      all.push(...page);
      if (page.length < PAGE_SIZE) break;
      if (typeof data.total === 'number' && all.length >= data.total) break;
      offset += PAGE_SIZE;
    }

    this.save(all.filter((record) => record.status !== 'deleted'));
    return all;
  },

  async create(draft: PurchaseOrderDraft): Promise<PurchaseOrderRecord> {
    const record = this.buildRecord(draft);
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error('新增采购订单失败');
    return record;
  },

  async update(id: string, patch: Partial<PurchaseOrderRecord>): Promise<void> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error('更新采购订单失败');
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除采购订单失败');
  },
};
