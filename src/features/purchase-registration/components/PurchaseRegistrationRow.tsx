'use client';

import { useState } from 'react';
import { InquiryQuoteStatusDisplay } from '@/features/inquiry/components/InquiryQuoteStatusDisplay';
import type { InquiryRecord } from '@/features/inquiry/types';

type EditField = 'content' | null;

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
  onEditRecord: (record: InquiryRecord) => void;
}

export function PurchaseRegistrationRow({ record, onUpdate, onEditRecord }: PurchaseRegistrationRowProps) {
  const [activeField, setActiveField] = useState<EditField>(null);
  const hasOrder = Boolean(record.orderNo?.trim());

  // 供只读预览用的影子记录：把采购部专属供应商/报价状态接到 InquiryQuoteStatusDisplay 期望的字段名上
  const previewRecord: InquiryRecord = {
    ...record,
    supplierStatuses: record.purchaseSupplierStatuses ?? [],
    quotedStatuses: record.purchaseQuotedStatuses ?? [],
  };

  return (
    <tr
      className="group cursor-pointer border-b border-gray-100 align-middle last:border-b-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/30"
      onClick={() => onEditRecord(record)}
    >
      <td className="max-w-0 overflow-hidden px-3 py-2">
        <span className="block truncate font-mono text-[11px] font-bold text-gray-800 dark:text-gray-100">
          {record.inquiryNo}
        </span>
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2" onClick={(e) => e.stopPropagation()}>
        <EditableText
          editing={activeField === 'content'}
          value={record.description}
          placeholder="内容描述"
          onActivate={() => setActiveField('content')}
          onSave={(value) => {
            setActiveField(null);
            onUpdate({ description: value ?? '' });
          }}
          onCancel={() => setActiveField(null)}
        />
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2">
        <InquiryQuoteStatusDisplay record={previewRecord} />
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
    </tr>
  );
}
