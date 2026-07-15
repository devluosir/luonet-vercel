'use client';

import { CalendarDays } from 'lucide-react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { stripDateBrackets } from '@/features/inquiry/utils/inquiryUtils';
import { getOrderRowBgClass } from '@/features/inquiry/utils/orderStatus';
import {
  type OrderTableBreakpoint,
  showAdminCols,
  showConfirmDateCol,
  showCustomerCol,
  showLgCols,
} from '../utils/orderTableLayout';
import { OrderNoText } from './OrderNoText';

// 执行情况是自由文本，不是三选一枚举：只有明确写"发票..."（已开票/基本完成）才算完成态，
// 其余任何文字（含用户自己写的说明，比如"合同确认中"）都视同"备货"阶段，保持"进行中"的粉色。
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

type Currency = '¥' | '$';

function parseAmount(value: string | number | undefined): { currency: Currency; numStr: string } {
  if (value === undefined || value === null) return { currency: '¥', numStr: '' };
  const raw = String(value).trim();
  return {
    currency: raw.startsWith('$') ? '$' : '¥',
    numStr: raw.replace(/^[¥$]/, '').replace(/,/g, ''),
  };
}

function formatAmountDisplay(value: string | number | undefined, currencyOverride?: Currency): string | null {
  if (value === undefined || value === null) return null;
  const { currency, numStr } = parseAmount(value);
  const amount = parseFloat(numStr);
  if (Number.isNaN(amount)) return null;
  return `${currencyOverride ?? currency}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getRecordCurrency(record: InquiryRecord): Currency {
  if (record.orderAmount !== undefined && record.orderAmount !== null) {
    return parseAmount(record.orderAmount).currency;
  }
  if (record.orderReceivedAmount !== undefined && record.orderReceivedAmount !== null) {
    return parseAmount(record.orderReceivedAmount).currency;
  }
  return '¥';
}

interface OrderRowProps {
  record: InquiryRecord;
  bp: OrderTableBreakpoint;
  canViewFinancials: boolean;
  onOpenEdit?: (record: InquiryRecord) => void;
  canBatchEdit?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function OrderRow({
  record,
  bp,
  canViewFinancials,
  onOpenEdit,
  canBatchEdit = false,
  selected = false,
  onToggleSelect,
}: OrderRowProps) {
  const customerCol = showCustomerCol(bp);
  const confirmDateCol = showConfirmDateCol(bp);
  const lgCols = showLgCols(bp);
  const adminCols = showAdminCols(bp, canViewFinancials);
  const rowTextClass = getRowTextClass(record);
  const orderSubStatusRemark = record.orderSubStatusRemark?.trim();
  const customerNoFallback = (record.customerNo ?? '').replace(/RFQ/g, 'PO');
  const customerNoDisplay = record.orderCustomerNo?.trim() || customerNoFallback.trim() || '';
  const deliveryDate = record.orderDeliveryDate ? stripDateBrackets(record.orderDeliveryDate) : '';
  const confirmDate = record.orderConfirmDate ? stripDateBrackets(record.orderConfirmDate) : '';
  const paymentDate = record.orderPaymentDate?.trim() || '';
  const deliveryStatus = record.orderDeliveryStatus?.trim() || '';
  const deliveryConsignee = record.orderDeliveryConsignee?.trim() || '';
  const amountDisplay = formatAmountDisplay(record.orderAmount);
  const receivedAmountDisplay = formatAmountDisplay(record.orderReceivedAmount, getRecordCurrency(record));

  return (
    <tr
      className={`group cursor-pointer border-b border-gray-100 align-middle last:border-b-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/30 ${getOrderRowBgClass(record)}`}
      onClick={() => onOpenEdit?.(record)}
      title="点击编辑订单"
    >
      {canBatchEdit && (
        <td className="w-8 px-2 py-2 text-center" onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(record.id)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-blue-600 dark:border-gray-600"
            aria-label={`选择 ${record.orderNo ?? record.inquiryNo}`}
          />
        </td>
      )}

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

      <td className="max-w-0 overflow-hidden whitespace-nowrap px-1.5 py-2 sm:px-2">
        <div className="flex min-w-0 items-center gap-0.5" title={deliveryDate || undefined}>
          <span className={`shrink-0 px-0.5 text-xs ${deliveryDate ? rowTextClass : 'text-gray-200 dark:text-gray-700'}`}>
            {deliveryDate || 'm.D'}
          </span>
          <CalendarDays className="h-3 w-3 shrink-0 text-gray-300 dark:text-gray-600" />
        </div>
      </td>

      {customerCol && (
        <td className="max-w-0 overflow-hidden px-2 py-2 text-[13px]">
          <span className={`block min-w-0 truncate ${rowTextClass}`} title={record.inquirer}>
            {record.inquirer}
          </span>
        </td>
      )}

      <td className="max-w-0 overflow-hidden px-1.5 py-2 sm:px-2">
        <p className={`truncate text-[13px] ${rowTextClass}`} title={record.description}>{record.description}</p>
        {bp === 'sm' && (
          <p className={`truncate text-[10px] ${rowTextClass}`} title={record.inquirer}>{record.inquirer}</p>
        )}
      </td>

      {confirmDateCol && (
        <td className="max-w-0 overflow-hidden whitespace-nowrap px-1.5 py-2 sm:px-2">
          <div className="flex min-w-0 items-center gap-0.5" title={confirmDate || undefined}>
            <span className={`shrink-0 px-0.5 text-xs ${confirmDate ? rowTextClass : 'text-gray-200 dark:text-gray-700'}`}>
              {confirmDate || 'm.D'}
            </span>
            <CalendarDays className="h-3 w-3 shrink-0 text-gray-300 dark:text-gray-600" />
          </div>
        </td>
      )}

      {lgCols && (
        <td className="max-w-0 overflow-hidden px-2 py-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span
              title={customerNoDisplay || undefined}
              className={`block min-h-[1.25rem] min-w-0 truncate px-0.5 text-xs ${
                customerNoDisplay ? rowTextClass : 'text-gray-200 dark:text-gray-700'
              }`}
            >
              {customerNoDisplay || '—'}
            </span>
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

      {adminCols && (
        <>
          <td className="max-w-0 overflow-hidden px-2 py-2">
            <span
              title={amountDisplay ?? undefined}
              className={`block min-h-[1.25rem] min-w-0 truncate px-0.5 text-xs ${
                amountDisplay ? rowTextClass : 'text-gray-200 dark:text-gray-700'
              }`}
            >
              {amountDisplay ?? '¥/$'}
            </span>
          </td>
          <td className="max-w-0 overflow-hidden whitespace-nowrap px-2 py-2">
            <div className="flex min-w-0 items-center gap-0.5" title={paymentDate || undefined}>
              <span className={`shrink-0 px-0.5 text-xs ${paymentDate ? rowTextClass : 'text-gray-200 dark:text-gray-700'}`}>
                {paymentDate || 'm'}
              </span>
              <CalendarDays className="h-3 w-3 shrink-0 text-gray-300 dark:text-gray-600" />
            </div>
          </td>
          <td className="max-w-0 overflow-hidden px-2 py-2">
            <span
              title={receivedAmountDisplay ?? undefined}
              className={`block min-h-[1.25rem] min-w-0 truncate px-0.5 text-xs ${
                receivedAmountDisplay ? rowTextClass : 'text-gray-200 dark:text-gray-700'
              }`}
            >
              {receivedAmountDisplay ?? '¥/$'}
            </span>
          </td>
        </>
      )}
    </tr>
  );
}
