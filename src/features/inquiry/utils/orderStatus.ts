import type { InquiryRecord } from '../types';

/**
 * “正常”订单没有 C/P/S 标记，悬挂 P 按既有业务口径仍归入正常。
 * 兼容历史同步曾将清空后的可选字段持久化为 null 的记录。
 */
export function isNormalOrder(record: {
  orderSubStatus?: InquiryRecord['orderSubStatus'] | null;
}): boolean {
  return record.orderSubStatus == null || record.orderSubStatus === 'suspended';
}
