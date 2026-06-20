'use client';

import { useCallback } from 'react';
import type { CustomerQuoteStatus, InquiryBasicInput, SupplierQuoteStatus } from '../types';
import { useInquiryStore } from '../state/inquiry.store';
import { createId } from '../utils/inquiryUtils';

export function useInquiryActions() {
  const addRecord = useInquiryStore((state) => state.addRecord);
  const updateRecord = useInquiryStore((state) => state.updateRecord);
  const removeRecord = useInquiryStore((state) => state.removeRecord);
  const addSupplier = useInquiryStore((state) => state.addSupplier);
  const updateSupplier = useInquiryStore((state) => state.updateSupplier);
  const removeSupplier = useInquiryStore((state) => state.removeSupplier);
  const addQuotedStatus = useInquiryStore((state) => state.addQuotedStatus);
  const updateQuotedStatus = useInquiryStore((state) => state.updateQuotedStatus);
  const removeQuotedStatus = useInquiryStore((state) => state.removeQuotedStatus);

  const createRecord = useCallback(
    (
      input: InquiryBasicInput,
      supplierStatuses?: SupplierQuoteStatus[],
      quotedStatuses?: CustomerQuoteStatus[]
    ) => {
      addRecord({
        ...input,
        supplierStatuses: supplierStatuses ?? [
          { id: createId(), supplierShortName: '飞罗', status: 'pending' },
          { id: createId(), supplierShortName: '昆同', status: 'pending' },
        ],
        quotedStatuses: quotedStatuses ?? [],
      });
    },
    [addRecord]
  );

  const updateRecordBasic = useCallback(
    (id: string, input: InquiryBasicInput) => {
      updateRecord(id, input);
    },
    [updateRecord]
  );

  const createSupplier = useCallback(
    (recordId: string, supplier: Omit<SupplierQuoteStatus, 'id'>) => {
      addSupplier(recordId, supplier);
    },
    [addSupplier]
  );

  const createQuotedStatus = useCallback(
    (recordId: string, status: Omit<CustomerQuoteStatus, 'id'>) => {
      addQuotedStatus(recordId, status);
    },
    [addQuotedStatus]
  );

  return {
    createRecord,
    updateRecordBasic,
    removeRecord,
    createSupplier,
    updateSupplier,
    removeSupplier,
    createQuotedStatus,
    updateQuotedStatus,
    removeQuotedStatus,
  };
}
