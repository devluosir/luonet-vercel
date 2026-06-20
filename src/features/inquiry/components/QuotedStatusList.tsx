'use client';

import { Fragment, FormEvent, useState } from 'react';
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import type { CustomerQuoteStatus } from '../types';
import {
  formatShortDate,
  getNextQuoteVersion,
  normalizeShortDateInput,
  stripDateBrackets,
  type InquiryColorClass,
} from '../utils/inquiryUtils';

interface QuotedStatusListProps {
  statuses: CustomerQuoteStatus[];
  supplierNames: string[];
  colorClass: InquiryColorClass;
  onAdd: (status: Omit<CustomerQuoteStatus, 'id'>) => void;
  onUpdate: (statusId: string, patch: Partial<CustomerQuoteStatus>) => void;
  onRemove: (statusId: string) => void;
}

interface QuotedStatusFormState {
  quoteDate: string;
  supplierShortName: string;
  version: string;
}

export function QuotedStatusList({
  statuses,
  supplierNames,
  colorClass,
  onAdd,
  onUpdate,
  onRemove,
}: QuotedStatusListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuotedStatusFormState>({
    quoteDate: formatShortDate(new Date()),
    supplierShortName: supplierNames[0] ?? '',
    version: getNextQuoteVersion(statuses),
  });

  const openAddForm = () => {
    setEditingId(null);
    setForm({
      quoteDate: formatShortDate(new Date()),
      supplierShortName: supplierNames[0] ?? '',
      version: getNextQuoteVersion(statuses),
    });
    setIsFormOpen(true);
  };

  const openEditForm = (status: CustomerQuoteStatus) => {
    setEditingId(status.id);
    setForm({
      quoteDate: status.quoteDate,
      supplierShortName: status.supplierShortName,
      version: status.version,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      quoteDate: normalizeShortDateInput(form.quoteDate),
      supplierShortName: form.supplierShortName.trim(),
      version: form.version.trim(),
    };
    if (!payload.quoteDate || !payload.supplierShortName || !payload.version) return;
    if (editingId) {
      onUpdate(editingId, payload);
    } else {
      onAdd(payload);
    }
    closeForm();
  };

  return (
    <Fragment>
      {/* 已报价标签 + 按钮：直接参与父级 flex 布局 */}
      {statuses.map((status) => (
        <span
          key={status.id}
          className="inline-flex items-center rounded-full bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:ring-blue-900"
        >
          <button
            type="button"
            onClick={() => openEditForm(status)}
            className={`max-w-[190px] truncate px-2.5 py-1 text-xs font-medium ${colorClass}`}
            title="编辑已报价状态"
          >
            {stripDateBrackets(status.quoteDate)}{status.supplierShortName} {status.version}
          </button>
          <button
            type="button"
            onClick={() => {
                if (window.confirm(`确定删除已报价记录「${stripDateBrackets(status.quoteDate)}${status.supplierShortName} ${status.version}」吗？`)) {
                  onRemove(status.id);
                }
              }}
            className="border-l border-blue-100 px-1.5 py-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500 dark:border-blue-900"
            aria-label={`删除已报价状态 ${status.supplierShortName}`}
            title="删除已报价状态"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={openAddForm}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
      >
        <Plus className="h-3 w-3" />
        已报价
      </button>

      {/* 编辑表单：另起一行展开 */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-1 flex w-full flex-wrap items-end gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2 dark:border-blue-900 dark:bg-blue-950/20"
        >
          <label className="space-y-1">
            <span className="block text-[11px] text-gray-500 dark:text-gray-400">日期</span>
            <input
              value={form.quoteDate}
              onChange={(event) => setForm((prev) => ({ ...prev, quoteDate: event.target.value }))}
              className="h-8 w-20 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              placeholder="[6.20]"
              required
            />
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] text-gray-500 dark:text-gray-400">供应商</span>
            {supplierNames.length > 0 ? (
              <select
                value={form.supplierShortName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, supplierShortName: event.target.value }))
                }
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                required
              >
                {supplierNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            ) : (
              <input
                value={form.supplierShortName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, supplierShortName: event.target.value }))
                }
                className="h-8 w-24 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                placeholder="供应商"
                required
              />
            )}
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] text-gray-500 dark:text-gray-400">版本</span>
            <input
              value={form.version}
              onChange={(event) => setForm((prev) => ({ ...prev, version: event.target.value }))}
              className="h-8 w-14 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              placeholder="a"
              required
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            {editingId ? <Edit2 className="h-3 w-3" /> : <Save className="h-3 w-3" />}
            保存
          </button>
          <button
            type="button"
            onClick={closeForm}
            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-gray-500 hover:bg-white dark:text-gray-400 dark:hover:bg-gray-900"
          >
            <X className="h-3 w-3" />
          </button>
        </form>
      )}
    </Fragment>
  );
}
