'use client';

import { useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { stripDateBrackets, normalizeShortDateInput } from '@/features/inquiry/utils/inquiryUtils';
import {
  type OrderTableBreakpoint,
  showAdminCols,
  showCustomerCol,
  showLgCols,
} from '../utils/orderTableLayout';
import { DeliveryStatusCell } from './DeliveryStatusCell';

// ── 行文字颜色 ────────────────────────────────────────────────────────────────

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

function getOrderSubStatusRemarkClass(record: InquiryRecord): string {
  if (record.orderSubStatus === 'cancelled') return 'text-red-600 dark:text-red-400';
  if (record.orderSubStatus === 'suspended') return 'text-green-600 dark:text-green-400';
  if (record.orderSubStatus === 'followup') return 'text-blue-600 dark:text-blue-400';
  return 'text-gray-500 dark:text-gray-400';
}

// ── 可编辑字段类型 ────────────────────────────────────────────────────────────

type EditField =
  | 'deliveryDate'
  | 'confirmDate'
  | 'customerNo'
  | 'deliveryStatus'
  | 'amount'
  | 'paymentDate'
  | 'receivedAmount'
  | null;

// ── 通用 EditableCell（纯文本） ───────────────────────────────────────────────

interface EditableCellProps {
  field: Exclude<EditField, null>;
  activeField: EditField;
  value: string | number | undefined;
  fallback?: string;    // 正常黑色（继承值）
  placeholder?: string;
  textClassName?: string;
  onActivate: (f: EditField) => void;
  onSave: (raw: string) => void;
  onCancel: () => void;
}

function EditableCell({
  field, activeField, value, fallback, placeholder = '—',
  textClassName,
  onActivate, onSave, onCancel,
}: EditableCellProps) {
  const editing = activeField === field;
  const strValue = value !== undefined && value !== null ? String(value) : undefined;
  const displayStr = strValue?.trim() || null;
  const effective = displayStr ?? fallback ?? null;

  if (editing) {
    return (
      <input autoFocus type="text"
        defaultValue={strValue ?? fallback ?? ''}
        placeholder={placeholder}
        onBlur={(e) => onSave(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        className="w-full rounded border border-blue-300 bg-white px-1.5 py-0.5 text-xs outline-none
          focus:ring-1 focus:ring-blue-200
          dark:border-blue-600 dark:bg-gray-900 dark:text-gray-100"
      />
    );
  }

  return (
    <span role="button" tabIndex={0}
      onClick={() => onActivate(field)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onActivate(field); }}
      title={effective ?? undefined}
      className={`block min-h-[1.25rem] min-w-0 truncate cursor-text rounded px-0.5 text-xs
        hover:bg-black/5 dark:hover:bg-white/5
        ${effective ? textClassName ?? 'text-gray-800 dark:text-gray-100' : 'text-gray-200 dark:text-gray-700'}`}
    >
      {effective ?? placeholder}
    </span>
  );
}

// ── DatePickerCell（日期：文本 + 日历图标） ───────────────────────────────────

interface DatePickerCellProps {
  field: 'deliveryDate' | 'confirmDate';
  activeField: EditField;
  value: string | undefined;  // 已去掉方括号的 m.D
  textClassName?: string;
  onActivate: (f: EditField) => void;
  onSave: (val: string | undefined) => void;
  onCancel: () => void;
}

function DatePickerCell({ field, activeField, value, textClassName, onActivate, onSave, onCancel }: DatePickerCellProps) {
  const dateRef = useRef<HTMLInputElement>(null);
  const editing = activeField === field;
  const displayStr = value?.trim() || null;

  /** "m.D" → "YYYY-MM-DD"（取今年） */
  const toISO = (short: string): string => {
    const year = new Date().getFullYear();
    const clean = short.replace(/[\[\]]/g, '');
    const [mStr, dStr] = clean.split('.');
    const m = parseInt(mStr ?? '0');
    const d = parseInt(dStr ?? '0');
    if (!m || !d) return '';
    return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  /** "YYYY-MM-DD" → "m.D" */
  const fromISO = (iso: string): string => {
    const [, mm, dd] = iso.split('-');
    const m = parseInt(mm ?? '0');
    const d = parseInt(dd ?? '0');
    return m && d ? `${m}.${d}` : '';
  };

  if (editing) {
    return (
      <input autoFocus type="text"
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
        className="w-12 rounded border border-blue-300 bg-white px-1 py-0.5 text-xs outline-none
          focus:ring-1 focus:ring-blue-200 dark:border-blue-600 dark:bg-gray-900 dark:text-gray-100"
      />
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <span role="button" tabIndex={0}
        onClick={() => onActivate(field)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onActivate(field); }}
        className={`shrink-0 cursor-text rounded px-0.5 text-xs hover:bg-black/5 dark:hover:bg-white/5
          ${displayStr ? textClassName ?? 'text-gray-800 dark:text-gray-100' : 'text-gray-200 dark:text-gray-700'}`}
      >
        {displayStr ?? 'm.D'}
      </span>
      <span className="relative inline-flex h-4 w-4 shrink-0">
        <input
          ref={dateRef}
          type="date"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          aria-label="选择日期"
          onClick={(e) => {
            const el = e.currentTarget;
            el.value = displayStr ? toISO(displayStr) : '';
          }}
          onChange={(e) => {
            const v = fromISO(e.target.value);
            if (v) onSave(v);
          }}
        />
        <CalendarDays className="pointer-events-none h-3 w-3 text-gray-300 dark:text-gray-600" />
      </span>
    </div>
  );
}

// ── MonthPickerCell（回款月份：文本 + 月份选择器） ───────────────────────────

interface MonthPickerCellProps {
  field: 'paymentDate';
  activeField: EditField;
  value: string | undefined;
  textClassName?: string;
  onActivate: (f: EditField) => void;
  onSave: (val: string | undefined) => void;
  onCancel: () => void;
}

function MonthPickerCell({ field, activeField, value, textClassName, onActivate, onSave, onCancel }: MonthPickerCellProps) {
  const monthRef = useRef<HTMLInputElement>(null);
  const editing = activeField === field;
  const displayStr = value?.trim() || null;

  /** "m" → "YYYY-MM"（取今年） */
  const toMonthISO = (m: string): string => {
    const year = new Date().getFullYear();
    const month = parseInt(m);
    if (!month) return '';
    return `${year}-${String(month).padStart(2, '0')}`;
  };

  /** "YYYY-MM" → "m" */
  const fromMonthISO = (iso: string): string => {
    const [, mm] = iso.split('-');
    const m = parseInt(mm ?? '0');
    return m ? String(m) : '';
  };

  if (editing) {
    return (
      <input autoFocus type="text"
        defaultValue={displayStr ?? ''}
        placeholder="m"
        onBlur={(e) => onSave(e.target.value.trim() || undefined)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        className="w-8 rounded border border-blue-300 bg-white px-1 py-0.5 text-xs outline-none
          focus:ring-1 focus:ring-blue-200 dark:border-blue-600 dark:bg-gray-900 dark:text-gray-100"
      />
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <span role="button" tabIndex={0}
        onClick={() => onActivate(field)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onActivate(field); }}
        className={`shrink-0 cursor-text rounded px-0.5 text-xs hover:bg-black/5 dark:hover:bg-white/5
          ${displayStr ? textClassName ?? 'text-gray-800 dark:text-gray-100' : 'text-gray-200 dark:text-gray-700'}`}
      >
        {displayStr ?? 'm'}
      </span>
      <span className="relative inline-flex h-4 w-4 shrink-0">
        <input
          ref={monthRef}
          type="month"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          aria-label="选择月份"
          onClick={(e) => {
            const el = e.currentTarget;
            el.value = displayStr ? toMonthISO(displayStr) : '';
          }}
          onChange={(e) => {
            const v = fromMonthISO(e.target.value);
            if (v) onSave(v);
          }}
        />
        <CalendarDays className="pointer-events-none h-3 w-3 text-gray-300 dark:text-gray-600" />
      </span>
    </div>
  );
}

// ── AmountCell（金额：¥/$ 切换 + 两位小数） ──────────────────────────────────

type Currency = '¥' | '$';

interface AmountCellProps {
  field: 'amount' | 'receivedAmount';
  activeField: EditField;
  value: string | number | undefined;   // 旧数据可能是 number
  textClassName?: string;
  onActivate: (f: EditField) => void;
  onSave: (val: string | undefined) => void;
  onCancel: () => void;
}

function AmountCell({ field, activeField, value, textClassName, onActivate, onSave, onCancel }: AmountCellProps) {
  const [editCurrency, setEditCurrency] = useState<Currency>('¥');
  const [editAmount, setEditAmount] = useState('');
  const editing = activeField === field;

  /** 解析存储值 → { currency, numStr } */
  const parseStored = (v: string | number | undefined): { currency: Currency; numStr: string } => {
    if (v === undefined || v === null) return { currency: '¥', numStr: '' };
    const s = String(v).trim();
    const currency: Currency = s.startsWith('$') ? '$' : '¥';
    const numStr = s.replace(/^[¥$]/, '').replace(/,/g, '');
    return { currency, numStr };
  };

  /** 格式化展示：¥120,000.00 */
  const formatDisplay = (v: string | number | undefined): string | null => {
    if (v === undefined || v === null) return null;
    const { currency, numStr } = parseStored(v);
    const n = parseFloat(numStr);
    if (isNaN(n)) return null;
    return `${currency}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleActivate = () => {
    const { currency, numStr } = parseStored(value);
    setEditCurrency(currency);
    setEditAmount(numStr);
    onActivate(field);
  };

  const handleSave = () => {
    const n = parseFloat(editAmount);
    onSave(!isNaN(n) && editAmount.trim() ? `${editCurrency}${n.toFixed(2)}` : undefined);
  };

  const display = formatDisplay(value);

  if (editing) {
    return (
      <div className="flex items-center gap-0.5">
        {/* 货币符号切换 */}
        <button type="button"
          onMouseDown={(e) => {
            e.preventDefault(); // 阻止 input blur
            setEditCurrency(c => c === '¥' ? '$' : '¥');
          }}
          className="w-4 shrink-0 rounded text-xs font-bold text-blue-500 hover:text-blue-700 dark:text-blue-400"
        >
          {editCurrency}
        </button>
        <input autoFocus type="number" step="0.01" min="0"
          value={editAmount}
          onChange={(e) => setEditAmount(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
          className="w-full rounded border border-blue-300 bg-white px-1 py-0.5 text-right text-xs outline-none
            focus:ring-1 focus:ring-blue-200 dark:border-blue-600 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>
    );
  }

  return (
    <span role="button" tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleActivate(); }}
      title={display ?? undefined}
      className={`block min-h-[1.25rem] min-w-0 truncate cursor-text rounded px-0.5 text-right text-xs
        hover:bg-black/5 dark:hover:bg-white/5
        ${display ? textClassName ?? 'text-gray-800 dark:text-gray-100' : 'text-gray-200 dark:text-gray-700'}`}
    >
      {display ?? '¥/$'}
    </span>
  );
}

// ── OrderSubStatus 标记 ───────────────────────────────────────────────────────

function OrderNoText({ record, textClassName }: { record: InquiryRecord; textClassName: string }) {
  const { orderNo, orderSubStatus } = record;
  if (!orderNo) return null;
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

// ── OrderRow ─────────────────────────────────────────────────────────────────

interface OrderRowProps {
  record: InquiryRecord;
  bp: OrderTableBreakpoint;
  canViewFinancials: boolean;
  consigneeOptions: string[];
  onUpdate: (patch: Partial<InquiryRecord>) => void;
  canBatchEdit?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function OrderRow({
  record, bp, canViewFinancials, consigneeOptions, onUpdate,
  canBatchEdit = false, selected = false, onToggleSelect,
}: OrderRowProps) {
  const customerCol = showCustomerCol(bp);
  const lgCols = showLgCols(bp);
  const adminCols = showAdminCols(bp, canViewFinancials);
  const [activeField, setActiveField] = useState<EditField>(null);
  const activate = (f: EditField) => setActiveField(f);
  const cancel = () => setActiveField(null);
  const rowTextClass = getRowTextClass(record);
  const orderSubStatusRemark = record.orderSubStatusRemark?.trim();

  // 客户订单号的 fallback：自动将 RFQ 显示/输入替换为 PO
  const customerNoFallback = (record.customerNo ?? '').replace(/RFQ/g, 'PO');

  const saveCustomerNo = (raw: string) => {
    setActiveField(null);
    const trimmed = raw.trim().replace(/RFQ/g, 'PO');
    onUpdate({ orderCustomerNo: trimmed || undefined });
  };

  const saveDeliveryStatus = (status: string | undefined, consignee: string | undefined) => {
    setActiveField(null);
    onUpdate({ orderDeliveryStatus: status, orderDeliveryConsignee: consignee });
  };

  return (
    <tr className={`group border-b border-gray-100 align-middle last:border-b-0 dark:border-gray-800 ${getRowBgClass(record)}`}>

      {/* 批量选择 checkbox */}
      {canBatchEdit && (
        <td className="w-8 px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(record.id)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-blue-600 dark:border-gray-600"
            aria-label={`选择 ${record.orderNo ?? record.inquiryNo}`}
          />
        </td>
      )}

      {/* 订单编号 + 询价编号 */}
      <td className="max-w-0 overflow-hidden px-2 py-2 sm:px-3">
        <div className="flex min-w-0 flex-col gap-0.5" title={`${record.orderNo ?? ''} ${record.inquiryNo}`}>
          <OrderNoText record={record} textClassName={rowTextClass} />
          <span className="block truncate font-mono text-[10px] text-gray-400 dark:text-gray-500">{record.inquiryNo}</span>
        </div>
      </td>

      {/* 交货 */}
      <td className="max-w-0 overflow-hidden whitespace-nowrap px-1.5 py-2 sm:px-2">
        <DatePickerCell field="deliveryDate" activeField={activeField}
          value={record.orderDeliveryDate ? stripDateBrackets(record.orderDeliveryDate) : undefined}
          textClassName={rowTextClass}
          onActivate={activate}
          onSave={(val) => { setActiveField(null); onUpdate({ orderDeliveryDate: val ? normalizeShortDateInput(val) : undefined }); }}
          onCancel={cancel}
        />
      </td>

      {customerCol && (
        <td className="max-w-0 overflow-hidden px-2 py-2 text-xs">
          <span className={`block min-w-0 truncate ${rowTextClass}`} title={record.inquirer}>{record.inquirer}</span>
        </td>
      )}

      {/* 内容简述 */}
      <td className="max-w-0 overflow-hidden px-1.5 py-2 sm:px-2">
        <p className={`truncate text-xs ${rowTextClass}`} title={record.description}>{record.description}</p>
        {bp === 'sm' && (
          <p className={`truncate text-[10px] ${rowTextClass}`} title={record.inquirer}>{record.inquirer}</p>
        )}
      </td>

      {lgCols && (
        <>
          <td className="max-w-0 overflow-hidden whitespace-nowrap px-2 py-2">
            <DatePickerCell field="confirmDate" activeField={activeField}
              value={record.orderConfirmDate ? stripDateBrackets(record.orderConfirmDate) : undefined}
              textClassName={rowTextClass}
              onActivate={activate}
              onSave={(val) => { setActiveField(null); onUpdate({ orderConfirmDate: val ? normalizeShortDateInput(val) : undefined }); }}
              onCancel={cancel}
            />
          </td>
          <td className="max-w-0 overflow-hidden px-2 py-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <EditableCell field="customerNo" activeField={activeField}
                value={record.orderCustomerNo}
                fallback={customerNoFallback}
                placeholder="—"
                textClassName={rowTextClass}
                onActivate={activate}
                onSave={saveCustomerNo}
                onCancel={cancel}
              />
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
        </>
      )}

      {/* 执行情况 */}
      <td className="max-w-0 overflow-hidden px-1.5 py-2 sm:px-2">
        <div className="min-w-0">
          <DeliveryStatusCell
            editing={activeField === 'deliveryStatus'}
            value={record.orderDeliveryStatus}
            consigneeValue={record.orderDeliveryConsignee}
            consigneeOptions={consigneeOptions}
            textClassName={rowTextClass}
            onActivate={() => setActiveField('deliveryStatus')}
            onSave={saveDeliveryStatus}
            onCancel={cancel}
          />
        </div>
      </td>

      {adminCols && (
        <>
          <td className="max-w-0 overflow-hidden px-2 py-2">
            <div className="min-w-0">
              <AmountCell field="amount" activeField={activeField}
                value={record.orderAmount}
                textClassName={rowTextClass}
                onActivate={activate}
                onSave={(val) => { setActiveField(null); onUpdate({ orderAmount: val }); }}
                onCancel={cancel}
              />
            </div>
          </td>
          <td className="max-w-0 overflow-hidden whitespace-nowrap px-2 py-2">
            <MonthPickerCell field="paymentDate" activeField={activeField}
              value={record.orderPaymentDate}
              textClassName={rowTextClass}
              onActivate={activate}
              onSave={(val) => { setActiveField(null); onUpdate({ orderPaymentDate: val }); }}
              onCancel={cancel}
            />
          </td>
          <td className="max-w-0 overflow-hidden px-2 py-2">
            <div className="min-w-0">
              <AmountCell field="receivedAmount" activeField={activeField}
                value={record.orderReceivedAmount}
                textClassName={rowTextClass}
                onActivate={activate}
                onSave={(val) => { setActiveField(null); onUpdate({ orderReceivedAmount: val }); }}
                onCancel={cancel}
              />
            </div>
          </td>
        </>
      )}
    </tr>
  );
}
