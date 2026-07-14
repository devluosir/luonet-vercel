import type { InquiryRecord, PurchaseSupplierQuoteStatus } from '@/features/inquiry/types';
import type { PurchaseSupplierActivityItem } from '../types';

function toSortTime(value: string | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function derivePurchaseSupplierActivities(
  records: InquiryRecord[],
  supplierId: string
): PurchaseSupplierActivityItem[] {
  if (!supplierId) return [];

  return records
    .flatMap((record) => {
      if (record.status === 'deleted') return [];
      const quoteStatus = record.purchaseSupplierStatuses?.find(
        (status): status is PurchaseSupplierQuoteStatus => status.purchaseSupplierId === supplierId
      );
      if (!quoteStatus) return [];

      return [{
        id: record.id,
        inquiryNo: record.inquiryNo,
        description: record.description,
        inquiryDate: record.inquiryDate,
        updatedAt: record.updatedAt,
        orderNo: record.orderNo,
        quoteStatus,
      }];
    })
    .sort((left, right) => {
      const rightTime = toSortTime(right.inquiryDate) || toSortTime(right.updatedAt);
      const leftTime = toSortTime(left.inquiryDate) || toSortTime(left.updatedAt);
      return rightTime - leftTime;
    });
}
