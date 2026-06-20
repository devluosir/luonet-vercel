import { getLocalStorageJSON, setLocalStorage } from '@/utils/safeLocalStorage';
import type { InquiryRecord } from '../types';

const STORAGE_KEY = 'inquiry_records';

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
};
