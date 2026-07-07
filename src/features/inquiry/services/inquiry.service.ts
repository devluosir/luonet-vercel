import { getLocalStorageJSON, setLocalStorage } from '@/utils/safeLocalStorage';
import type { InquiryRecord } from '../types';

const STORAGE_KEY = 'inquiry_records';
const DELETED_KEY = 'inquiry_deleted_ids';  // id → deletedAt ISO string
const API_BASE = '/api/inquiry';

type DeletedMap = Record<string, string>;

function isRemoteNewer(remote: InquiryRecord, local: InquiryRecord): boolean {
  const remoteTime = new Date(remote.updatedAt).getTime();
  const localTime = new Date(local.updatedAt).getTime();
  return Number.isFinite(remoteTime) && (!Number.isFinite(localTime) || remoteTime > localTime);
}

export const inquiryService = {
  getAll(): InquiryRecord[] {
    return getLocalStorageJSON<InquiryRecord[]>(STORAGE_KEY, []);
  },

  save(records: InquiryRecord[]): void {
    setLocalStorage(STORAGE_KEY, records);
  },

  add(record: InquiryRecord): InquiryRecord[] {
    const records = this.getAll();
    const updated = [...records, record];
    this.save(updated);
    return updated;
  },

  update(id: string, patch: Partial<InquiryRecord>): InquiryRecord[] {
    const records = this.getAll().map((record) =>
      record.id === id
        ? { ...record, ...patch, updatedAt: new Date().toISOString() }
        : record
    );
    this.save(records);
    return records;
  },

  remove(id: string): InquiryRecord[] {
    // 记录删除 ID，防止 mergeFromD1 将其从 D1 重新拉回
    const deleted = getLocalStorageJSON<DeletedMap>(DELETED_KEY, {});
    deleted[id] = new Date().toISOString();
    setLocalStorage(DELETED_KEY, deleted);

    const records = this.getAll().filter((record) => record.id !== id);
    this.save(records);
    return records;
  },

  async pullFromD1(): Promise<InquiryRecord[]> {
    const PAGE_SIZE = 2000;
    const all: InquiryRecord[] = [];
    let offset = 0;

    try {
      while (true) {
        const res = await fetch(
          `${API_BASE}?limit=${PAGE_SIZE}&offset=${offset}`,
          { cache: 'no-store' }
        );
        if (!res.ok) break;

        const data = await res.json() as { records?: InquiryRecord[]; total?: number };
        const page = Array.isArray(data.records) ? data.records : [];
        all.push(...page);

        // 若本页不足一页，或已达到服务端报告的总数，则结束
        if (page.length < PAGE_SIZE) break;
        if (typeof data.total === 'number' && all.length >= data.total) break;

        offset += PAGE_SIZE;
      }
    } catch {
      // 网络失败时返回已拉到的部分，不清空
    }

    return all;
  },

  async getMeta(): Promise<{ count: number; maxUpdatedAt: string | null }> {
    try {
      const res = await fetch(`${API_BASE}/meta`, { cache: 'no-store' });
      if (!res.ok) return { count: -1, maxUpdatedAt: null };
      return await res.json() as { count: number; maxUpdatedAt: string | null };
    } catch {
      return { count: -1, maxUpdatedAt: null };
    }
  },

  syncToD1(record: InquiryRecord): void {
    void (async () => {
      try {
        await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
      } catch {
        // D1 同步失败不阻塞本地业务操作。
      }
    })();
  },

  updateInD1(record: InquiryRecord): void {
    void (async () => {
      try {
        await fetch(`${API_BASE}/${encodeURIComponent(record.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
      } catch {
        // D1 同步失败不阻塞本地业务操作。
      }
    })();
  },

  patchInD1(id: string, patch: Partial<InquiryRecord>): void {
    void (async () => {
      try {
        await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
      } catch {
        // D1 同步失败不阻塞本地业务操作。
      }
    })();
  },

  deleteFromD1(id: string): void {
    void (async () => {
      try {
        await fetch(`${API_BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      } catch {
        // D1 同步失败不阻塞本地业务操作。
      }
    })();
  },

  mergeFromD1(d1Records: InquiryRecord[]): InquiryRecord[] {
    // 清理 30 天前的删除记录，避免 localStorage 无限增长
    const rawDeleted = getLocalStorageJSON<DeletedMap>(DELETED_KEY, {});
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const deletedIds: DeletedMap = Object.fromEntries(
      Object.entries(rawDeleted).filter(([, ts]) => new Date(ts).getTime() > cutoff)
    );
    setLocalStorage(DELETED_KEY, deletedIds);

    const local = this.getAll();
    const localMap = new Map(local.map((record) => [record.id, record]));

    for (const d1Record of d1Records) {
      // D1 软删除标记 → 从本地移除，并写入 deletedIds 防止被重新拉回
      if (d1Record.status === 'deleted') {
        localMap.delete(d1Record.id);
        deletedIds[d1Record.id] = d1Record.updatedAt;
        setLocalStorage(DELETED_KEY, deletedIds);
        continue;
      }
      // 本地已删除的记录不允许 D1 旧版本重新覆盖
      if (deletedIds[d1Record.id]) continue;
      const localRecord = localMap.get(d1Record.id);
      if (!localRecord || isRemoteNewer(d1Record, localRecord)) {
        localMap.set(d1Record.id, d1Record);
      }
    }

    const merged = Array.from(localMap.values()).sort((a, b) =>
      b.inquiryNo.localeCompare(a.inquiryNo)
    );
    this.save(merged);
    return merged;
  },

  pushLocalToD1(d1Records: InquiryRecord[]): void {
    const d1Map = new Map(d1Records.map((record) => [record.id, record]));
    const local = this.getAll();

    for (const localRecord of local) {
      const d1Record = d1Map.get(localRecord.id);
      if (!d1Record) {
        this.syncToD1(localRecord);
      } else if (d1Record.status !== 'deleted' && isRemoteNewer(localRecord, d1Record)) {
        // D1 已软删除的记录不允许本地旧版本覆盖回来
        this.updateInD1(localRecord);
      }
    }
  },
};
