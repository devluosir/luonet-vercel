'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import type { CustomerQuoteStatus, InquiryRecord, PurchaseSupplierQuoteStatus, SupplierQuoteStatus, SupplierStatus } from '../types';
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
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { getCachedCustomers } from '@/features/customer/services/customerService';
import { supplierService } from '@/features/customer/services/supplierService';

function toSupplierOptions(list: { shortName?: string; name: string }[]): string[] {
  return Array.from(
    new Set(list.map((s) => (s.shortName || s.name).trim()).filter(Boolean))
  ).sort();
}

interface InquiryQuoteStatusProps {
  record: InquiryRecord;
  onSuppliersChange: (suppliers: SupplierQuoteStatus[]) => void;
  onQuotedChange: (quoted: CustomerQuoteStatus[]) => void;
  /**
   * 供应商简称候选列表（配合 <datalist>）。不传时默认从客户管理的供应商库拉取——询报价登记场景；
   * 采购部登记场景范围不同，应传入采购部自己已用过的供应商简称列表（见 PurchaseRegistrationPage），
   * 传入后不再去拉客户管理供应商库，两边候选来源要分开，不互相混用。
   */
  supplierOptions?: Array<string | { id: string; name: string }>;
  /**
   * "无法报价" checkbox 文案。默认"已回复客户无法报价"（询报价登记场景行为不变）；
   * 采购部登记场景传入"我司无法报价"，仅影响文案，不影响 type: 'unavailable' 的存储结构。
   */
  unavailableLabel?: string;
  /**
   * 已报价区域尾部追加的只读提示内容（例如采购部登记的"其他 n 家已报价"）。默认不显示任何内容。
   */
  quotedTrailingContent?: React.ReactNode;
  /**
   * 是否显示可编辑的"询价已关闭" checkbox + 日期。默认 true（询报价登记场景行为不变）。
   * 采购部登记场景传 false：关闭状态完全由销售侧 record.quotedStatuses 决定，采购部只能只读展示，
   * 不提供编辑入口——由调用方（PurchaseInquiryEditModal）在组件外单独渲染只读提示。
   */
  showClosedControl?: boolean;
  /**
   * 是否有一个不体现在本组件 supplierStatuses 里的外部"需补资料"信号，需要一并触发"已补充信息"
   * checkbox 显示。默认 false（询报价登记场景行为不变，"需补资料"只看自己的 supplierStatuses）。
   * 采购部登记场景传入"销售侧飞罗是否为 need_info"——飞罗需补资料是销售侧的真实状态，不体现在
   * 采购部自己的 purchaseSupplierStatuses 里，但采购部同样需要能勾选"已补充信息"确认已处理。
   */
  extraNeedInfo?: boolean;
  /** 采购部登记场景显示没有主档 ID 的历史/自由文本状态。 */
  showPurchaseSupplierLinkStatus?: boolean;
}

type ActiveForm =
  | { kind: 'supplier-add' }
  | { kind: 'supplier-edit'; id: string }
  | { kind: 'quoted-add' }
  | { kind: 'quoted-edit'; id: string }
  | null;

interface SupplierFormState {
  purchaseSupplierId?: string;
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

export function InquiryQuoteStatus({
  record,
  onSuppliersChange,
  onQuotedChange,
  supplierOptions: supplierOptionsProp,
  unavailableLabel = '已回复客户无法报价',
  quotedTrailingContent,
  showClosedControl = true,
  extraNeedInfo = false,
  showPurchaseSupplierLinkStatus = false,
}: InquiryQuoteStatusProps) {
  const confirm = useConfirm();
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

  // 供应商简称候选列表（配合 <datalist>）：外部传入 supplierOptionsProp 时（采购部登记场景，
  // 用的是采购部自己已用过的供应商简称，与客户管理供应商库无关）直接用它，不再拉取客户库；
  // 未传入时（询报价登记场景）从客户管理 > 供应商库拉取。两个来源不互相混用。
  const [customerSupplierOptions, setCustomerSupplierOptions] = useState<string[]>(() =>
    supplierOptionsProp ? [] : toSupplierOptions(getCachedCustomers('supplier'))
  );

  useEffect(() => {
    if (supplierOptionsProp) return;
    let cancelled = false;
    supplierService
      .getAllSuppliers()
      .then((list) => {
        if (!cancelled) setCustomerSupplierOptions(toSupplierOptions(list));
      })
      .catch(() => {
        // 供应商库加载失败时保留缓存/已有候选，不影响自由输入
      });
    return () => {
      cancelled = true;
    };
  }, [supplierOptionsProp]);

  const supplierOptions = supplierOptionsProp ?? customerSupplierOptions;
  const normalizedSupplierOptions = supplierOptions.map((option) =>
    typeof option === 'string' ? { id: undefined, name: option } : option
  );

  // 防御性兜底：受限视图/异常数据可能缺失 quotedStatuses/supplierStatuses 字段
  const quotedStatuses = record.quotedStatuses ?? [];
  const supplierStatuses = record.supplierStatuses ?? [];

  // ── 派生数据 ──────────────────────────────────────────
  const unavailableStatus = quotedStatuses.find((s) => s.type === 'unavailable');
  const closedStatus = quotedStatuses.find((s) => s.type === 'closed');
  const supplementedStatus = quotedStatuses.find((s) => s.type === 'supplemented');
  const regularStatuses = quotedStatuses.filter(
    (s) => s.type !== 'unavailable' && s.type !== 'supplemented' && s.type !== 'closed'
  );
  const hasNeedInfoSupplier = supplierStatuses.some((s) => s.status === 'need_info') || extraNeedInfo;
  const quotedSupplierNames = supplierStatuses
    .filter((s) => s.status === 'quoted' && !!s.quoteDate)
    .map((s) => s.supplierShortName);
  const mainColorClass = getRecordColorState(record);
  const isSupplierForm = activeForm?.kind === 'supplier-add' || activeForm?.kind === 'supplier-edit';
  const isQuotedForm = activeForm?.kind === 'quoted-add' || activeForm?.kind === 'quoted-edit';

  // ── 供应商 CRUD ──────────────────────────────────────
  const openAddSupplier = () => {
    setSupplierForm({ purchaseSupplierId: undefined, supplierShortName: '', quoteDate: '', status: 'pending' });
    setActiveForm({ kind: 'supplier-add' });
  };

  const openEditSupplier = (supplierId: string) => {
    const s = supplierStatuses.find((item) => item.id === supplierId);
    if (!s) return;
    setSupplierForm({
      purchaseSupplierId: (s as PurchaseSupplierQuoteStatus).purchaseSupplierId,
      supplierShortName: s.supplierShortName,
      quoteDate: stripDateBrackets(s.quoteDate ?? ''),
      status: s.status ?? 'pending',
    });
    setActiveForm({ kind: 'supplier-edit', id: supplierId });
  };

  // 注意：不再是 FormEvent handler，改为普通函数，由按钮 onClick / Enter 键触发
  const submitSupplier = () => {
    const quoteDate = normalizeShortDateInput(supplierForm.quoteDate);
    const payload: Omit<PurchaseSupplierQuoteStatus, 'id'> = {
      purchaseSupplierId: supplierForm.purchaseSupplierId,
      supplierShortName: supplierForm.supplierShortName.trim(),
      quoteDate: quoteDate || undefined,
      status: supplierForm.status,
    };
    if (!payload.supplierShortName) return;
    if (activeForm?.kind === 'supplier-edit') {
      onSuppliersChange(
        supplierStatuses.map((s) =>
          s.id === activeForm.id ? { ...s, ...payload } : s
        )
      );
    } else {
      onSuppliersChange([...supplierStatuses, { ...payload, id: createId() }]);
    }
    setActiveForm(null);
  };

  const handleRemoveSupplier = async (supplierId: string) => {
    const s = supplierStatuses.find((item) => item.id === supplierId);
    const confirmed = await confirm({
      title: '删除供应商状态',
      description: `确定删除供应商「${s?.supplierShortName ?? '该供应商'}」吗？`,
      confirmLabel: '删除',
      variant: 'danger',
    });
    if (!confirmed) return;

    onSuppliersChange(supplierStatuses.filter((item) => item.id !== supplierId));
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
        quotedStatuses.map((s) =>
          s.id === activeForm.id ? { ...s, ...payload } : s
        )
      );
    } else {
      onQuotedChange([...quotedStatuses, { ...payload, id: createId() }]);
    }
    setActiveForm(null);
  };

  const handleRemoveQuoted = async (qsId: string) => {
    const qs = quotedStatuses.find((s) => s.id === qsId);
    const label = qs
      ? `${stripDateBrackets(qs.quoteDate)} ${qs.supplierShortName} ${qs.version}`
      : '该记录';
    const confirmed = await confirm({
      title: '删除已报价状态',
      description: `确定删除「${label}」吗？`,
      confirmLabel: '删除',
      variant: 'danger',
    });
    if (!confirmed) return;

    onQuotedChange(quotedStatuses.filter((s) => s.id !== qsId));
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
      onQuotedChange([...quotedStatuses, newStatus]);
    } else {
      onQuotedChange(quotedStatuses.filter((s) => s.type !== 'supplemented'));
    }
  };

  const updateSupplementedDate = (raw: string) => {
    const normalized = normalizeShortDateInput(raw);
    if (!normalized) return;
    onQuotedChange(
      quotedStatuses.map((s) =>
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
      onQuotedChange([...quotedStatuses, newStatus]);
    } else {
      onQuotedChange(quotedStatuses.filter((s) => s.type !== 'closed'));
    }
  };

  const updateClosedDate = (raw: string) => {
    const normalized = normalizeShortDateInput(raw);
    if (!normalized) return;
    onQuotedChange(
      quotedStatuses.map((s) =>
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
      onQuotedChange([...quotedStatuses, newStatus]);
    } else {
      onQuotedChange(quotedStatuses.filter((s) => s.type !== 'unavailable'));
    }
  };

  const updateUnavailableDate = (raw: string) => {
    const normalized = normalizeShortDateInput(raw);
    if (!normalized) return;
    onQuotedChange(
      quotedStatuses.map((s) =>
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
          {supplierStatuses.map((supplier) => (
            <SupplierStatusTag
              key={supplier.id}
              supplier={supplier}
              onEdit={openEditSupplier}
              onDelete={handleRemoveSupplier}
              unlinked={showPurchaseSupplierLinkStatus && !(supplier as PurchaseSupplierQuoteStatus).purchaseSupplierId}
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
            list={`supplier-options-${record.id}`}
            value={supplierForm.supplierShortName}
            onChange={(e) => {
              const supplierShortName = e.target.value;
              const match = normalizedSupplierOptions.find((option) => option.name === supplierShortName);
              setSupplierForm((p) => ({ ...p, supplierShortName, purchaseSupplierId: match?.id }));
            }}
            onKeyDown={onKeySupplier}
            className={`${INPUT_CLS} w-20`}
            placeholder="供应商"
            autoComplete="off"
          />
          <datalist id={`supplier-options-${record.id}`}>
            {normalizedSupplierOptions.map((option) => (
              <option key={option.id || option.name} value={option.name} />
            ))}
          </datalist>
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
          <Button
            type="button"
            onClick={submitSupplier}
            size="xs"
            className="h-7 gap-1 rounded px-2"
          >
            <Save className="h-3 w-3" />确认
          </Button>
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
          {quotedTrailingContent}
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
          <Button
            type="button"
            onClick={submitQuoted}
            size="xs"
            className="h-7 gap-1 rounded px-2"
          >
            <Save className="h-3 w-3" />确认
          </Button>
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
            {unavailableLabel}
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

        {/* 询价已关闭：仅询报价登记场景可编辑，采购部登记场景由调用方在组件外只读展示 */}
        {showClosedControl && (
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
        )}
      </div>
    </div>
  );
}
