'use client';

import { useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { stripDateBrackets, normalizeShortDateInput } from '@/features/inquiry/utils/inquiryUtils';
import { DeliveryStatusCell } from '@/features/order/components/DeliveryStatusCell';

// ── 行颜色（与订单状态表 OrderRow 一致，两边展示的是同一个共享字段）───────────

function getRowBgClass(record: InquiryRecord): string {
  if (record.orderSubStatus === 'cancelled') {
    return 'bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-800/75 dark:hover:bg-gray-700/80';
  }
  if (record.orderSubStatus === 'suspended') {
    return 'bg-green-100 hover:bg-green-200/75 dark:bg-green-950/45 dark:hover:bg-green-900/45';
  }
  if (record.orderSubStatus === 'followup') {
    return 'bg-red-100 hover:bg-red-200/75 dark:bg-red-950/45 dark:hover:bg-red-900/45';
  }
  return 'hover:bg-gray-50/70 dark:hover:bg-gray-800/30';
}

function getRowTextClass(record: InquiryRecord): string {
  const status = record.orderDeliveryStatus?.trim() ?? '';
  if (!status || status.startsWith('备货')) return 'text-pink-500 dark:text-pink-400';
  if (status.startsWith('交货')) return 'text-blue-600 dark:text-blue-400';
  if (status.startsWith('发票')) return 'text-gray-900 dark:text-gray-100';
  return 'text-gray-700 dark:text-gray-300';
}

function OrderNoText({ record, textClassName }: { record: InquiryRecord; textClassName: string }) {
  const { orderNo, orderSubStatus } = record;
  const letter =
    orderSubStatus === 'cancelled' ? 'C'
    : orderSubStatus === 'suspended' ? 'P'
    : orderSubStatus === 'followup' ? 'S'
    : null;
  return (
    <span className={`inline-flex max-w-full min-w-0 items-baseline gap-0.5 truncate font-mono text-[11px] font-bold leading-5 ${textClassName}`}>
      <span className="truncate">{orderNo}</span>
      {letter && <span className="shrink-0 font-bold text-red-500">{letter}</span>}
    </span>
  );
}

// ── 可编辑字段类型 ────────────────────────────────────────────────────────────

type EditField = 'purchaseOrderNo' | 'purchaseOrderSupplier' | 'amount' | 'deliveryDate' | 'deliveryStatus' | null;

// ── EditableText（采购单号 / 供应商，纯文本） ─────────────────────────────────

interface EditableTextProps {
  editing: boolean;
  value: string | undefined;
  placeholder: string;
  textClassName?: string;
  onActivate: () => void;
  onSave: (value: string | undefined) => void;
  onCancel: () => void;
}

function EditableText({ editing, value, placeholder, textClassName, onActivate, onSave, onCancel }: EditableTextProps) {
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
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
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
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onActivate(); }}
      title={display || undefined}
      className={`block min-h-[1.25rem] min-w-0 truncate cursor-text rounded px-0.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 ${
        display ? (textClassName ?? 'text-gray-800 dark:text-gray-100') : 'text-gray-300 dark:text-gray-700'
      }`}
    >
      {display || placeholder}
    </span>
  );
}

// ── ReadOnlyText（确认日期 / 客户订单号：来自订单状态表，这里只读展示） ───────

function ReadOnlyText({ value, fallback, placeholder = '—' }: { value: string | undefined; fallback?: string; placeholder?: string }) {
  const display = value?.trim() || fallback?.trim() || '';
  return (
    <span
      title={display || undefined}
      className={`block min-w-0 truncate px-0.5 text-xs ${display ? 'text-gray-500 dark:text-gray-400' : 'text-gray-200 dark:text-gray-700'}`}
    >
      {display || placeholder}
    </span>
  );
}

// ── DateEditCell（交货日期：文本 + 日期选择器，双向共享字段） ────────────────

interface DateEditCellProps {
  editing: boolean;
  value: string | undefined; // 已去掉方括号的 m.D
  textClassName?: string;
  onActivate: () => void;
  onSave: (val: string | undefined) => void;
  onCancel: () => void;
}

function DateEditCell({ editing, value, textClassName, onActivate, onSave, onCancel }: DateEditCellProps) {
  const dateRef = useRef<HTMLInputElement>(null);
  const displayStr = value?.trim() || null;

  const toISO = (short: string): string => {
    const year = new Date().getFullYear();
    const clean = short.replace(/[[\]]/g, '');
    const [mStr, dStr] = clean.split('.');
    const m = parseInt(mStr ?? '0');
    const d = parseInt(dStr ?? '0');
    if (!m || !d) return '';
    return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const fromISO = (iso: string): string => {
    const [, mm, dd] = iso.split('-');
    const m = parseInt(mm ?? '0');
    const d = parseInt(dd ?? '0');
    return m && d ? `${m}.${d}` : '';
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        defaultValue={displayStr ?? ''}
        placeholder="m.D"
        onBlur={(e) => {
          const v = e.target.value.trim();
          onSave(v ? stripDateBrackets(normalizeShortDateInput(v)) : undefined);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        className="w-12 rounded border border-blue-300 bg-white px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-200 dark:border-blue-600 dark:bg-gray-900 dark:text-gray-100"
      />
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <span
        role="button"
        tabIndex={0}
        onClick={onActivate}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onActivate(); }}
        className={`shrink-0 cursor-text rounded px-0.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 ${
          displayStr ? (textClassName ?? 'text-gray-800 dark:text-gray-100') : 'text-gray-200 dark:text-gray-700'
        }`}
      >
        {displayStr ?? 'm.D'}
      </span>
      <span className="relative inline-flex h-4 w-4 shrink-0">
        <input
          ref={dateRef}
          type="date"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          aria-label="选择日期"
          onClick={(e) => { e.currentTarget.value = displayStr ? toISO(displayStr) : ''; }}
          onChange={(e) => { const v = fromISO(e.target.value); if (v) onSave(v); }}
        />
        <CalendarDays className="pointer-events-none h-3 w-3 text-gray-300 dark:text-gray-600" />
      </span>
    </div>
  );
}

// ── AmountEditCell（采购金额：¥ / $ / € 循环切换，需要 order.financials 权限） ─

type PurchaseCurrency = '¥' | '$' | '€';
const CURRENCY_CYCLE: Record<PurchaseCurrency, PurchaseCurrency> = { '¥': '$', '$': '€', '€': '¥' };

interface AmountEditCellProps {
  editing: boolean;
  value: string | undefined;
  textClassName?: string;
  onActivate: () => void;
  onSave: (val: string | undefined) => void;
  onCancel: () => void;
}

function AmountEditCell({ editing, value, textClassName, onActivate, onSave, onCancel }: AmountEditCellProps) {
  const [editCurrency, setEditCurrency] = useState<PurchaseCurrency>('¥');
  const [editAmount, setEditAmount] = useState('');

  const parseStored = (v: string | undefined): { currency: PurchaseCurrency; numStr: string } => {
    if (!v) return { currency: '¥', numStr: '' };
    const s = v.trim();
    const currency: PurchaseCurrency = s.startsWith('$') ? '$' : s.startsWith('€') ? '€' : '¥';
    return { currency, numStr: s.replace(/^[¥$€]/, '').replace(/,/g, '') };
  };

  const formatDisplay = (v: string | undefined): string | null => {
    if (!v) return null;
    const { currency, numStr } = parseStored(v);
    const n = parseFloat(numStr);
    if (isNaN(n)) return null;
    return `${currency}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleActivate = () => {
    const { currency, numStr } = parseStored(value);
    setEditCurrency(currency);
    setEditAmount(numStr);
    onActivate();
  };

  const handleSave = () => {
    const n = parseFloat(editAmount);
    onSave(!isNaN(n) && editAmount.trim() ? `${editCurrency}${n.toFixed(2)}` : undefined);
  };

  const display = formatDisplay(value);

  if (editing) {
    return (
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setEditCurrency((c) => CURRENCY_CYCLE[c]); }}
          className="w-4 shrink-0 rounded text-xs font-bold text-blue-500 hover:text-blue-700 dark:text-blue-400"
        >
          {editCurrency}
        </button>
        <input
          autoFocus
          type="number"
          step="0.01"
          min="0"
          value={editAmount}
          onChange={(e) => setEditAmount(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
          className="w-full rounded border border-blue-300 bg-white px-1 py-0.5 text-right text-xs outline-none focus:ring-1 focus:ring-blue-200 dark:border-blue-600 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleActivate(); }}
      title={display ?? undefined}
      className={`block min-h-[1.25rem] min-w-0 truncate cursor-text rounded px-0.5 text-right text-xs hover:bg-black/5 dark:hover:bg-white/5 ${
        display ? (textClassName ?? 'text-gray-800 dark:text-gray-100') : 'text-gray-200 dark:text-gray-700'
      }`}
    >
      {display ?? '¥/$/€'}
    </span>
  );
}

// ── PurchaseOrderRow ──────────────────────────────────────────────────────────

interface PurchaseOrderRowProps {
  record: InquiryRecord;
  canViewFinancials: boolean;
  consigneeOptions: string[];
  onUpdate: (patch: Partial<InquiryRecord>) => void;
}

export function PurchaseOrderRow({ record, canViewFinancials, consigneeOptions, onUpdate }: PurchaseOrderRowProps) {
  const [activeField, setActiveField] = useState<EditField>(null);
  const activate = (f: EditField) => setActiveField(f);
  const cancel = () => setActiveField(null);
  const rowTextClass = getRowTextClass(record);

  // 客户订单号只读展示，fallback 逻辑与订单状态表一致（RFQ→PO）
  const customerNoFallback = record.customerNo.replace(/RFQ/g, 'PO');

  return (
    <tr className={`group border-b border-gray-100 align-middle last:border-b-0 dark:border-gray-800 ${getRowBgClass(record)}`}>
      {/* 订单编号 + 询价编号（只读，来自订单状态表/询报价登记的共享数据） */}
      <td className="max-w-0 overflow-hidden px-2 py-2 sm:px-3">
        <div className="flex min-w-0 flex-col gap-0.5" title={`${record.orderNo ?? ''} ${record.inquiryNo}`}>
          <OrderNoText record={record} textClassName={rowTextClass} />
          <span className="block truncate font-mono text-[10px] text-gray-400 dark:text-gray-500">{record.inquiryNo}</span>
        </div>
      </td>

      {/* 采购单号 */}
      <td className="max-w-0 overflow-hidden px-1.5 py-2 sm:px-2">
        <EditableText
          editing={activeField === 'purchaseOrderNo'}
          value={record.purchaseOrderNo}
          placeholder="采购单号"
          onActivate={() => activate('purchaseOrderNo')}
          onSave={(val) => { setActiveField(null); onUpdate({ purchaseOrderNo: val }); }}
          onCancel={cancel}
        />
      </td>

      {/* 供应商 */}
      <td className="max-w-0 overflow-hidden px-1.5 py-2 sm:px-2">
        <EditableText
          editing={activeField === 'purchaseOrderSupplier'}
          value={record.purchaseOrderSupplier}
          placeholder="供应商"
          onActivate={() => activate('purchaseOrderSupplier')}
          onSave={(val) => { setActiveField(null); onUpdate({ purchaseOrderSupplier: val }); }}
          onCancel={cancel}
        />
      </td>

      {/* 金额（需要 order.financials 权限） */}
      {canViewFinancials && (
        <td className="max-w-0 overflow-hidden px-2 py-2">
          <AmountEditCell
            editing={activeField === 'amount'}
            value={record.purchaseOrderAmount}
            onActivate={() => activate('amount')}
            onSave={(val) => { setActiveField(null); onUpdate({ purchaseOrderAmount: val }); }}
            onCancel={cancel}
          />
        </td>
      )}

      {/* 交货日期（双向共享：orderDeliveryDate，订单状态表也在编辑同一个字段） */}
      <td className="max-w-0 overflow-hidden whitespace-nowrap px-1.5 py-2 sm:px-2">
        <DateEditCell
          editing={activeField === 'deliveryDate'}
          value={record.orderDeliveryDate ? stripDateBrackets(record.orderDeliveryDate) : undefined}
          textClassName={rowTextClass}
          onActivate={() => activate('deliveryDate')}
          onSave={(val) => { setActiveField(null); onUpdate({ orderDeliveryDate: val ? normalizeShortDateInput(val) : undefined }); }}
          onCancel={cancel}
        />
      </td>

      {/* 确认日期（只读，来自订单状态表） */}
      <td className="max-w-0 overflow-hidden whitespace-nowrap px-2 py-2">
        <ReadOnlyText value={record.orderConfirmDate ? stripDateBrackets(record.orderConfirmDate) : undefined} placeholder="m.D" />
      </td>

      {/* 客户订单号（只读，来自订单状态表） */}
      <td className="max-w-0 overflow-hidden px-2 py-2">
        <ReadOnlyText value={record.orderCustomerNo} fallback={customerNoFallback} />
      </td>

      {/* 执行情况（双向共享：orderDeliveryStatus/orderDeliveryConsignee） */}
      <td className="max-w-0 overflow-hidden px-1.5 py-2 sm:px-2">
        <DeliveryStatusCell
          editing={activeField === 'deliveryStatus'}
          value={record.orderDeliveryStatus}
          consigneeValue={record.orderDeliveryConsignee}
          consigneeOptions={consigneeOptions}
          textClassName={rowTextClass}
          onActivate={() => activate('deliveryStatus')}
          onSave={(status, consignee) => {
            setActiveField(null);
            onUpdate({ orderDeliveryStatus: status, orderDeliveryConsignee: consignee });
          }}
          onCancel={cancel}
        />
      </td>
    </tr>
  );
}
