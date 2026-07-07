'use client';

import { useState } from 'react';
import { DeliveryStatusCell } from '@/features/order/components/DeliveryStatusCell';
import type { InquiryRecord, PurchaseInquiryStatus } from '@/features/inquiry/types';

type EditField = 'content' | 'deliveryStatus' | null;

const STATUS_LABELS: Record<PurchaseInquiryStatus, string> = {
  internal_supplier: '内部供应商',
  reported_to_sales: '已报至销售部',
};

interface EditableTextProps {
  editing: boolean;
  value: string | undefined;
  placeholder: string;
  onActivate: () => void;
  onSave: (value: string | undefined) => void;
  onCancel: () => void;
}

function EditableText({ editing, value, placeholder, onActivate, onSave, onCancel }: EditableTextProps) {
  const display = value?.trim() || '';

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        defaultValue={display}
        placeholder={placeholder}
        onBlur={(e) => onSave(e.target.value.trim() || undefined)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        className="w-full rounded border border-blue-300 bg-white px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-200 dark:border-blue-600 dark:bg-gray-900 dark:text-gray-100"
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onActivate();
      }}
      title={display || undefined}
      className={`block min-h-[1.25rem] min-w-0 truncate cursor-text rounded px-0.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 ${
        display ? 'text-gray-800 dark:text-gray-100' : 'text-gray-300 dark:text-gray-700'
      }`}
    >
      {display || placeholder}
    </span>
  );
}

interface PurchaseRegistrationRowProps {
  record: InquiryRecord;
  onUpdate: (patch: Partial<InquiryRecord>) => void;
}

export function PurchaseRegistrationRow({ record, onUpdate }: PurchaseRegistrationRowProps) {
  const [activeField, setActiveField] = useState<EditField>(null);
  const hasOrder = Boolean(record.orderNo?.trim());
  const rowTextClass = record.orderDeliveryStatus?.trim().startsWith('发票')
    ? 'text-gray-900 dark:text-gray-100'
    : record.orderDeliveryStatus?.trim().startsWith('交货')
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-pink-500 dark:text-pink-400';

  return (
    <tr className="border-b border-gray-100 align-middle last:border-b-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/30">
      <td className="max-w-0 overflow-hidden px-3 py-2">
        <span className="block truncate font-mono text-[11px] font-bold text-gray-800 dark:text-gray-100">
          {record.inquiryNo}
        </span>
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2">
        <EditableText
          editing={activeField === 'content'}
          value={record.purchaseContentDesc}
          placeholder="内容描述"
          onActivate={() => setActiveField('content')}
          onSave={(value) => {
            setActiveField(null);
            onUpdate({ purchaseContentDesc: value ?? '' });
          }}
          onCancel={() => setActiveField(null)}
        />
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2">
        <select
          value={record.purchaseInquiryStatus ?? ''}
          onChange={(e) =>
            onUpdate({
              purchaseInquiryStatus: (e.target.value || undefined) as PurchaseInquiryStatus | undefined,
            })
          }
          className="h-7 w-full rounded-lg border border-gray-200 bg-white px-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="">未设置</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            hasOrder
              ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {hasOrder ? '已成单' : '未成单'}
        </span>
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2">
        <DeliveryStatusCell
          editing={activeField === 'deliveryStatus'}
          value={record.orderDeliveryStatus}
          consigneeValue={record.orderDeliveryConsignee}
          textClassName={rowTextClass}
          onActivate={() => setActiveField('deliveryStatus')}
          onSave={(status, consignee) => {
            setActiveField(null);
            onUpdate({
              orderDeliveryStatus: status ?? '',
              orderDeliveryConsignee: consignee ?? '',
            });
          }}
          onCancel={() => setActiveField(null)}
        />
      </td>
    </tr>
  );
}
