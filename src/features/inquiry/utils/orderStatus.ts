import type { InquiryRecord, OrderSubStatus } from '../types';

/**
 * 善后S 是否已标记完成。只在 orderSubStatus === 'followup' 时有意义——撤销C/悬挂P
 * 没有"完成"的概念，即使误传 orderFollowupCompleted 也不会生效。
 */
export function isFollowupCompleted(record: {
  orderSubStatus?: OrderSubStatus | null;
  orderFollowupCompleted?: boolean | null;
}): boolean {
  return record.orderSubStatus === 'followup' && !!record.orderFollowupCompleted;
}

/**
 * “正常”订单没有 C/P/S 标记，悬挂 P 按既有业务口径仍归入正常；善后 S 标记为"已完成"后
 * 同样归入正常单（辙销 C 不受影响，没有"完成"这个概念）。
 * 兼容历史同步曾将清空后的可选字段持久化为 null 的记录。
 */
export function isNormalOrder(record: {
  orderSubStatus?: OrderSubStatus | null;
  orderFollowupCompleted?: boolean | null;
}): boolean {
  if (record.orderSubStatus == null || record.orderSubStatus === 'suspended') return true;
  return isFollowupCompleted(record);
}

/**
 * 与订单状态表/采购订单表共用的"进行中"判定（原先在 OrderPage.tsx 与
 * PurchaseOrderRegistrationPage.tsx 各自维护一份完全一致的实现，这里收敛成单一定义，
 * 避免两处判断口径漂移）。
 *
 * 执行情况是自由文本（见 DeliveryStatusCell），不是三选一枚举：只有明确写"发票..."
 * （已开票/基本完成）才算完成态，其余任何文字（含用户自己写的说明，比如"合同确认中"）
 * 都视同"备货"阶段，保持"进行中"。悬挂 P 始终视为进行中；善后 S 完成前也始终视为
 * 进行中，完成后则按其真实执行情况文字判断，不再强制算进行中。
 */
export function isInProgressOrder(record: InquiryRecord): boolean {
  if (record.orderSubStatus === 'cancelled') return false;
  if (record.orderSubStatus === 'suspended') return true;
  if (record.orderSubStatus === 'followup' && !isFollowupCompleted(record)) return true;
  const deliveryStatus = record.orderDeliveryStatus?.trim() ?? '';
  return !deliveryStatus.startsWith('发票');
}

/** 订单状态表/采购订单表行背景色：辙销灰、悬挂绿、善后（未完成）红；善后完成后归入正常（无特殊底色）。 */
export function getOrderRowBgClass(record: {
  orderSubStatus?: OrderSubStatus | null;
  orderFollowupCompleted?: boolean | null;
}): string {
  if (record.orderSubStatus === 'cancelled') {
    return 'bg-gray-300 hover:bg-gray-400/70 dark:bg-gray-700 dark:hover:bg-gray-600/80';
  }
  if (record.orderSubStatus === 'suspended') {
    return 'bg-green-100 hover:bg-green-200/75 dark:bg-green-950/45 dark:hover:bg-green-900/45';
  }
  if (record.orderSubStatus === 'followup' && !isFollowupCompleted(record)) {
    return 'bg-red-100 hover:bg-red-200/75 dark:bg-red-950/45 dark:hover:bg-red-900/45';
  }
  return 'hover:bg-gray-50/70 dark:hover:bg-gray-800/30';
}

export interface OrderSubStatusLetter {
  /** 单字母标记：辙销C / 悬挂P / 善后S */
  letter: 'C' | 'P' | 'S';
  /** 善后S 是否已完成——完成时调用方应在字母后追加绿色 "-OK" 后缀 */
  completed: boolean;
}

/** 订单编号旁边的 C/P/S 字母标记 + 善后完成状态，供各表格行组件统一渲染，避免各处口径漂移。 */
export function getOrderSubStatusLetter(record: {
  orderSubStatus?: OrderSubStatus | null;
  orderFollowupCompleted?: boolean | null;
}): OrderSubStatusLetter | null {
  if (!record.orderSubStatus) return null;
  const letter =
    record.orderSubStatus === 'cancelled' ? 'C'
    : record.orderSubStatus === 'suspended' ? 'P'
    : 'S';
  return { letter, completed: isFollowupCompleted(record) };
}
