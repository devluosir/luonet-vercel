import type { InquiryRecord, PurchaseOrderSupplierEntry } from '@/features/inquiry/types';

export function getPurchaseOrderSuppliers(record: InquiryRecord): PurchaseOrderSupplierEntry[] {
  if (Array.isArray(record.purchaseOrderSuppliers) && record.purchaseOrderSuppliers.length > 0) {
    return record.purchaseOrderSuppliers;
  }

  const legacyName = record.purchaseOrderSupplier?.trim();
  return legacyName ? [{ id: record.purchaseOrderSupplierId, name: legacyName }] : [];
}

export function formatPurchaseOrderSuppliers(entries: PurchaseOrderSupplierEntry[]): string {
  return entries.map((entry) => entry.name).join('、');
}
