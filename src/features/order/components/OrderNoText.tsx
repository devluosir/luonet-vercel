import type { InquiryRecord } from '@/features/inquiry/types';
import { getOrderSubStatusLetter } from '@/features/inquiry/utils/orderStatus';

/**
 * 订单编号 + C/P/S 字母标记（善后完成时追加绿色 "-OK"）。订单状态表 OrderRow 与
 * 采购订单表 PurchaseOrderRow 共用同一份实现，避免两处口径漂移（历史上曾因为
 * 类似的逐处复制实现导致改一处漏一处的 bug）。
 */
export function OrderNoText({ record, textClassName }: { record: InquiryRecord; textClassName: string }) {
  const { orderNo } = record;
  if (!orderNo) return null;
  const badge = getOrderSubStatusLetter(record);
  return (
    <span className={`inline-flex max-w-full min-w-0 items-baseline gap-0.5 truncate font-mono text-[13px] font-bold leading-5 ${textClassName}`}>
      <span className="truncate">{orderNo}</span>
      {badge && (
        <span className="shrink-0 font-bold text-red-500">
          {badge.letter}
          {badge.completed && <span className="text-green-500">-OK</span>}
        </span>
      )}
    </span>
  );
}
