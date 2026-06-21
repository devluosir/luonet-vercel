import { getLocalStorageJSON, setLocalStorage } from '@/utils/safeLocalStorage';
import type { InquiryRecord } from '../types';

const STORAGE_KEY = 'inquiry_records';
const API_BASE = '/api/inquiry';

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
    const records = this.getAll().filter((record) => record.id !== id);
    this.save(records);
    return records;
  },

  async pullFromD1(): Promise<InquiryRecord[]> {
    try {
      const res = await fetch(`${API_BASE}?limit=500`, { cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json() as { records?: InquiryRecord[] };
      return Array.isArray(data.records) ? data.records : [];
    } catch {
      return [];
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
    const local = this.getAll();
    const localMap = new Map(local.map((record) => [record.id, record]));

    for (const d1Record of d1Records) {
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
      } else if (isRemoteNewer(localRecord, d1Record)) {
        this.updateInD1(localRecord);
      }
    }
  },
};
