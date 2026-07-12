export const INQUIRY_CLEARABLE_FIELDS = [
  'orderNo',
  'orderSubStatus',
  'orderSubStatusRemark',
  'customerId',
  'contactId',
] as const;

/**
 * 合并询报价 PUT 数据，并把 null 统一解释为“删除可选字段”。
 * 完整记录仍维持既有规则：未携带的可清空字段也会从旧 JSON 中移除。
 */
export function mergeInquiryPayload<T extends Record<string, unknown>>(
  existing: T,
  body: T,
  isFullInquiryRecord: boolean
): T {
  const merged = { ...existing, ...body } as T;

  for (const field of INQUIRY_CLEARABLE_FIELDS) {
    if (body[field] === null || (isFullInquiryRecord && !(field in body))) {
      delete merged[field];
    }
  }

  return merged;
}
