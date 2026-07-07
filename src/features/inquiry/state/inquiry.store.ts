import { create } from 'zustand';
import type {
  CustomerQuoteStatus,
  InquiryRecord,
  InquiryRecordDraft,
  SupplierQuoteStatus,
} from '../types';
import { inquiryService } from '../services/inquiry.service';
import { createId } from '../utils/inquiryUtils';

interface InquiryStore {
  records: InquiryRecord[];
  init: () => void;
  addRecord: (draft: InquiryRecordDraft) => void;
  updateRecord: (id: string, patch: Partial<InquiryRecord>) => void;
  patchRecordForView: (id: string, patch: Partial<InquiryRecord>) => void;
  removeRecord: (id: string) => void;
  addSupplier: (recordId: string, supplier: Omit<SupplierQuoteStatus, 'id'>) => void;
  updateSupplier: (
    recordId: string,
    supplierId: string,
    patch: Partial<SupplierQuoteStatus>
  ) => void;
  removeSupplier: (recordId: string, supplierId: string) => void;
  addQuotedStatus: (recordId: string, qs: Omit<CustomerQuoteStatus, 'id'>) => void;
  updateQuotedStatus: (
    recordId: string,
    qsId: string,
    patch: Partial<CustomerQuoteStatus>
  ) => void;
  removeQuotedStatus: (recordId: string, qsId: string) => void;
  /** 原子替换供应商列表与已报价列表（modal 保存时一次提交） */
  replaceStatuses: (
    recordId: string,
    suppliers: SupplierQuoteStatus[],
    quotedStatuses: CustomerQuoteStatus[]
  ) => void;
}

function syncUpdatedRecord(records: InquiryRecord[], recordId: string): void {
  const target = records.find((record) => record.id === recordId);
  if (target) inquiryService.updateInD1(target);
}

export const useInquiryStore = create<InquiryStore>((set, get) => ({
  records: [],

  init: () => {
    const records = inquiryService.getAll();
    set({ records });
  },

  addRecord: (draft) => {
    const now = new Date().toISOString();
    const record: InquiryRecord = {
      ...draft,
      id: createId(),
      // 确保每个供应商状态都有 id，防止传入时缺失导致编辑变新增
      supplierStatuses: draft.supplierStatuses.map((s) => ({
        ...s,
        id: s.id || createId(),
      })),
      createdAt: now,
      updatedAt: now,
    };
    const updated = inquiryService.add(record);
    set({ records: updated });
    inquiryService.syncToD1(record);
  },

  updateRecord: (id, patch) => {
    const updated = inquiryService.update(id, patch);
    set({ records: updated });
    syncUpdatedRecord(updated, id);
  },

  patchRecordForView: (id, patch) => {
    const updated = inquiryService.update(id, patch);
    set({ records: updated });
    inquiryService.patchInD1(id, patch);
  },

  removeRecord: (id) => {
    const updated = inquiryService.remove(id);
    set({ records: updated });
    inquiryService.deleteFromD1(id);
  },

  addSupplier: (recordId, supplier) => {
    const records = get().records.map((record) => {
      if (record.id !== recordId) return record;
      return {
        ...record,
        supplierStatuses: [...record.supplierStatuses, { ...supplier, id: createId() }],
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
    syncUpdatedRecord(records, recordId);
  },

  updateSupplier: (recordId, supplierId, patch) => {
    const records = get().records.map((record) => {
      if (record.id !== recordId) return record;
      return {
        ...record,
        supplierStatuses: record.supplierStatuses.map((supplier) =>
          supplier.id === supplierId ? { ...supplier, ...patch } : supplier
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
    syncUpdatedRecord(records, recordId);
  },

  removeSupplier: (recordId, supplierId) => {
    const records = get().records.map((record) => {
      if (record.id !== recordId) return record;
      return {
        ...record,
        supplierStatuses: record.supplierStatuses.filter((supplier) => supplier.id !== supplierId),
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
    syncUpdatedRecord(records, recordId);
  },

  addQuotedStatus: (recordId, qs) => {
    const records = get().records.map((record) => {
      if (record.id !== recordId) return record;
      return {
        ...record,
        quotedStatuses: [...record.quotedStatuses, { ...qs, id: createId() }],
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
    syncUpdatedRecord(records, recordId);
  },

  updateQuotedStatus: (recordId, qsId, patch) => {
    const records = get().records.map((record) => {
      if (record.id !== recordId) return record;
      return {
        ...record,
        quotedStatuses: record.quotedStatuses.map((qs) =>
          qs.id === qsId ? { ...qs, ...patch } : qs
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
    syncUpdatedRecord(records, recordId);
  },

  removeQuotedStatus: (recordId, qsId) => {
    const records = get().records.map((record) => {
      if (record.id !== recordId) return record;
      return {
        ...record,
        quotedStatuses: record.quotedStatuses.filter((qs) => qs.id !== qsId),
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
    syncUpdatedRecord(records, recordId);
  },

  replaceStatuses: (recordId, suppliers, quotedStatuses) => {
    const records = get().records.map((record) => {
      if (record.id !== recordId) return record;
      return {
        ...record,
        supplierStatuses: suppliers,
        quotedStatuses,
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
    syncUpdatedRecord(records, recordId);
  },
}));
