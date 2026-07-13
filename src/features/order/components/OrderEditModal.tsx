'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { InquiryRecord, OrderSubStatus } from '@/features/inquiry/types';
import { normalizeShortDateInput, stripDateBrackets } from '@/features/inquiry/utils/inquiryUtils';
import { STATUS_PRESETS } from './DeliveryStatusCell';

/**
 * 订单状态表——"编辑订单"弹窗（2026-07-10 新增）
 *
 * 背景：撤销C/悬挂P/善后S + 情况备注这几个"订单状态变化"字段原来放在询报价登记的
 * "编辑询价"弹窗里编辑，但它们描述的是订单本身的状态，不是询价阶段的信息，放在询价
 * 弹窗里概念上不对口，用户在订单状态表反而看不到入口。这里把它们连同订单状态表已有的
 * 行内可编辑字段（交货/确认日期、客户订单号、执行情况、金额、回款月份、到账金额）一起
 * 集中到这个弹窗里，点击订单状态表每一行"订单编号+询价编号"这个原来纯只读的区域触发。
 * 行内单元格点击编辑保留、并存，不是替代关系。
 *
 * 订单编号（orderNo）本身——把询价"转成"订单或撤回——概念上属于询价登记环节，仍然只在
 * "编辑询价"弹窗编辑，这里只读展示。
 */

const FIELD_CLS =
  'h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none ' +
  'focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ' +
  'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400';

const LABEL_CLS = 'block text-xs font-medium text-gray-400 dark:text-gray-500';

type Currency = '¥' | '$';

function parseAmount(v: string | number | undefined): { currency: Currency; numStr: string } {
  if (v === undefined || v === null) return { currency: '¥', numStr: '' };
  const s = String(v).trim();
  const currency: Currency = s.startsWith('$') ? '$' : '¥';
  const numStr = s.replace(/^[¥$]/, '').replace(/,/g, '');
  return { currency, numStr };
}

/** "m.D" → "YYYY-MM-DD"（取今年，供原生日期选择器回填用） */
function shortToISO(short: string): string {
  const year = new Date().getFullYear();
  const clean = short.replace(/[[\]]/g, '');
  const [mStr, dStr] = clean.split('.');
  const m = parseInt(mStr ?? '0');
  const d = parseInt(dStr ?? '0');
  if (!m || !d) return '';
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" → "m.D" */
function isoToShort(iso: string): string {
  const [, mm, dd] = iso.split('-');
  const m = parseInt(mm ?? '0');
  const d = parseInt(dd ?? '0');
  return m && d ? `${m}.${d}` : '';
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function DateField({ label, value, onChange }: DateFieldProps) {
  const dateRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1">
      <label className={LABEL_CLS}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="m.D"
          className={FIELD_CLS}
        />
        <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700">
          <input
            ref={dateRef}
            type="date"
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            aria-label={`选择${label}`}
            onClick={(e) => {
              e.currentTarget.value = value ? shortToISO(value) : '';
            }}
            onChange={(e) => {
              const v = isoToShort(e.target.value);
              if (!e.target.value || v) onChange(v);
            }}
          />
          <CalendarDays className="pointer-events-none h-4 w-4 text-gray-300 dark:text-gray-600" />
        </span>
      </div>
    </div>
  );
}

function MonthField({ label, value, onChange }: DateFieldProps) {
  const monthRef = useRef<HTMLInputElement>(null);

  const toMonthISO = (month: string): string => {
    const parsedMonth = parseInt(month);
    if (!parsedMonth) return '';
    return `${new Date().getFullYear()}-${String(parsedMonth).padStart(2, '0')}`;
  };

  const fromMonthISO = (iso: string): string => {
    const [, mm] = iso.split('-');
    const month = parseInt(mm ?? '0');
    return month ? String(month) : '';
  };

  return (
    <div className="space-y-1">
      <label className={LABEL_CLS}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="m"
          className={FIELD_CLS}
        />
        <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700">
          <input
            ref={monthRef}
            type="month"
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            aria-label={`选择${label}`}
            onClick={(e) => {
              e.currentTarget.value = value ? toMonthISO(value) : '';
            }}
            onChange={(e) => {
              const next = fromMonthISO(e.target.value);
              if (!e.target.value || next) onChange(next);
            }}
          />
          <CalendarDays className="pointer-events-none h-4 w-4 text-gray-300 dark:text-gray-600" />
        </span>
      </div>
    </div>
  );
}

interface AmountFieldProps {
  label: string;
  currency: Currency;
  numStr: string;
  onCurrencyChange?: (c: Currency) => void;
  onNumChange: (v: string) => void;
  locked?: boolean;
}

function AmountField({ label, currency, numStr, onCurrencyChange, onNumChange, locked = false }: AmountFieldProps) {
  return (
    <div className="space-y-1">
      <label className={LABEL_CLS}>{label}</label>
      <div className="flex items-center gap-1">
        {locked ? (
          <span className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-sm font-bold text-gray-500 dark:border-gray-700 dark:text-gray-400">
            {currency}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onCurrencyChange?.(currency === '¥' ? '$' : '¥')}
            className="h-9 w-8 shrink-0 rounded-lg border border-gray-200 text-sm font-bold text-blue-500 hover:text-blue-700 dark:border-gray-700 dark:text-blue-400"
            aria-label="切换订单币种"
          >
            {currency}
          </button>
        )}
        <input
          type="number"
          step="0.01"
          min="0"
          value={numStr}
          onChange={(e) => onNumChange(e.target.value)}
          className={`${FIELD_CLS} text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        />
      </div>
    </div>
  );
}

interface OrderEditModalProps {
  isOpen: boolean;
  record: InquiryRecord | null;
  canViewFinancials: boolean;
  consigneeOptions: string[];
  onClose: () => void;
  onSave: (id: string, patch: Partial<InquiryRecord>) => void;
}

export function OrderEditModal({
  isOpen, record, canViewFinancials, consigneeOptions, onClose, onSave,
}: OrderEditModalProps) {
  const [deliveryDate, setDeliveryDate] = useState('');
  const [confirmDate, setConfirmDate] = useState('');
  const [customerNo, setCustomerNo] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [deliveryConsignee, setDeliveryConsignee] = useState('');
  const [currency, setCurrency] = useState<Currency>('¥');
  const [amountNumStr, setAmountNumStr] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [receivedNumStr, setReceivedNumStr] = useState('');
  const [subStatus, setSubStatus] = useState<OrderSubStatus | undefined>(undefined);
  const [subStatusRemark, setSubStatusRemark] = useState('');
  const [followupCompleted, setFollowupCompleted] = useState(false);
  const initializedRecordIdRef = useRef<string | null>(null);
  const subStatusDirtyRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !record) {
      initializedRecordIdRef.current = null;
      subStatusDirtyRef.current = false;
      return;
    }

    // 后台同步会替换 record 对象。完整表单只在每次打开时初始化，避免刷新吞掉未保存输入；
    // 用户尚未操作状态区时，C/P/S 状态和备注则继续跟随最新记录。
    if (initializedRecordIdRef.current === record.id) {
      if (!subStatusDirtyRef.current) {
        setSubStatus(record.orderSubStatus);
        setSubStatusRemark(record.orderSubStatusRemark ?? '');
        setFollowupCompleted(!!record.orderFollowupCompleted);
      }
      return;
    }

    initializedRecordIdRef.current = record.id;
    subStatusDirtyRef.current = false;
    setDeliveryDate(record.orderDeliveryDate ? stripDateBrackets(record.orderDeliveryDate) : '');
    setConfirmDate(record.orderConfirmDate ? stripDateBrackets(record.orderConfirmDate) : '');
    const customerNoFallback = (record.customerNo ?? '').replace(/RFQ/g, 'PO');
    setCustomerNo(record.orderCustomerNo?.trim() || customerNoFallback);
    setDeliveryStatus(record.orderDeliveryStatus ?? '');
    setDeliveryConsignee(record.orderDeliveryConsignee ?? '');
    const amount = parseAmount(record.orderAmount);
    const received = parseAmount(record.orderReceivedAmount);
    setCurrency(record.orderAmount !== undefined ? amount.currency
      : record.orderReceivedAmount !== undefined ? received.currency
      : '¥');
    setAmountNumStr(amount.numStr);
    setPaymentDate(record.orderPaymentDate ?? '');
    setReceivedNumStr(received.numStr);
    setSubStatus(record.orderSubStatus);
    setSubStatusRemark(record.orderSubStatusRemark ?? '');
    setFollowupCompleted(!!record.orderFollowupCompleted);
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  const isDeliveryStatusActive = deliveryStatus.trim().startsWith('交货');

  const handleSave = () => {
    const trimmedAmount = amountNumStr.trim();
    const amountN = parseFloat(trimmedAmount);
    const trimmedReceived = receivedNumStr.trim();
    const receivedN = parseFloat(trimmedReceived);
    const subStatusPatch: Partial<InquiryRecord> = subStatusDirtyRef.current
      ? {
          orderSubStatus: subStatus,
          orderSubStatusRemark: subStatus ? subStatusRemark.trim() || undefined : undefined,
          // 善后完成只在当前仍是"善后S"时有意义；切到其它状态或取消标记时一并清空，
          // 避免残留一个不再对应任何善后状态的"已完成"标记
          orderFollowupCompleted: subStatus === 'followup' ? (followupCompleted || undefined) : undefined,
        }
      : {};

    onSave(record.id, {
      orderDeliveryDate: deliveryDate.trim() ? normalizeShortDateInput(deliveryDate.trim()) : undefined,
      orderConfirmDate: confirmDate.trim() ? normalizeShortDateInput(confirmDate.trim()) : undefined,
      orderCustomerNo: customerNo.trim().replace(/RFQ/g, 'PO') || undefined,
      orderDeliveryStatus: deliveryStatus.trim() || undefined,
      orderDeliveryConsignee: deliveryConsignee.trim() || undefined,
      ...(canViewFinancials
        ? {
            orderAmount: !isNaN(amountN) && trimmedAmount ? `${currency}${amountN.toFixed(2)}` : undefined,
            orderPaymentDate: paymentDate.trim() || undefined,
            orderReceivedAmount: !isNaN(receivedN) && trimmedReceived ? `${currency}${receivedN.toFixed(2)}` : undefined,
          }
        : {}),
      ...subStatusPatch,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-[#2C2C2E]">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 pb-4 pt-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">编辑订单</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            aria-label="关闭弹窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-700" />

        <div className="px-6 py-5">
          {/* ── 来自询价的只读信息 ── */}
          <div className="mb-4 rounded-xl border border-gray-200/70 bg-gray-50/90 p-3 dark:border-gray-700 dark:bg-gray-800/80">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              来自询价（只读）
            </p>
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-xs text-gray-400 dark:text-gray-500">订单编号</dt>
                <dd className="truncate font-mono font-semibold text-green-700 dark:text-green-400">
                  {record.orderNo || '—'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-gray-400 dark:text-gray-500">询价编号</dt>
                <dd className="truncate font-mono text-gray-800 dark:text-gray-100">{record.inquiryNo}</dd>
              </div>
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-xs text-gray-400 dark:text-gray-500">客户询价编号</dt>
                <dd className="truncate text-gray-700 dark:text-gray-200" title={record.customerNo}>
                  {record.customerNo || '—'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-gray-400 dark:text-gray-500">联络人</dt>
                <dd className="truncate text-gray-700 dark:text-gray-200">{record.inquirer || '—'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-gray-400 dark:text-gray-500">内容简述</dt>
                <dd className="truncate text-gray-700 dark:text-gray-200" title={record.description}>
                  {record.description || '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
              订单编号如需修改或撤回，请在询报价登记表的&ldquo;编辑询价&rdquo;中操作。
            </p>
          </div>

          {/* ── 可编辑订单信息 ── */}
          <div className="mb-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              订单信息
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <DateField label="交货日期" value={deliveryDate} onChange={setDeliveryDate} />
              <DateField label="确认日期" value={confirmDate} onChange={setConfirmDate} />
            </div>
            <div className="space-y-1">
              <label className={LABEL_CLS}>客户订单号</label>
              <input
                value={customerNo}
                onChange={(e) => setCustomerNo(e.target.value)}
                className={FIELD_CLS}
                placeholder="—"
              />
            </div>
            <div className="space-y-1">
              <label className={LABEL_CLS}>执行情况</label>
              <input
                aria-label="执行情况"
                value={deliveryStatus}
                onChange={(e) => setDeliveryStatus(e.target.value)}
                className={FIELD_CLS}
                placeholder="自由输入或选预设"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {STATUS_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setDeliveryStatus(p.value)}
                    className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-semibold
                      text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700
                      dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200"
                  >
                    {p.label}
                  </button>
                ))}
                {deliveryStatus && (
                  <button
                    type="button"
                    onClick={() => { setDeliveryStatus(''); setDeliveryConsignee(''); }}
                    className="rounded-full border border-red-200 px-2.5 py-0.5 text-xs font-semibold
                      text-red-400 hover:border-red-400 hover:text-red-600
                      dark:border-red-800 dark:text-red-500 dark:hover:border-red-600"
                  >
                    清除
                  </button>
                )}
              </div>
              {isDeliveryStatusActive && consigneeOptions.length > 0 && (
                <select
                  value={deliveryConsignee}
                  onChange={(e) => setDeliveryConsignee(e.target.value)}
                  className={FIELD_CLS}
                >
                  <option value="">选择收货人</option>
                  {consigneeOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
            </div>

            {canViewFinancials && (
              <div className="grid gap-3 sm:grid-cols-3">
                <AmountField
                  label="金额"
                  currency={currency}
                  numStr={amountNumStr}
                  onCurrencyChange={setCurrency}
                  onNumChange={setAmountNumStr}
                />
                <MonthField label="回款月份" value={paymentDate} onChange={setPaymentDate} />
                <AmountField
                  label="到账金额"
                  currency={currency}
                  numStr={receivedNumStr}
                  onNumChange={setReceivedNumStr}
                  locked
                />
              </div>
            )}
          </div>

          {/* ── 订单状态标记 ── */}
          <div className="mb-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-gray-800/50 dark:ring-gray-700">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              订单状态标记
            </p>
            <div className="flex items-center gap-1.5">
              {(
                [
                  { val: 'cancelled', label: '辙销C' },
                  { val: 'suspended', label: '悬挂P' },
                  { val: 'followup', label: '善后S' },
                ] as const
              ).map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    subStatusDirtyRef.current = true;
                    setSubStatus((prev) => {
                      const next = prev === val ? undefined : val;
                      if (next !== 'followup') setFollowupCompleted(false);
                      return next;
                    });
                  }}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                    subStatus === val
                      ? 'bg-red-500 text-white'
                      : 'border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 dark:border-gray-700 dark:hover:border-red-700 dark:hover:text-red-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {subStatus && (
              <div className="mt-2 flex items-center gap-2">
                <span className="shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">
                  情况备注
                </span>
                <input
                  value={subStatusRemark}
                  onChange={(e) => {
                    subStatusDirtyRef.current = true;
                    setSubStatusRemark(e.target.value);
                  }}
                  className={
                    'min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm ' +
                    'text-gray-700 outline-none placeholder:text-gray-300 ' +
                    'focus:border-red-300 focus:ring-1 focus:ring-red-100 ' +
                    'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-red-700'
                  }
                  placeholder="简要说明当前情况，例如客户暂缓、等待确认、需善后处理"
                />
              </div>
            )}
            {subStatus === 'followup' && (
              <label className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={followupCompleted}
                  onChange={(e) => {
                    subStatusDirtyRef.current = true;
                    setFollowupCompleted(e.target.checked);
                  }}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-green-600 dark:border-gray-600"
                />
                善后完成
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  （完成后归入正常单，标记显示为 S-OK）
                </span>
              </label>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              取消
            </button>
            <Button type="button" onClick={handleSave} className="px-5">
              保存修改
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
