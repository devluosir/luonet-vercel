'use client';

import { useState } from 'react';
import { InquiryQuoteStatusDisplay } from '@/features/inquiry/components/InquiryQuoteStatusDisplay';
import { getRecordColorState, stripDateBrackets } from '@/features/inquiry/utils/inquiryUtils';
import type { InquiryRecord } from '@/features/inquiry/types';
import { computePurchaseMainStatus, formatPurchaseMainStatus } from '../utils/purchaseInquiryStatus';

type EditField = 'content' | null;

interface EditableTextProps {
  editing: boolean;
  value: string | undefined;
  placeholder: string;
  colorClassName?: string;
  onActivate: () => void;
  onSave: (value: string | undefined) => void;
  onCancel: () => void;
}

function EditableText({ editing, value, placeholder, colorClassName, onActivate, onSave, onCancel }: EditableTextProps) {
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
      className={`block min-h-[1.25rem] min-w-0 truncate cursor-text rounded px-0.5 text-[13px] font-medium hover:bg-black/5 dark:hover:bg-white/5 ${
        display ? (colorClassName ?? 'text-gray-800 dark:text-gray-100') : 'text-gray-300 dark:text-gray-700'
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
  const mainStatus = formatPurchaseMainStatus(computePurchaseMainStatus(record));

  // 供只读预览用的影子记录：把采购部专属供应商/报价状态接到 InquiryQuoteStatusDisplay 期望的字段名上
  const previewRecord: InquiryRecord = {
    ...record,
    supplierStatuses: record.purchaseSupplierStatuses ?? [],
    quotedStatuses: record.purchaseQuotedStatuses ?? [],
  };

  // 行颜色规则与询报价登记表一致（getRecordColorState），但依据采购部专属的 purchaseQuotedStatuses 判断：
  // 无法报价/已关闭→灰，已报价→蓝，其余（含未报价）→粉
  const mainColorClass = getRecordColorState(previewRecord);

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
                  record.orderSubStatus ? 'ring-red-300 dark:ring-red-700' : 'ring-green-200 dark:ring-green-800'
                }`}
              >
                {record.orderNo}
                {record.orderSubStatus && (
                  <span className="font-bold text-red-500">
                    {record.orderSubStatus === 'cancelled' ? 'C' : record.orderSubStatus === 'suspended' ? 'P' : 'S'}
                  </span>
                )}
              </span>
            )}
          </span>
        </div>
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2" onClick={(e) => e.stopPropagation()}>
        <EditableText
          editing={activeField === 'content'}
          value={record.description}
          placeholder="内容描述"
          colorClassName={mainColorClass}
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
        {mainStatus ? (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${mainStatus.className}`}>
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
