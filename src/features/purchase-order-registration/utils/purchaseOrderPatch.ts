import type { InquiryRecord } from '@/features/inquiry/types';

export const PURCHASE_ORDER_EDITABLE_FIELDS = [
  'purchaseOrderNo',
  'purchaseOrderSupplier',
  'purchaseOrderSupplierId',
  'purchaseOrderAmount',
  'orderDeliveryDate',
  'orderDeliveryStatus',
  'orderDeliveryConsignee',
] as const satisfies ReadonlyArray<keyof InquiryRecord>;

export type PurchaseOrderEditableValues = Pick<InquiryRecord, typeof PURCHASE_ORDER_EDITABLE_FIELDS[number]>;

/** 只比较打开弹窗时的 baseline，后台最新 record 不参与 diff，避免把旧本地值写回。 */
export function buildPurchaseOrderDirtyPatch(
  baseline: Partial<PurchaseOrderEditableValues>,
  next: Partial<PurchaseOrderEditableValues>
): Partial<InquiryRecord> {
  const patch: Partial<InquiryRecord> = {};
  PURCHASE_ORDER_EDITABLE_FIELDS.forEach((field) => {
    if (next[field] !== baseline[field]) {
      (patch as Record<string, unknown>)[field] = next[field];
    }
  });
  if ('purchaseOrderSupplier' in patch || 'purchaseOrderSupplierId' in patch) {
    patch.purchaseOrderSupplier = next.purchaseOrderSupplier;
    patch.purchaseOrderSupplierId = next.purchaseOrderSupplierId;
  }
  return patch;
}
