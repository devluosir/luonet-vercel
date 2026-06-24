'use client';

import { useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { stripDateBrackets, normalizeShortDateInput } from '@/features/inquiry/utils/inquiryUtils';

// ── 辅助：触发原生选择器 ──────────────────────────────────────────────────────

function triggerPicker(ref: React.RefObject<HTMLInputElement | null>) {
  const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
  if (!el) return;
  if (el.showPicker) el.showPicker();
  else el.click();
}

// ── 行背景颜色 ────────────────────────────────────────────────────────────────

function getRowBgClass(record: InquiryRecord): string {
  const s = record.orderDeliveryStatus ?? '';
  if (s === '备货')
    return 'bg-red-50 hover:bg-red-100/60 dark:bg-red-950/25 dark:hover:bg-red-950/40';
  if (s === '交货')
    return 'bg-blue-50 hover:bg-blue-100/60 dark:bg-blue-950/20 dark:hover:bg-blue-950/30';
  if (s.startsWith('发票'))
    return 'bg-gray-100 hover:bg-gray-200/60 dark:bg-gray-800/60 dark:hover:bg-gray-800/80';
  return 'hover:bg-gray-50/70 dark:hover:bg-gray-800/30';
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
  onActivate: (f: EditField) => void;
  onSave: (raw: string) => void;
  onCancel: () => void;
}

function EditableCell({
  field, activeField, value, fallback, placeholder = '—',
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
      className={`block min-h-[1.25rem] cursor-text rounded px-0.5 text-xs
        hover:bg-black/5 dark:hover:bg-white/5
        ${effective ? 'text-gray-800 dark:text-gray-100' : 'text-gray-200 dark:text-gray-700'}`}
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
  onActivate: (f: EditField) => void;
  onSave: (val: string | undefined) => void;
  onCancel: () => void;
}

function DatePickerCell({ field, activeField, value, onActivate, onSave, onCancel }: DatePickerCellProps) {
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
    <div className="flex items-center gap-0.5">
      <span role="button" tabIndex={0}
        onClick={() => onActivate(field)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onActivate(field); }}
        className={`cursor-text rounded px-0.5 text-xs hover:bg-black/5 dark:hover:bg-white/5
          ${displayStr ? 'text-gray-800 dark:text-gray-100' : 'text-gray-200 dark:text-gray-700'}`}
      >
        {displayStr ?? 'm.D'}
      </span>
      {/* 隐藏的日期 input，由日历图标触发 */}
      <input ref={dateRef} type="date" tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          const v = fromISO(e.target.value);
          if (v) onSave(v);
        }}
      />
      <button type="button" title="选择日期"
        onClick={() => {
          if (dateRef.current) {
            dateRef.current.value = displayStr ? toISO(displayStr) : '';
          }
          triggerPicker(dateRef);
        }}
        className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
      >
        <CalendarDays className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── MonthPickerCell（回款月份：文本 + 月份选择器） ───────────────────────────

interface MonthPickerCellProps {
  field: 'paymentDate';
  activeField: EditField;
  value: string | undefined;
  onActivate: (f: EditField) => void;
  onSave: (val: string | undefined) => void;
  onCancel: () => void;
}

function MonthPickerCell({ field, activeField, value, onActivate, onSave, onCancel }: MonthPickerCellProps) {
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
    <div className="flex items-center gap-0.5">
      <span role="button" tabIndex={0}
        onClick={() => onActivate(field)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onActivate(field); }}
        className={`cursor-text rounded px-0.5 text-xs hover:bg-black/5 dark:hover:bg-white/5
          ${displayStr ? 'text-gray-800 dark:text-gray-100' : 'text-gray-200 dark:text-gray-700'}`}
      >
        {displayStr ?? 'm'}
      </span>
      <input ref={monthRef} type="month" tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          const v = fromMonthISO(e.target.value);
          if (v) onSave(v);
        }}
      />
      <button type="button" title="选择月份"
        onClick={() => {
          if (monthRef.current) {
            monthRef.current.value = displayStr ? toMonthISO(displayStr) : '';
          }
          triggerPicker(monthRef);
        }}
        className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
      >
        <CalendarDays className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── AmountCell（金额：¥/$ 切换 + 两位小数） ──────────────────────────────────

type Currency = '¥' | '$';

interface AmountCellProps {
  field: 'amount' | 'receivedAmount';
  activeField: EditField;
  value: string | number | undefined;   // 旧数据可能是 number
  onActivate: (f: EditField) => void;
  onSave: (val: string | undefined) => void;
  onCancel: () => void;
}

function AmountCell({ field, activeField, value, onActivate, onSave, onCancel }: AmountCellProps) {
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
      className={`block min-h-[1.25rem] cursor-text rounded px-0.5 text-right text-xs
        hover:bg-black/5 dark:hover:bg-white/5
        ${display ? 'text-gray-800 dark:text-gray-100' : 'text-gray-200 dark:text-gray-700'}`}
    >
      {display ?? '¥/$'}
    </span>
  );
}

// ── 执行情况专用单元格（含预设按钮） ─────────────────────────────────────────

const STATUS_PRESETS = [
  { label: '备货', value: '备货', immediate: true },
  { label: '交货', value: '交货', immediate: true },
  { label: '发票', value: '发票', immediate: false },
] as const;

interface DeliveryStatusCellProps {
  activeField: EditField;
  value: string | undefined;
  onActivate: () => void;
  onSave: (val: string | undefined) => void;
  onCancel: () => void;
}

function DeliveryStatusCell({ activeField, value, onActivate, onSave, onCancel }: DeliveryStatusCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editing = activeField === 'deliveryStatus';
  const displayStr = value != null ? String(value).trim() || null : null;

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <input ref={inputRef} autoFocus type="text"
          defaultValue={displayStr ?? ''}
          placeholder="自由输入或选预设"
          onBlur={(e) => onSave(e.target.value.trim() || undefined)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
          className="w-full rounded border border-blue-300 bg-white px-1.5 py-0.5 text-xs outline-none
            focus:ring-1 focus:ring-blue-200 dark:border-blue-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <div className="flex gap-1">
          {STATUS_PRESETS.map((p) => (
            <button key={p.label} type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                if (p.immediate) {
                  onSave(p.value);
                } else {
                  if (inputRef.current) {
                    inputRef.current.value = p.value;
                    inputRef.current.focus();
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
          {displayStr && (
            <button type="button"
              onMouseDown={(e) => { e.preventDefault(); onSave(undefined); }}
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
    <span role="button" tabIndex={0}
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

  // 客户订单号的 fallback：自动将 RFQ 显示/输入替换为 PO
  const customerNoFallback = record.customerNo.replace(/RFQ/g, 'PO');

  const saveCustomerNo = (raw: string) => {
    setActiveField(null);
    const trimmed = raw.trim().replace(/RFQ/g, 'PO');
    onUpdate({ orderCustomerNo: trimmed || undefined });
  };

  const saveDeliveryStatus = (val: string | undefined) => {
    setActiveField(null);
    onUpdate({ orderDeliveryStatus: val });
  };

  return (
    <tr className={`group border-b border-gray-100 align-middle last:border-b-0 dark:border-gray-800 ${getRowBgClass(record)}`}>

      {/* 订单编号 + 询价编号（固定宽） */}
      <td className="w-28 whitespace-nowrap px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <OrderNoBadge record={record} />
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">{record.inquiryNo}</span>
        </div>
      </td>

      {/* 交货（固定宽，日期选择器） */}
      <td className="w-[4.5rem] px-2 py-2">
        <DatePickerCell field="deliveryDate" activeField={activeField}
          value={record.orderDeliveryDate ? stripDateBrackets(record.orderDeliveryDate) : undefined}
          onActivate={activate}
          onSave={(val) => { setActiveField(null); onUpdate({ orderDeliveryDate: val ? normalizeShortDateInput(val) : undefined }); }}
          onCancel={cancel}
        />
      </td>

      {/* 客户（询价人） */}
      <td className="hidden w-20 px-2 py-2 text-xs text-gray-700 dark:text-gray-300 md:table-cell">
        <span className="block truncate">{record.inquirer}</span>
      </td>

      {/* 内容简述 */}
      <td className="max-w-[150px] overflow-hidden px-2 py-2">
        <p className="truncate text-xs text-gray-700 dark:text-gray-300" title={record.description}>{record.description}</p>
        <p className="truncate text-[10px] text-gray-400 dark:text-gray-500 md:hidden">{record.inquirer}</p>
      </td>

      {/* 确认日（固定宽，日期选择器） */}
      <td className="hidden w-[4.5rem] px-2 py-2 lg:table-cell">
        <DatePickerCell field="confirmDate" activeField={activeField}
          value={record.orderConfirmDate ? stripDateBrackets(record.orderConfirmDate) : undefined}
          onActivate={activate}
          onSave={(val) => { setActiveField(null); onUpdate({ orderConfirmDate: val ? normalizeShortDateInput(val) : undefined }); }}
          onCancel={cancel}
        />
      </td>

      {/* 客户订单号（fallback → customerNo，但 RFQ→PO） */}
      <td className="hidden w-24 px-2 py-2 lg:table-cell">
        <EditableCell field="customerNo" activeField={activeField}
          value={record.orderCustomerNo}
          fallback={customerNoFallback}
          placeholder="—"
          onActivate={activate}
          onSave={saveCustomerNo}
          onCancel={cancel}
        />
      </td>

      {/* 执行情况（带预设按钮） */}
      <td className="min-w-[110px] px-2 py-2">
        <DeliveryStatusCell
          activeField={activeField}
          value={record.orderDeliveryStatus}
          onActivate={() => setActiveField('deliveryStatus')}
          onSave={saveDeliveryStatus}
          onCancel={cancel}
        />
      </td>

      {/* ── 管理员专属列 ── */}
      {isAdmin && (
        <td className="hidden w-28 px-2 py-2 xl:table-cell">
          <AmountCell field="amount" activeField={activeField}
            value={record.orderAmount}
            onActivate={activate}
            onSave={(val) => { setActiveField(null); onUpdate({ orderAmount: val }); }}
            onCancel={cancel}
          />
        </td>
      )}
      {isAdmin && (
        <td className="hidden w-16 px-2 py-2 xl:table-cell">
          <MonthPickerCell field="paymentDate" activeField={activeField}
            value={record.orderPaymentDate}
            onActivate={activate}
            onSave={(val) => { setActiveField(null); onUpdate({ orderPaymentDate: val }); }}
            onCancel={cancel}
          />
        </td>
      )}
      {isAdmin && (
        <td className="hidden w-28 px-2 py-2 xl:table-cell">
          <AmountCell field="receivedAmount" activeField={activeField}
            value={record.orderReceivedAmount}
            onActivate={activate}
            onSave={(val) => { setActiveField(null); onUpdate({ orderReceivedAmount: val }); }}
            onCancel={cancel}
          />
        </td>
      )}
    </tr>
  );
}
