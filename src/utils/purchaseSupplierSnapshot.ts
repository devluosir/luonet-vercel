import type { PurchaseOrderData } from '@/types/purchase';

function firstNonEmptyLine(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').split('\n').find((line) => line.trim())?.trim() || '';
}

/** 新标准名称优先；旧数据从 attn 第一条非空行兼容解析。 */
export function resolvePurchaseSupplierSnapshotName(
  data: Partial<PurchaseOrderData> | null | undefined,
  legacySupplierName = ''
): string {
  const standardName = typeof data?.supplierName === 'string' ? data.supplierName.trim() : '';
  if (standardName) return standardName;
  return firstNonEmptyLine(data?.attn) || firstNonEmptyLine(legacySupplierName);
}

/** 搜索保留标准名称、旧顶层名称和完整 attn，兼容新旧混合历史。 */
export function getPurchaseSupplierSearchText(
  data: Partial<PurchaseOrderData> | null | undefined,
  legacySupplierName = ''
): string {
  return [resolvePurchaseSupplierSnapshotName(data, legacySupplierName), legacySupplierName, data?.supplierName, data?.attn]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .join(' ')
    .toLowerCase();
}
