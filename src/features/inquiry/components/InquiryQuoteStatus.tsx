'use client';

import { FormEvent, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import type { InquiryRecord, SupplierQuoteStatus, SupplierStatus } from '../types';
import { useInquiryActions } from '../hooks/useInquiryActions';
import {
  formatShortDate,
  getRecordColorState,
  normalizeShortDateInput,
} from '../utils/inquiryUtils';
import { SupplierStatusTag } from './SupplierStatusTag';
import { QuotedStatusList } from './QuotedStatusList';

interface InquiryQuoteStatusProps {
  record: InquiryRecord;
}

interface SupplierFormState {
  supplierShortName: string;
  quoteDate: string;
  status: SupplierStatus;
}

const STATUS_OPTIONS: Array<{ value: SupplierStatus; label: string; hint: string }> = [
  { value: 'pending',     label: '未报价',   hint: '粉红' },
  { value: 'quoted',      label: '已报价',   hint: '蓝色' },
  { value: 'need_info',   label: '需补资料', hint: '黄色' },
  { value: 'unavailable', label: '无法报价', hint: '灰色' },
];

export function InquiryQuoteStatus({ record }: InquiryQuoteStatusProps) {
  const {
    createSupplier,
    updateSupplier,
    removeSupplier,
    createQuotedStatus,
    updateQuotedStatus,
    removeQuotedStatus,
  } = useInquiryActions();
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>({
    supplierShortName: '',
    quoteDate: '',
    status: 'pending',
  });

  const openAddSupplier = () => {
    setEditingSupplierId(null);
    setSupplierForm({
      supplierShortName: '',
      quoteDate: '',
      status: 'pending',
    });
    setIsSupplierFormOpen(true);
  };

  const openEditSupplier = (supplierId: string) => {
    const supplier = record.supplierStatuses.find((item) => item.id === supplierId);
    if (!supplier) return;

    setEditingSupplierId(supplier.id);
    setSupplierForm({
      supplierShortName: supplier.supplierShortName,
      quoteDate: supplier.quoteDate ?? '',
      status: supplier.status ?? 'pending',
    });
    setIsSupplierFormOpen(true);
  };

  const closeSupplierForm = () => {
    setEditingSupplierId(null);
    setIsSupplierFormOpen(false);
  };

  const handleSupplierSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quoteDate = normalizeShortDateInput(supplierForm.quoteDate);
    const payload: Omit<SupplierQuoteStatus, 'id'> = {
      supplierShortName: supplierForm.supplierShortName.trim(),
      quoteDate: quoteDate || undefined,
      // 状态由用户显式选择，不再根据是否有日期自动覆盖
      status: supplierForm.status,
    };

    if (!payload.supplierShortName) return;

    if (editingSupplierId) {
      updateSupplier(record.id, editingSupplierId, payload);
    } else {
      createSupplier(record.id, payload);
    }
    closeSupplierForm();
  };

  const handleRemoveSupplier = (supplierId: string) => {
    const supplier = record.supplierStatuses.find((s) => s.id === supplierId);
    const label = supplier?.supplierShortName ?? '该供应商';
    if (window.confirm(`确定删除供应商「${label}」吗？`)) {
      removeSupplier(record.id, supplierId);
    }
  };

  const mainColorClass = getRecordColorState(record);

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {/* 供应商 + 已报价 同一行 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* + 供应商 按钮置前，替换原来的"供应商"文字标签 */}
          <button
            type="button"
            onClick={openAddSupplier}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Plus className="h-3 w-3" />
            供应商
          </button>

          {record.supplierStatuses.map((supplier) => (
            <SupplierStatusTag
              key={supplier.id}
              supplier={supplier}
              onEdit={openEditSupplier}
              onDelete={handleRemoveSupplier}
            />
          ))}

          {/* 分隔符 */}
          <span className="select-none text-xs text-gray-400">/</span>

          <QuotedStatusList
            statuses={record.quotedStatuses}
            supplierNames={record.supplierStatuses
          .filter((s) => s.status === 'quoted' && !!s.quoteDate)
          .map((s) => s.supplierShortName)}
            colorClass={mainColorClass}
            onAdd={(status) => createQuotedStatus(record.id, status)}
            onUpdate={(statusId, patch) => updateQuotedStatus(record.id, statusId, patch)}
            onRemove={(statusId) => removeQuotedStatus(record.id, statusId)}
          />
        </div>

        {isSupplierFormOpen && (
          <form
            onSubmit={handleSupplierSubmit}
            className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/50"
          >
            <label className="space-y-1">
              <span className="block text-[11px] text-gray-500 dark:text-gray-400">供应商</span>
              <input
                value={supplierForm.supplierShortName}
                onChange={(event) =>
                  setSupplierForm((prev) => ({
                    ...prev,
                    supplierShortName: event.target.value,
                  }))
                }
                className="h-8 w-24 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                placeholder="ABC"
                required
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] text-gray-500 dark:text-gray-400">日期</span>
              <input
                value={supplierForm.quoteDate}
                disabled={supplierForm.status === 'pending'}
                onChange={(event) => {
                  const val = event.target.value;
                  setSupplierForm((prev) => ({
                    ...prev,
                    quoteDate: val,
                    // 填入日期且当前仍是"未报价"→ 自动切为"已报价"
                    status: val && prev.status === 'pending' ? 'quoted' : prev.status,
                  }));
                }}
                className="h-8 w-20 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800"
                placeholder="[6.20]"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] text-gray-500 dark:text-gray-400">状态</span>
              <select
                value={supplierForm.status}
                onChange={(event) => {
                  const next = event.target.value as SupplierStatus;
                  const today = formatShortDate(new Date());
                  setSupplierForm((prev) => ({
                    ...prev,
                    status: next,
                    quoteDate:
                      next === 'pending'
                        ? ''                              // 未报价 → 清空日期
                        : prev.quoteDate || today,        // 其余三种 → 无日期时默认今天
                  }));
                }}
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}（{option.hint}）
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Save className="h-3 w-3" />
              保存
            </button>
            <button
              type="button"
              onClick={closeSupplierForm}
              className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-gray-500 hover:bg-white dark:text-gray-400 dark:hover:bg-gray-900"
            >
              <X className="h-3 w-3" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
