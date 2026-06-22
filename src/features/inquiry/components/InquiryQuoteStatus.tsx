'use client';

import { useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import type { CustomerQuoteStatus, InquiryRecord, SupplierQuoteStatus, SupplierStatus } from '../types';
import {
  createId,
  formatShortDate,
  getNextQuoteVersion,
  getRecordColorState,
  normalizeShortDateInput,
  stripDateBrackets,
} from '../utils/inquiryUtils';
import { SupplierStatusTag } from './SupplierStatusTag';
import { QuotedStatusList } from './QuotedStatusList';

interface InquiryQuoteStatusProps {
  record: InquiryRecord;
  onSuppliersChange: (suppliers: SupplierQuoteStatus[]) => void;
  onQuotedChange: (quoted: CustomerQuoteStatus[]) => void;
}

type ActiveForm =
  | { kind: 'supplier-add' }
  | { kind: 'supplier-edit'; id: string }
  | { kind: 'quoted-add' }
  | { kind: 'quoted-edit'; id: string }
  | null;

interface SupplierFormState {
  supplierShortName: string;
  quoteDate: string;
  status: SupplierStatus;
}

interface QuotedFormState {
  quoteDate: string;
  supplierShortName: string;
  version: string;
}

const STATUS_OPTIONS: Array<{ value: SupplierStatus; label: string }> = [
  { value: 'pending',     label: '未报价' },
  { value: 'quoted',      label: '已报价' },
  { value: 'need_info',   label: '需补资料' },
  { value: 'unavailable', label: '无法报价' },
];

const INPUT_CLS =
  'h-7 rounded border border-gray-200 bg-gray-50 px-2 text-xs text-gray-900 outline-none ' +
  'focus:border-blue-400 focus:bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

const ROW_LABEL = 'mt-1 w-12 shrink-0 text-xs text-gray-400 dark:text-gray-500';

export function InquiryQuoteStatus({ record, onSuppliersChange, onQuotedChange }: InquiryQuoteStatusProps) {
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>({
    supplierShortName: '',
    quoteDate: '',
    status: 'pending',
  });
  const [quotedForm, setQuotedForm] = useState<QuotedFormState>({
    quoteDate: stripDateBrackets(formatShortDate(new Date())),
    supplierShortName: '',
    version: '',
  });

  // ── 派生数据 ──────────────────────────────────────────
  const unavailableStatus = record.quotedStatuses.find((s) => s.type === 'unavailable');
  const closedStatus = record.quotedStatuses.find((s) => s.type === 'closed');
  const supplementedStatus = record.quotedStatuses.find((s) => s.type === 'supplemented');
  const regularStatuses = record.quotedStatuses.filter(
    (s) => s.type !== 'unavailable' && s.type !== 'supplemented' && s.type !== 'closed'
  );
  const hasNeedInfoSupplier = record.supplierStatuses.some((s) => s.status === 'need_info');
  const quotedSupplierNames = record.supplierStatuses
    .filter((s) => s.status === 'quoted' && !!s.quoteDate)
    .map((s) => s.supplierShortName);
  const mainColorClass = getRecordColorState(record);
  const isSupplierForm = activeForm?.kind === 'supplier-add' || activeForm?.kind === 'supplier-edit';
  const isQuotedForm = activeForm?.kind === 'quoted-add' || activeForm?.kind === 'quoted-edit';

  // ── 供应商 CRUD ──────────────────────────────────────
  const openAddSupplier = () => {
    setSupplierForm({ supplierShortName: '', quoteDate: '', status: 'pending' });
    setActiveForm({ kind: 'supplier-add' });
  };

  const openEditSupplier = (supplierId: string) => {
    const s = record.supplierStatuses.find((item) => item.id === supplierId);
    if (!s) return;
    setSupplierForm({
      supplierShortName: s.supplierShortName,
      quoteDate: stripDateBrackets(s.quoteDate ?? ''),
      status: s.status ?? 'pending',
    });
    setActiveForm({ kind: 'supplier-edit', id: supplierId });
  };

  // 注意：不再是 FormEvent handler，改为普通函数，由按钮 onClick / Enter 键触发
  const submitSupplier = () => {
    const quoteDate = normalizeShortDateInput(supplierForm.quoteDate);
    const payload: Omit<SupplierQuoteStatus, 'id'> = {
      supplierShortName: supplierForm.supplierShortName.trim(),
      quoteDate: quoteDate || undefined,
      status: supplierForm.status,
    };
    if (!payload.supplierShortName) return;
    if (activeForm?.kind === 'supplier-edit') {
      onSuppliersChange(
        record.supplierStatuses.map((s) =>
          s.id === activeForm.id ? { ...s, ...payload } : s
        )
      );
    } else {
      onSuppliersChange([...record.supplierStatuses, { ...payload, id: createId() }]);
    }
    setActiveForm(null);
  };

  const handleRemoveSupplier = (supplierId: string) => {
    const s = record.supplierStatuses.find((item) => item.id === supplierId);
    if (window.confirm(`确定删除供应商「${s?.supplierShortName ?? '该供应商'}」吗？`)) {
      onSuppliersChange(record.supplierStatuses.filter((item) => item.id !== supplierId));
    }
  };

  // ── 已报价 CRUD ──────────────────────────────────────
  const openAddQuoted = () => {
    setQuotedForm({
      quoteDate: stripDateBrackets(formatShortDate(new Date())),
      supplierShortName: quotedSupplierNames[0] ?? '',
      version: getNextQuoteVersion(regularStatuses),
    });
    setActiveForm({ kind: 'quoted-add' });
  };

  const openEditQuoted = (status: CustomerQuoteStatus) => {
    setQuotedForm({
      quoteDate: stripDateBrackets(status.quoteDate),
      supplierShortName: status.supplierShortName,
      version: status.version,
    });
    setActiveForm({ kind: 'quoted-edit', id: status.id });
  };

  const submitQuoted = () => {
    const payload = {
      quoteDate: normalizeShortDateInput(quotedForm.quoteDate),
      supplierShortName: quotedForm.supplierShortName.trim(),
      version: quotedForm.version.trim(),
    };
    if (!payload.quoteDate || !payload.supplierShortName || !payload.version) return;
    if (activeForm?.kind === 'quoted-edit') {
      onQuotedChange(
        record.quotedStatuses.map((s) =>
          s.id === activeForm.id ? { ...s, ...payload } : s
        )
      );
    } else {
      onQuotedChange([...record.quotedStatuses, { ...payload, id: createId() }]);
    }
    setActiveForm(null);
  };

  const handleRemoveQuoted = (qsId: string) => {
    const qs = record.quotedStatuses.find((s) => s.id === qsId);
    const label = qs
      ? `${stripDateBrackets(qs.quoteDate)} ${qs.supplierShortName} ${qs.version}`
      : '该记录';
    if (window.confirm(`确定删除「${label}」吗？`)) {
      onQuotedChange(record.quotedStatuses.filter((s) => s.id !== qsId));
    }
  };

  // ── 已补充信息 toggle ─────────────────────────────────
  const toggleSupplemented = (checked: boolean) => {
    if (checked) {
      const newStatus: CustomerQuoteStatus = {
        id: createId(),
        quoteDate: normalizeShortDateInput(stripDateBrackets(formatShortDate(new Date()))),
        supplierShortName: '',
        version: '',
        type: 'supplemented',
      };
      onQuotedChange([...record.quotedStatuses, newStatus]);
    } else {
      onQuotedChange(record.quotedStatuses.filter((s) => s.type !== 'supplemented'));
    }
  };

  const updateSupplementedDate = (raw: string) => {
    const normalized = normalizeShortDateInput(raw);
    if (!normalized) return;
    onQuotedChange(
      record.quotedStatuses.map((s) =>
        s.type === 'supplemented' ? { ...s, quoteDate: normalized } : s
      )
    );
  };

  // ── 询价已关闭 toggle ─────────────────────────────────
  const toggleClosed = (checked: boolean) => {
    if (checked) {
      const newStatus: CustomerQuoteStatus = {
        id: createId(),
        quoteDate: normalizeShortDateInput(stripDateBrackets(formatShortDate(new Date()))),
        supplierShortName: '',
        version: '',
        type: 'closed',
      };
      onQuotedChange([...record.quotedStatuses, newStatus]);
    } else {
      onQuotedChange(record.quotedStatuses.filter((s) => s.type !== 'closed'));
    }
  };

  const updateClosedDate = (raw: string) => {
    const normalized = normalizeShortDateInput(raw);
    if (!normalized) return;
    onQuotedChange(
      record.quotedStatuses.map((s) =>
        s.type === 'closed' ? { ...s, quoteDate: normalized } : s
      )
    );
  };

  // ── 无法报价 toggle ───────────────────────────────────
  const toggleUnavailable = (checked: boolean) => {
    if (checked) {
      const newStatus: CustomerQuoteStatus = {
        id: createId(),
        quoteDate: normalizeShortDateInput(stripDateBrackets(formatShortDate(new Date()))),
        supplierShortName: '',
        version: '',
        type: 'unavailable',
      };
      onQuotedChange([...record.quotedStatuses, newStatus]);
    } else {
      onQuotedChange(record.quotedStatuses.filter((s) => s.type !== 'unavailable'));
    }
  };

  const updateUnavailableDate = (raw: string) => {
    const normalized = normalizeShortDateInput(raw);
    if (!normalized) return;
    onQuotedChange(
      record.quotedStatuses.map((s) =>
        s.type === 'unavailable' ? { ...s, quoteDate: normalized } : s
      )
    );
  };

  // ── 公共键盘处理 ─────────────────────────────────────
  const onKeySupplier = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); submitSupplier(); }
    if (e.key === 'Escape') setActiveForm(null);
  };
  const onKeyQuoted = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); submitQuoted(); }
    if (e.key === 'Escape') setActiveForm(null);
  };

  return (
    <div className="space-y-2.5">
      {/* ── 供应商行 ── */}
      <div className="flex items-start gap-2">
        <span className={ROW_LABEL}>供应商</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {record.supplierStatuses.map((supplier) => (
            <SupplierStatusTag
              key={supplier.id}
              supplier={supplier}
              onEdit={openEditSupplier}
              onDelete={handleRemoveSupplier}
            />
          ))}
          <button
            type="button"
            onClick={openAddSupplier}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Plus className="h-3 w-3" />
            供应商
          </button>
        </div>
      </div>

      {/* 供应商编辑面板（div，非 form，避免嵌套 form 触发外层提交） */}
      {isSupplierForm && (
        <div className="ml-14 flex flex-wrap items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
          <input
            autoFocus
            value={supplierForm.supplierShortName}
            onChange={(e) => setSupplierForm((p) => ({ ...p, supplierShortName: e.target.value }))}
            onKeyDown={onKeySupplier}
            className={`${INPUT_CLS} w-20`}
            placeholder="供应商"
          />
          <input
            value={supplierForm.quoteDate}
            disabled={supplierForm.status === 'pending'}
            onChange={(e) => {
              const val = e.target.value;
              setSupplierForm((p) => ({
                ...p,
                quoteDate: val,
                status: val && p.status === 'pending' ? 'quoted' : p.status,
              }));
            }}
            onKeyDown={onKeySupplier}
            className={`${INPUT_CLS} w-16 disabled:cursor-not-allowed disabled:opacity-50`}
            placeholder="6.20"
          />
          <select
            value={supplierForm.status}
            onChange={(e) => {
              const next = e.target.value as SupplierStatus;
              setSupplierForm((p) => ({
                ...p,
                status: next,
                quoteDate: next === 'pending' ? '' : p.quoteDate || stripDateBrackets(formatShortDate(new Date())),
              }));
            }}
            className={`${INPUT_CLS} px-1.5`}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={submitSupplier}
            className="inline-flex h-7 items-center gap-1 rounded bg-blue-600 px-2 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Save className="h-3 w-3" />确认
          </button>
          <button
            type="button"
            onClick={() => setActiveForm(null)}
            className="inline-flex h-7 items-center rounded px-1.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── 已报价行 ── */}
      <div className="flex items-start gap-2">
        <span className={ROW_LABEL}>已报价</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <QuotedStatusList
            statuses={regularStatuses}
            colorClass={mainColorClass}
            onEditRequest={openEditQuoted}
            onAddRequest={openAddQuoted}
            onRemove={handleRemoveQuoted}
          />
        </div>
      </div>

      {/* 已报价编辑面板（div，非 form） */}
      {isQuotedForm && (
        <div className="ml-14 flex flex-wrap items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
          <input
            autoFocus
            value={quotedForm.quoteDate}
            onChange={(e) => setQuotedForm((p) => ({ ...p, quoteDate: e.target.value }))}
            onKeyDown={onKeyQuoted}
            className={`${INPUT_CLS} w-16`}
            placeholder="6.20"
          />
          {quotedSupplierNames.length > 0 ? (
            <select
              value={quotedForm.supplierShortName}
              onChange={(e) => setQuotedForm((p) => ({ ...p, supplierShortName: e.target.value }))}
              className={`${INPUT_CLS} px-1.5`}
            >
              {quotedSupplierNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : (
            <input
              value={quotedForm.supplierShortName}
              onChange={(e) => setQuotedForm((p) => ({ ...p, supplierShortName: e.target.value }))}
              onKeyDown={onKeyQuoted}
              className={`${INPUT_CLS} w-20`}
              placeholder="供应商"
            />
          )}
          <input
            value={quotedForm.version}
            onChange={(e) => setQuotedForm((p) => ({ ...p, version: e.target.value }))}
            onKeyDown={onKeyQuoted}
            className={`${INPUT_CLS} w-10`}
            placeholder="版本"
          />
          <button
            type="button"
            onClick={submitQuoted}
            className="inline-flex h-7 items-center gap-1 rounded bg-blue-600 px-2 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Save className="h-3 w-3" />确认
          </button>
          <button
            type="button"
            onClick={() => setActiveForm(null)}
            className="inline-flex h-7 items-center rounded px-1.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── 已补充信息 checkbox 行（仅当有供应商标记"需补资料"时显示） ── */}
      {hasNeedInfoSupplier && (
        <div className="flex items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
          <input
            type="checkbox"
            id={`supplemented-${record.id}`}
            checked={!!supplementedStatus}
            onChange={(e) => toggleSupplemented(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-yellow-500 dark:border-gray-600"
          />
          <label
            htmlFor={`supplemented-${record.id}`}
            className="cursor-pointer select-none text-xs text-gray-500 dark:text-gray-400"
          >
            已补充信息
          </label>
          {supplementedStatus && (
            <input
              value={stripDateBrackets(supplementedStatus.quoteDate)}
              onChange={(e) => updateSupplementedDate(e.target.value)}
              onBlur={(e) => updateSupplementedDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  updateSupplementedDate((e.target as HTMLInputElement).value);
                }
              }}
              className={`${INPUT_CLS} w-16`}
              placeholder="6.20"
            />
          )}
        </div>
      )}

      {/* ── 无法报价 / 询价已关闭 checkbox 行 ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-2 dark:border-gray-800">
        {/* 无法报价 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`unavail-${record.id}`}
            checked={!!unavailableStatus}
            onChange={(e) => toggleUnavailable(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-gray-500 dark:border-gray-600"
          />
          <label
            htmlFor={`unavail-${record.id}`}
            className="cursor-pointer select-none text-xs text-gray-500 dark:text-gray-400"
          >
            已回复客户无法报价
          </label>
          {unavailableStatus && (
            <input
              value={stripDateBrackets(unavailableStatus.quoteDate)}
              onChange={(e) => updateUnavailableDate(e.target.value)}
              onBlur={(e) => updateUnavailableDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); updateUnavailableDate((e.target as HTMLInputElement).value); }
              }}
              className={`${INPUT_CLS} w-16`}
              placeholder="6.20"
            />
          )}
        </div>

        {/* 询价已关闭 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`closed-${record.id}`}
            checked={!!closedStatus}
            onChange={(e) => toggleClosed(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-gray-500 dark:border-gray-600"
          />
          <label
            htmlFor={`closed-${record.id}`}
            className="cursor-pointer select-none text-xs text-gray-500 dark:text-gray-400"
          >
            询价已关闭
          </label>
          {closedStatus && (
            <input
              value={stripDateBrackets(closedStatus.quoteDate)}
              onChange={(e) => updateClosedDate(e.target.value)}
              onBlur={(e) => updateClosedDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); updateClosedDate((e.target as HTMLInputElement).value); }
              }}
              className={`${INPUT_CLS} w-16`}
              placeholder="6.20"
            />
          )}
        </div>
      </div>
    </div>
  );
}
