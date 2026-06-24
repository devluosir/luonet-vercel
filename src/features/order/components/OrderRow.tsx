'use client';

import { useRef, useState } from 'react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { stripDateBrackets, normalizeShortDateInput } from '@/features/inquiry/utils/inquiryUtils';

// ── 行内可编辑字段类型 ────────────────────────────────────────────────────────

type EditField =
  | 'deliveryDate'
  | 'confirmDate'
  | 'customerNo'
  | 'deliveryStatus'
  | 'amount'
  | 'paymentDate'
  | 'receivedAmount'
  | null;

// ── EditableCell ─────────────────────────────────────────────────────────────

interface EditableCellProps {
  field: Exclude<EditField, null>;
  activeField: EditField;
  value: string | number | undefined;
  fallback?: string;             // 灰色占位文字（如客户订单号 fallback 到 customerNo）
  placeholder?: string;          // input placeholder
  type?: 'text' | 'number';
  align?: 'left' | 'right';
  onActivate: (f: EditField) => void;
  onSave: (raw: string) => void;
  onCancel: () => void;
}

function EditableCell({
  field,
  activeField,
  value,
  fallback,
  placeholder = '—',
  type = 'text',
  align = 'left',
  onActivate,
  onSave,
  onCancel,
}: EditableCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editing = activeField === field;
  const displayStr = value !== undefined && value !== null && String(value).trim() !== ''
    ? String(value)
    : null;

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type={type}
        defaultValue={displayStr ?? ''}
        placeholder={placeholder}
        onBlur={(e) => onSave(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        className={`w-full rounded border border-blue-300 bg-white px-1.5 py-0.5 text-xs outline-none
          focus:ring-1 focus:ring-blue-200
          dark:border-blue-600 dark:bg-gray-900 dark:text-gray-100
          ${align === 'right' ? 'text-right' : 'text-left'}`}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => onActivate(field)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onActivate(field); }}
      className={`block min-h-[1.25rem] cursor-text rounded px-0.5 text-xs
        hover:bg-gray-50 dark:hover:bg-gray-800/50
        ${align === 'right' ? 'text-right' : 'text-left'}
        ${displayStr ? 'text-gray-800 dark:text-gray-100' : ''}`}
    >
      {displayStr ?? (fallback
        ? <span className="text-gray-300 dark:text-gray-600">{fallback}</span>
        : <span className="text-gray-200 dark:text-gray-700">{placeholder}</span>
      )}
    </span>
  );
}

// ── OrderSubStatus 徽标（与 InquiryRow 保持一致）────────────────────────────

function OrderNoBadge({ record }: { record: InquiryRecord }) {
  const { orderNo, orderSubStatus } = record;
  if (!orderNo) return null;

  const letter =
    orderSubStatus === 'cancelled' ? 'C'
    : orderSubStatus === 'suspended' ? 'P'
    : orderSubStatus === 'followup' ? 'S'
    : null;

  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0 text-[11px] font-medium leading-5 text-green-700 ring-1 dark:bg-green-950/40 dark:text-green-400 ${
      letter ? 'ring-red-300 dark:ring-red-700' : 'ring-green-200 dark:ring-green-800'
    }`}>
      {orderNo}
      {letter && <span className="font-bold text-red-500">{letter}</span>}
    </span>
  );
}

// ── OrderRow ─────────────────────────────────────────────────────────────────

interface OrderRowProps {
  record: InquiryRecord;
  isAdmin: boolean;
  onUpdate: (patch: Partial<InquiryRecord>) => void;
}

export function OrderRow({ record, isAdmin, onUpdate }: OrderRowProps) {
  const [activeField, setActiveField] = useState<EditField>(null);

  const activate = (f: EditField) => setActiveField(f);
  const cancel = () => setActiveField(null);

  /** 保存：空字符串 → undefined，去除首尾空格 */
  const save = (field: string, raw: string) => {
    setActiveField(null);
    const trimmed = raw.trim();

    switch (field) {
      case 'deliveryDate':
        onUpdate({ orderDeliveryDate: trimmed ? normalizeShortDateInput(trimmed) : undefined });
        break;
      case 'confirmDate':
        onUpdate({ orderConfirmDate: trimmed ? normalizeShortDateInput(trimmed) : undefined });
        break;
      case 'customerNo':
        onUpdate({ orderCustomerNo: trimmed || undefined });
        break;
      case 'deliveryStatus':
        onUpdate({ orderDeliveryStatus: trimmed || undefined });
        break;
      case 'amount': {
        const n = Number(trimmed);
        onUpdate({ orderAmount: trimmed && !isNaN(n) ? n : undefined });
        break;
      }
      case 'paymentDate':
        onUpdate({ orderPaymentDate: trimmed || undefined });
        break;
      case 'receivedAmount': {
        const n = Number(trimmed);
        onUpdate({ orderReceivedAmount: trimmed && !isNaN(n) ? n : undefined });
        break;
      }
    }
  };

  const cellProps = (field: Exclude<EditField, null>) => ({
    field,
    activeField,
    onActivate: activate,
    onSave: (raw: string) => save(field, raw),
    onCancel: cancel,
  });

  return (
    <tr className="group border-b border-gray-100 align-middle last:border-b-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/30">

      {/* 订单编号 + 询价编号 */}
      <td className="whitespace-nowrap px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <OrderNoBadge record={record} />
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
            {record.inquiryNo}
          </span>
        </div>
      </td>

      {/* 交货 */}
      <td className="w-16 px-2 py-2">
        <EditableCell
          {...cellProps('deliveryDate')}
          value={record.orderDeliveryDate ? stripDateBrackets(record.orderDeliveryDate) : undefined}
          placeholder="m.D"
        />
      </td>

      {/* 客户（询价人） */}
      <td className="hidden px-2 py-2 text-xs text-gray-700 dark:text-gray-300 md:table-cell">
        {record.inquirer}
      </td>

      {/* 内容简述 */}
      <td className="max-w-[160px] overflow-hidden px-2 py-2">
        <p className="truncate text-xs text-gray-700 dark:text-gray-300" title={record.description}>
          {record.description}
        </p>
        {/* 移动端补充显示询价人 */}
        <p className="truncate text-[10px] text-gray-400 dark:text-gray-500 md:hidden">
          {record.inquirer}
        </p>
      </td>

      {/* 确认日 */}
      <td className="hidden w-16 px-2 py-2 lg:table-cell">
        <EditableCell
          {...cellProps('confirmDate')}
          value={record.orderConfirmDate ? stripDateBrackets(record.orderConfirmDate) : undefined}
          placeholder="m.D"
        />
      </td>

      {/* 客户订单号 */}
      <td className="hidden min-w-[80px] px-2 py-2 lg:table-cell">
        <EditableCell
          {...cellProps('customerNo')}
          value={record.orderCustomerNo}
          fallback={record.customerNo}
          placeholder={record.customerNo}
        />
      </td>

      {/* 交货执行情况 */}
      <td className="min-w-[100px] px-2 py-2">
        <EditableCell
          {...cellProps('deliveryStatus')}
          value={record.orderDeliveryStatus}
          placeholder="执行情况"
        />
      </td>

      {/* ── 管理员专属列 ── */}
      {isAdmin && (
        <td className="hidden w-20 px-2 py-2 xl:table-cell">
          <EditableCell
            {...cellProps('amount')}
            value={record.orderAmount}
            type="number"
            align="right"
            placeholder="0"
          />
        </td>
      )}
      {isAdmin && (
        <td className="hidden w-16 px-2 py-2 xl:table-cell">
          <EditableCell
            {...cellProps('paymentDate')}
            value={record.orderPaymentDate}
            placeholder="m"
          />
        </td>
      )}
      {isAdmin && (
        <td className="hidden w-20 px-2 py-2 xl:table-cell">
          <EditableCell
            {...cellProps('receivedAmount')}
            value={record.orderReceivedAmount}
            type="number"
            align="right"
            placeholder="0"
          />
        </td>
      )}
    </tr>
  );
}
