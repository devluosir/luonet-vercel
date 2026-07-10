'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { InquiryRecord } from '@/features/inquiry/types';
import { normalizeShortDateInput, stripDateBrackets } from '@/features/inquiry/utils/inquiryUtils';
import { STATUS_PRESETS } from '@/features/order/components/DeliveryStatusCell';

/**
 * 采购订单表——"编辑采购订单"弹窗（2026-07-10 新增，参考订单状态表的 OrderEditModal.tsx 同款模式）
 *
 * 点击每一行"订单编号+询价编号"这个原本纯只读区域触发。弹窗里：
 * - 只读信息区：来自询价/订单状态表的字段（订单编号、询价编号、客户询价编号、联络人、内容描述、
 *   确认日期、客户订单号、订单状态备注）——确认日期/客户订单号本来就是采购订单表这边只读展示、
 *   不允许编辑（见 InquiryRecord 类型注释），撤销C/悬挂P/善后S 状态标记及其情况备注也只在订单状态表
 *   的"编辑订单"弹窗编辑，这里同样只读展示，不提供编辑入口。
 * - 可编辑区：采购单号、供应商、采购金额（需要 order.financials 权限）——采购订单表专属字段；
 *   交货日期、执行情况——跟订单状态表双向共享的字段，这里也允许编辑（与行内点击编辑并存）。
 */

const FIELD_CLS =
  'h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none ' +
  'focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ' +
  'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400';

const LABEL_CLS = 'block text-xs font-medium text-gray-400 dark:text-gray-500';

type PurchaseCurrency = '¥' | '$' | '€';
const CURRENCY_CYCLE: Record<PurchaseCurrency, PurchaseCurrency> = { '¥': '$', '$': '€', '€': '¥' };

function parsePurchaseAmount(v: string | undefined): { currency: PurchaseCurrency; numStr: string } {
  if (!v) return { currency: '¥', numStr: '' };
  const s = v.trim();
  const currency: PurchaseCurrency = s.startsWith('$') ? '$' : s.startsWith('€') ? '€' : '¥';
  return { currency, numStr: s.replace(/^[¥$€]/, '').replace(/,/g, '') };
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

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const dateRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1">
      <label className={LABEL_CLS}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="m.D" className={FIELD_CLS} />
        <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700">
          <input
            ref={dateRef}
            type="date"
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            aria-label={`选择${label}`}
            onClick={(e) => { e.currentTarget.value = value ? shortToISO(value) : ''; }}
            onChange={(e) => { const v = isoToShort(e.target.value); if (v) onChange(v); }}
          />
          <CalendarDays className="pointer-events-none h-4 w-4 text-gray-300 dark:text-gray-600" />
        </span>
      </div>
    </div>
  );
}

interface PurchaseOrderEditModalProps {
  isOpen: boolean;
  record: InquiryRecord | null;
  canViewFinancials: boolean;
  consigneeOptions: string[];
  onClose: () => void;
  onSave: (id: string, patch: Partial<InquiryRecord>) => void;
}

export function PurchaseOrderEditModal({
  isOpen, record, canViewFinancials, consigneeOptions, onClose, onSave,
}: PurchaseOrderEditModalProps) {
  const [purchaseOrderNo, setPurchaseOrderNo] = useState('');
  const [purchaseOrderSupplier, setPurchaseOrderSupplier] = useState('');
  const [amountCurrency, setAmountCurrency] = useState<PurchaseCurrency>('¥');
  const [amountNumStr, setAmountNumStr] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [deliveryConsignee, setDeliveryConsignee] = useState('');

  useEffect(() => {
    if (!isOpen || !record) return;
    setPurchaseOrderNo(record.purchaseOrderNo ?? '');
    setPurchaseOrderSupplier(record.purchaseOrderSupplier ?? '');
    const amount = parsePurchaseAmount(record.purchaseOrderAmount);
    setAmountCurrency(amount.currency);
    setAmountNumStr(amount.numStr);
    setDeliveryDate(record.orderDeliveryDate ? stripDateBrackets(record.orderDeliveryDate) : '');
    setDeliveryStatus(record.orderDeliveryStatus ?? '');
    setDeliveryConsignee(record.orderDeliveryConsignee ?? '');
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  const isDeliveryStatusActive = deliveryStatus.trim().startsWith('交货');
  const customerNoFallback = (record.customerNo ?? '').replace(/RFQ/g, 'PO');
  const customerNoDisplay = record.orderCustomerNo?.trim() || customerNoFallback || '—';
  const confirmDateDisplay = record.orderConfirmDate ? stripDateBrackets(record.orderConfirmDate) : '—';
  const subStatusRemark = record.orderSubStatusRemark?.trim();
  const subStatusLabel =
    record.orderSubStatus === 'cancelled' ? '辙销C'
    : record.orderSubStatus === 'suspended' ? '悬挂P'
    : record.orderSubStatus === 'followup' ? '善后S'
    : null;

  const handleSave = () => {
    const trimmedAmount = amountNumStr.trim();
    const amountN = parseFloat(trimmedAmount);

    onSave(record.id, {
      purchaseOrderNo: purchaseOrderNo.trim() || undefined,
      purchaseOrderSupplier: purchaseOrderSupplier.trim() || undefined,
      ...(canViewFinancials
        ? { purchaseOrderAmount: !isNaN(amountN) && trimmedAmount ? `${amountCurrency}${amountN.toFixed(2)}` : undefined }
        : {}),
      orderDeliveryDate: deliveryDate.trim() ? normalizeShortDateInput(deliveryDate.trim()) : undefined,
      orderDeliveryStatus: deliveryStatus.trim() || undefined,
      orderDeliveryConsignee: deliveryConsignee.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-[#2C2C2E]">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 pb-4 pt-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">编辑采购订单</h2>
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
          {/* ── 来自询价/订单状态表的只读信息 ── */}
          <div className="mb-4 rounded-xl border border-gray-200/70 bg-gray-50/90 p-3 dark:border-gray-700 dark:bg-gray-800/80">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              来自询价/订单状态表（只读）
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
                <dt className="text-xs text-gray-400 dark:text-gray-500">内容描述</dt>
                <dd className="truncate text-gray-700 dark:text-gray-200" title={record.description}>
                  {record.description || '—'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-gray-400 dark:text-gray-500">确认日期</dt>
                <dd className="truncate text-gray-700 dark:text-gray-200">{confirmDateDisplay}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-gray-400 dark:text-gray-500">客户订单号</dt>
                <dd className="truncate text-gray-700 dark:text-gray-200" title={customerNoDisplay}>
                  {customerNoDisplay}
                </dd>
              </div>
              {subStatusLabel && (
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-xs text-gray-400 dark:text-gray-500">订单状态标记</dt>
                  <dd className="truncate text-sm">
                    <span className="font-semibold text-red-500">{subStatusLabel}</span>
                    {subStatusRemark && (
                      <span className="ml-1.5 text-gray-500 dark:text-gray-400">{subStatusRemark}</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
              确认日期、客户订单号、订单状态标记如需修改，请在订单状态表的&ldquo;编辑订单&rdquo;中操作。
            </p>
          </div>

          {/* ── 可编辑采购订单信息 ── */}
          <div className="mb-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              采购订单信息
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className={LABEL_CLS}>采购单号</label>
                <input
                  value={purchaseOrderNo}
                  onChange={(e) => setPurchaseOrderNo(e.target.value)}
                  className={FIELD_CLS}
                  placeholder="采购单号"
                />
              </div>
              <div className="space-y-1">
                <label className={LABEL_CLS}>供应商</label>
                <input
                  value={purchaseOrderSupplier}
                  onChange={(e) => setPurchaseOrderSupplier(e.target.value)}
                  className={FIELD_CLS}
                  placeholder="供应商"
                />
              </div>
            </div>

            <DateField label="交货日期" value={deliveryDate} onChange={setDeliveryDate} />

            <div className="space-y-1">
              <label className={LABEL_CLS}>执行情况</label>
              <input
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
              <div className="space-y-1">
                <label className={LABEL_CLS}>采购金额</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAmountCurrency((c) => CURRENCY_CYCLE[c])}
                    className="h-9 w-8 shrink-0 rounded-lg border border-gray-200 text-sm font-bold text-blue-500 hover:text-blue-700 dark:border-gray-700 dark:text-blue-400"
                  >
                    {amountCurrency}
                  </button>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountNumStr}
                    onChange={(e) => setAmountNumStr(e.target.value)}
                    className={`${FIELD_CLS} text-right`}
                  />
                </div>
              </div>
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
