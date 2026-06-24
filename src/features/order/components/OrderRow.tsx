'use client';

import { useRef, useState } from 'react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { stripDateBrackets, normalizeShortDateInput } from '@/features/inquiry/utils/inquiryUtils';

// ── 行背景颜色（根据交货执行情况） ───────────────────────────────────────────

function getRowBgClass(record: InquiryRecord): string {
  const s = record.orderDeliveryStatus ?? '';
  if (s === '备货')
    return 'bg-red-50 hover:bg-red-100/60 dark:bg-red-950/25 dark:hover:bg-red-950/40';
  if (s === '交货')
    return 'bg-blue-50 hover:bg-blue-100/60 dark:bg-blue-950/25 dark:hover:bg-blue-950/40';
  if (s.startsWith('发票'))
    return 'bg-gray-100 hover:bg-gray-200/60 dark:bg-gray-800/60 dark:hover:bg-gray-800/80';
  return 'hover:bg-gray-50/70 dark:hover:bg-gray-800/30';
}

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

// ── 通用 EditableCell ─────────────────────────────────────────────────────────

interface EditableCellProps {
  field: Exclude<EditField, null>;
  activeField: EditField;
  value: string | undefined;
  /** 当 value 为空时的 fallback 显示文本（正常黑色，代表继承自他处） */
  fallback?: string;
  placeholder?: string;
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
  align = 'left',
  onActivate,
  onSave,
  onCancel,
}: EditableCellProps) {
  const editing = activeField === field;
  const displayStr = value?.trim() ?? null;
  const effective = displayStr ?? fallback ?? null; // 实际展示内容

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        defaultValue={displayStr ?? fallback ?? ''}
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
        hover:bg-black/5 dark:hover:bg-white/5
        ${align === 'right' ? 'text-right' : 'text-left'}
        ${effective ? 'text-gray-800 dark:text-gray-100' : 'text-gray-200 dark:text-gray-700'}`}
    >
      {effective ?? placeholder}
    </span>
  );
}

// ── 执行情况专用单元格（含预设按钮） ─────────────────────────────────────────

const STATUS_PRESETS = [
  { label: '备货', value: '备货', immediate: true },
  { label: '交货', value: '交货', immediate: true },
  { label: '发票', value: '发票', immediate: false }, // 需要追加日期
] as const;

interface DeliveryStatusCellProps {
  activeField: EditField;
  value: string | undefined;
  onActivate: () => void;
  onSave: (val: string | undefined) => void;
  onCancel: () => void;
}

function DeliveryStatusCell({
  activeField,
  value,
  onActivate,
  onSave,
  onCancel,
}: DeliveryStatusCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editing = activeField === 'deliveryStatus';
  const displayStr = value?.trim() ?? null;

  if (editing) {
    const commit = (raw: string) => {
      onSave(raw.trim() || undefined);
    };

    return (
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          autoFocus
          type="text"
          defaultValue={displayStr ?? ''}
          placeholder="自由输入或选预设"
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
          className="w-full rounded border border-blue-300 bg-white px-1.5 py-0.5 text-xs outline-none
            focus:ring-1 focus:ring-blue-200
            dark:border-blue-600 dark:bg-gray-900 dark:text-gray-100"
        />
        {/* 预设芯片 */}
        <div className="flex gap-1">
          {STATUS_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // 阻止 input blur
                if (p.immediate) {
                  // 备货/交货：直接保存，关闭编辑
                  onSave(p.value);
                } else {
                  // 发票：填入前缀，焦点回 input 让用户追加日期
                  if (inputRef.current) {
                    inputRef.current.value = p.value;
                    inputRef.current.focus();
                    // 光标移到末尾
                    const len = p.value.length;
                    inputRef.current.setSelectionRange(len, len);
                  }
                }
              }}
              className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold
                text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700
                dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200"
            >
              {p.label}
            </button>
          ))}
          {/* 清除 */}
          {displayStr && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSave(undefined);
              }}
              className="ml-auto rounded-full border border-red-200 px-2 py-0.5 text-[10px] font-semibold
                text-red-400 hover:border-red-400 hover:text-red-600
                dark:border-red-800 dark:text-red-500 dark:hover:border-red-600"
            >
              清除
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onActivate(); }}
      className={`block min-h-[1.25rem] cursor-text rounded px-0.5 text-xs
        hover:bg-black/5 dark:hover:bg-white/5
        ${displayStr ? 'text-gray-800 dark:text-gray-100' : 'text-gray-200 dark:text-gray-700'}`}
    >
      {displayStr ?? '执行情况'}
    </span>
  );
}

// ── OrderSubStatus 徽标 ───────────────────────────────────────────────────────

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
      case 'amount':
        onUpdate({ orderAmount: trimmed || undefined });
        break;
      case 'paymentDate':
        onUpdate({ orderPaymentDate: trimmed || undefined });
        break;
      case 'receivedAmount':
        onUpdate({ orderReceivedAmount: trimmed || undefined });
        break;
    }
  };

  const cellProps = (field: Exclude<EditField, 'deliveryStatus' | null>) => ({
    field,
    activeField,
    onActivate: activate,
    onSave: (raw: string) => save(field, raw),
    onCancel: cancel,
  });

  return (
    <tr className={`group border-b border-gray-100 align-middle last:border-b-0 dark:border-gray-800 ${getRowBgClass(record)}`}>

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
      <td className="w-14 px-2 py-2">
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
        <p className="truncate text-[10px] text-gray-400 dark:text-gray-500 md:hidden">
          {record.inquirer}
        </p>
      </td>

      {/* 确认日 */}
      <td className="hidden w-14 px-2 py-2 lg:table-cell">
        <EditableCell
          {...cellProps('confirmDate')}
          value={record.orderConfirmDate ? stripDateBrackets(record.orderConfirmDate) : undefined}
          placeholder="m.D"
        />
      </td>

      {/* 客户订单号：fallback 显示 customerNo（正常黑色，非占位灰） */}
      <td className="hidden min-w-[80px] px-2 py-2 lg:table-cell">
        <EditableCell
          {...cellProps('customerNo')}
          value={record.orderCustomerNo}
          fallback={record.customerNo}
          placeholder="—"
        />
      </td>

      {/* 交货执行情况（带预设按钮） */}
      <td className="min-w-[110px] px-2 py-2">
        <DeliveryStatusCell
          activeField={activeField}
          value={record.orderDeliveryStatus}
          onActivate={() => setActiveField('deliveryStatus')}
          onSave={(val) => {
            setActiveField(null);
            onUpdate({ orderDeliveryStatus: val });
          }}
          onCancel={cancel}
        />
      </td>

      {/* ── 管理员专属列 ── */}
      {isAdmin && (
        <td className="hidden w-24 px-2 py-2 xl:table-cell">
          <EditableCell
            {...cellProps('amount')}
            value={record.orderAmount}
            align="right"
            placeholder="¥/$ 金额"
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
        <td className="hidden w-24 px-2 py-2 xl:table-cell">
          <EditableCell
            {...cellProps('receivedAmount')}
            value={record.orderReceivedAmount}
            align="right"
            placeholder="¥/$ 金额"
          />
        </td>
      )}
    </tr>
  );
}
