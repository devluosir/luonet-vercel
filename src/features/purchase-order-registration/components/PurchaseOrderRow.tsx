'use client';

import { CalendarDays } from 'lucide-react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { stripDateBrackets } from '@/features/inquiry/utils/inquiryUtils';
import { getOrderRowBgClass } from '@/features/inquiry/utils/orderStatus';
import { OrderNoText } from '@/features/order/components/OrderNoText';
import {
  type PurchaseOrderTableBreakpoint,
  showConfirmDateCol,
  showCustomerNoCol,
  showPurchaseOrderNoCol,
} from '../utils/purchaseOrderTableLayout';
import { formatPurchaseOrderSuppliers, getPurchaseOrderSuppliers } from '../utils/purchaseOrderSuppliers';

function getRowTextClass(record: InquiryRecord): string {
  if (record.orderSubStatus === 'cancelled') return 'text-gray-900 dark:text-gray-100';
  const status = record.orderDeliveryStatus?.trim() ?? '';
  if (status.startsWith('交货')) return 'text-blue-600 dark:text-blue-400';
  if (status.startsWith('发票')) return 'text-gray-900 dark:text-gray-100';
  return 'text-pink-500 dark:text-pink-400';
}

function getOrderSubStatusRemarkClass(record: InquiryRecord): string {
  if (record.orderSubStatus === 'cancelled') return 'text-red-600 dark:text-red-400';
  if (record.orderSubStatus === 'suspended') return 'text-green-600 dark:text-green-400';
  if (record.orderSubStatus === 'followup') return 'text-blue-600 dark:text-blue-400';
  return 'text-gray-500 dark:text-gray-400';
}

function ReadOnlyText({
  value,
  fallback,
  placeholder = '—',
}: {
  value: string | undefined;
  fallback?: string;
  placeholder?: string;
}) {
  const display = value?.trim() || fallback?.trim() || '';
  return (
    <span
      title={display || undefined}
      className={`block min-w-0 truncate px-0.5 text-xs ${
        display ? 'text-gray-500 dark:text-gray-400' : 'text-gray-200 dark:text-gray-700'
      }`}
    >
      {display || placeholder}
    </span>
  );
}

type PurchaseCurrency = '¥' | '$' | '€';

function formatPurchaseAmount(value: string | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  const currency: PurchaseCurrency = raw.startsWith('$') ? '$' : raw.startsWith('€') ? '€' : '¥';
  const amount = parseFloat(raw.replace(/^[¥$€]/, '').replace(/,/g, ''));
  if (Number.isNaN(amount)) return null;
  return `${currency}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface PurchaseOrderRowProps {
  record: InquiryRecord;
  bp: PurchaseOrderTableBreakpoint;
  canViewFinancials: boolean;
  onOpenEdit?: (record: InquiryRecord) => void;
}

export function PurchaseOrderRow({ record, bp, canViewFinancials, onOpenEdit }: PurchaseOrderRowProps) {
  const rowTextClass = getRowTextClass(record);
  const purchaseOrderNoCol = showPurchaseOrderNoCol(bp);
  const confirmDateCol = showConfirmDateCol(bp);
  const customerNoCol = showCustomerNoCol(bp);
  const customerNoFallback = (record.customerNo ?? '').replace(/RFQ/g, 'PO');
  const orderSubStatusRemark = record.orderSubStatusRemark?.trim();
  const purchaseOrderNo = record.purchaseOrderNo?.trim() ?? '';
  const supplierDisplay = formatPurchaseOrderSuppliers(getPurchaseOrderSuppliers(record));
  const purchaseAmountDisplay = formatPurchaseAmount(record.purchaseOrderAmount);
  const deliveryDate = record.orderDeliveryDate ? stripDateBrackets(record.orderDeliveryDate) : '';
  const deliveryStatus = record.orderDeliveryStatus?.trim() || '';
  const deliveryConsignee = record.orderDeliveryConsignee?.trim() || '';

  return (
    <tr
      className={`group cursor-pointer border-b border-gray-100 align-middle last:border-b-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/30 ${getOrderRowBgClass(record)}`}
      onClick={() => onOpenEdit?.(record)}
      title="点击编辑采购订单"
    >
      <td className="max-w-0 overflow-hidden px-2 py-2 sm:px-3">
        <div
          className="flex min-w-0 flex-col gap-0.5 rounded px-0.5 -mx-0.5"
          title={`${record.orderNo ?? ''} ${record.inquiryNo}`}
        >
          <OrderNoText record={record} textClassName={rowTextClass} />
          <span className="block truncate font-mono text-[10px] text-gray-400 dark:text-gray-500">
            {record.inquiryNo}
          </span>
        </div>
      </td>

      <td className="max-w-0 overflow-hidden px-2 py-2">
        <p className={`truncate text-[13px] ${rowTextClass}`} title={record.description}>{record.description}</p>
      </td>

      {purchaseOrderNoCol && (
        <td className="max-w-0 overflow-hidden px-1.5 py-2 sm:px-2">
          <span
            title={purchaseOrderNo || undefined}
            className={`block min-h-[1.25rem] min-w-0 truncate px-0.5 text-[13px] ${
              purchaseOrderNo ? rowTextClass : 'text-gray-300 dark:text-gray-700'
            }`}
          >
            {purchaseOrderNo || '采购单号'}
          </span>
        </td>
      )}

      <td className="max-w-0 overflow-hidden px-1.5 py-2 sm:px-2">
        <span
          title={supplierDisplay || undefined}
          className={`block min-h-[1.25rem] min-w-0 truncate px-0.5 text-[13px] ${
            supplierDisplay ? rowTextClass : 'text-gray-300 dark:text-gray-700'
          }`}
        >
          {supplierDisplay || '供应商'}
        </span>
      </td>

      {canViewFinancials && (
        <td className="max-w-0 overflow-hidden px-2 py-2">
          <span
            title={purchaseAmountDisplay ?? undefined}
            className={`block min-h-[1.25rem] min-w-0 truncate px-0.5 text-xs ${
              purchaseAmountDisplay ? rowTextClass : 'text-gray-200 dark:text-gray-700'
            }`}
          >
            {purchaseAmountDisplay ?? '¥/$/€'}
          </span>
        </td>
      )}

      <td className="max-w-0 overflow-hidden whitespace-nowrap px-1.5 py-2 sm:px-2">
        <div className="flex min-w-0 items-center gap-0.5" title={deliveryDate || undefined}>
          <span className={`shrink-0 px-0.5 text-xs ${deliveryDate ? rowTextClass : 'text-gray-200 dark:text-gray-700'}`}>
            {deliveryDate || 'm.D'}
          </span>
          <CalendarDays className="h-3 w-3 shrink-0 text-gray-300 dark:text-gray-600" />
        </div>
      </td>

      {confirmDateCol && (
        <td className="max-w-0 overflow-hidden whitespace-nowrap px-2 py-2">
          <ReadOnlyText value={record.orderConfirmDate ? stripDateBrackets(record.orderConfirmDate) : undefined} placeholder="m.D" />
        </td>
      )}

      {customerNoCol && (
        <td className="max-w-0 overflow-hidden px-2 py-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <ReadOnlyText value={record.orderCustomerNo} fallback={customerNoFallback} />
            {record.orderSubStatus && orderSubStatusRemark && (
              <span
                className={`block truncate px-0.5 text-[10px] leading-4 ${getOrderSubStatusRemarkClass(record)}`}
                title={orderSubStatusRemark}
              >
                {orderSubStatusRemark}
              </span>
            )}
          </div>
        </td>
      )}

      <td className="max-w-0 overflow-hidden px-1.5 py-2 sm:px-2">
        <span
          title={[deliveryStatus, deliveryConsignee].filter(Boolean).join('\n') || undefined}
          className={`block min-h-[1.25rem] min-w-0 truncate px-0.5 text-[13px] ${
            deliveryStatus ? rowTextClass : 'text-gray-200 dark:text-gray-700'
          }`}
        >
          <span className="block truncate">{deliveryStatus || '执行情况'}</span>
          {deliveryConsignee && (
            <span className="block truncate text-blue-600 dark:text-blue-400">{deliveryConsignee}</span>
          )}
        </span>
      </td>
    </tr>
  );
}
