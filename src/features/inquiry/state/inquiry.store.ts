import { create } from 'zustand';
import type {
  CustomerQuoteStatus,
  InquiryBasicInput,
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
  updateRecord: (id: string, patch: Partial<InquiryBasicInput>) => void;
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
  },

  updateRecord: (id, patch) => {
    const updated = inquiryService.update(id, patch);
    set({ records: updated });
  },

  removeRecord: (id) => {
    const updated = inquiryService.remove(id);
    set({ records: updated });
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
  },
}));
