'use client';

import { InquiryQuoteStatusDisplay } from '@/features/inquiry/components/InquiryQuoteStatusDisplay';
import { stripDateBrackets } from '@/features/inquiry/utils/inquiryUtils';
import { getOrderSubStatusLetter, isFollowupCompleted } from '@/features/inquiry/utils/orderStatus';
import type { InquiryRecord } from '@/features/inquiry/types';
import { computePurchaseMainStatus, formatPurchaseMainStatus, getPurchaseRowColorClass } from '../utils/purchaseInquiryStatus';

interface PurchaseRegistrationRowProps {
  record: InquiryRecord;
  onEditRecord: (record: InquiryRecord) => void;
  purchaseSupplierNameById: Map<string, string>;
}

export function PurchaseRegistrationRow({ record, onEditRecord, purchaseSupplierNameById }: PurchaseRegistrationRowProps) {
  const mainStatus = formatPurchaseMainStatus(computePurchaseMainStatus(record));
  const subStatusBadge = getOrderSubStatusLetter(record);
  const description = record.description?.trim() || '';

  // 供只读预览用的影子记录：把采购部专属供应商/报价状态接到 InquiryQuoteStatusDisplay 期望的字段名上
  const previewRecord: InquiryRecord = {
    ...record,
    supplierStatuses: (record.purchaseSupplierStatuses ?? []).map((supplier) => {
      const currentName = supplier.purchaseSupplierId
        ? purchaseSupplierNameById.get(supplier.purchaseSupplierId)
        : undefined;
      return currentName ? { ...supplier, supplierShortName: currentName } : supplier;
    }),
    quotedStatuses: record.purchaseQuotedStatuses ?? [],
  };

  // 行颜色：销售侧已关闭/已回复客户无法报价时优先整行变灰（与状态列共用 computePurchaseMainStatus
  // 的最高两档判断）；否则回退到采购部自己的 purchaseQuotedStatuses 判断（已报价→蓝，其余→粉）
  const mainColorClass = getPurchaseRowColorClass(record);

  return (
    <tr
      className="group cursor-pointer border-b border-gray-100 align-middle last:border-b-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/30"
      onClick={() => onEditRecord(record)}
    >
      <td className="max-w-0 overflow-hidden px-3 py-2">
        <div className="flex min-w-0 flex-col gap-0 leading-tight">
          <span className={`block truncate font-mono text-[13px] font-bold leading-4 ${mainColorClass}`}>
            {record.inquiryNo}
          </span>
          {/* 已成单时，日期 + 订单号 + 颜色状态与询报价登记表 InquiryRow 保持一致 */}
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-gray-400 dark:text-gray-500">
            <span className="shrink-0">{stripDateBrackets(record.inquiryDate)}</span>
            {record.orderNo && (
              <span
                className={`inline-flex min-w-0 items-center gap-0.5 truncate rounded-full bg-green-50 px-1.5 py-0 text-[11px] font-medium leading-4 text-green-700 ring-1 dark:bg-green-950/40 dark:text-green-400 ${
                  record.orderSubStatus && !isFollowupCompleted(record) ? 'ring-red-300 dark:ring-red-700' : 'ring-green-200 dark:ring-green-800'
                }`}
              >
                {record.orderNo}
                {subStatusBadge && (
                  <span className="font-bold text-red-500">
                    {subStatusBadge.letter}
                    {subStatusBadge.completed && <span className="text-green-500">-OK</span>}
                  </span>
                )}
              </span>
            )}
          </span>
        </div>
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2">
        <span
          title={description || undefined}
          className={`block min-h-[1.25rem] min-w-0 truncate px-0.5 text-[13px] font-medium ${
            description ? mainColorClass : 'text-gray-300 dark:text-gray-700'
          }`}
        >
          {description || '内容描述'}
        </span>
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2">
        <InquiryQuoteStatusDisplay record={previewRecord} />
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2">
        {mainStatus ? (
          <span
            title={mainStatus.label}
            className={`inline-flex max-w-full items-center truncate whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${mainStatus.className}`}
          >
            {mainStatus.label}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-300 dark:bg-gray-800/60 dark:text-gray-600">
            —
          </span>
        )}
      </td>
    </tr>
  );
}
