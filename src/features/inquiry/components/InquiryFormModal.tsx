'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { InquiryBasicInput, InquiryRecord } from '../types';
import {
  dateInputToDate,
  formatShortDate,
  generateNextInquiryNo,
  getDateInputValueFromInquiryNo,
  getTodayDateInputValue,
} from '../utils/inquiryUtils';

interface InquiryFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  record: InquiryRecord | null;
  existingRecords: InquiryRecord[];
  onClose: () => void;
  onSubmit: (values: InquiryBasicInput) => void;
}

export function InquiryFormModal({
  isOpen,
  mode,
  record,
  existingRecords,
  onClose,
  onSubmit,
}: InquiryFormModalProps) {
  const [dateInput, setDateInput] = useState(getTodayDateInputValue());
  const [inquiryNo, setInquiryNo] = useState('');
  const [inquirer, setInquirer] = useState('');
  const [customerNo, setCustomerNo] = useState('');
  const [description, setDescription] = useState('');
  const [isInquiryNoManual, setIsInquiryNoManual] = useState(false);

  const existingNos = useMemo(
    () =>
      existingRecords
        .filter((item) => item.id !== record?.id)
        .map((item) => item.inquiryNo),
    [existingRecords, record?.id]
  );

  useEffect(() => {
    if (!isOpen) return;

    const nextDateInput = record
      ? getDateInputValueFromInquiryNo(record.inquiryNo)
      : getTodayDateInputValue();
    const nextInquiryNo = record
      ? record.inquiryNo
      : generateNextInquiryNo(dateInputToDate(nextDateInput), existingNos);

    setDateInput(nextDateInput);
    setInquiryNo(nextInquiryNo);
    setInquirer(record?.inquirer ?? '');
    setCustomerNo(record?.customerNo ?? '');
    setDescription(record?.description ?? '');
    setIsInquiryNoManual(mode === 'edit');
  }, [existingNos, isOpen, mode, record]);

  useEffect(() => {
    if (!isOpen || isInquiryNoManual) return;
    setInquiryNo(generateNextInquiryNo(dateInputToDate(dateInput), existingNos));
  }, [dateInput, existingNos, isInquiryNoManual, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const inquiryDate = formatShortDate(dateInputToDate(dateInput));
    const payload: InquiryBasicInput = {
      inquiryDate,
      inquiryNo: inquiryNo.trim(),
      inquirer: inquirer.trim(),
      customerNo: customerNo.trim(),
      description: description.trim(),
    };

    if (!payload.inquiryNo || !payload.inquirer || !payload.customerNo) {
      return;
    }

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-[#2C2C2E]">
        {/* 标题栏 */}
        <div className="flex items-start justify-between px-6 pb-4 pt-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {mode === 'edit' ? '编辑询价' : '新增询价'}
            </h2>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              编号可自动生成，修改日期会同步更新编号
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="关闭弹窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-700" />

        <form onSubmit={handleSubmit} className="px-6 py-5">
          {/* 第一行：日期 + 询价编号（紧凑两列） */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                日期
              </label>
              <input
                type="date"
                value={dateInput}
                onChange={(event) => setDateInput(event.target.value)}
                className="h-9 w-full rounded-lg border border-gray-300 bg-gray-50 px-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:bg-gray-900"
                required
              />
              <span className="block text-[11px] text-gray-400">
                → {formatShortDate(dateInputToDate(dateInput))}
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                询价编号
              </label>
              <input
                value={inquiryNo}
                onChange={(event) => {
                  setInquiryNo(event.target.value);
                  setIsInquiryNoManual(true);
                }}
                className="h-9 w-full rounded-lg border border-gray-300 bg-gray-50 px-2.5 text-sm font-mono font-medium text-gray-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:bg-gray-900"
                placeholder="C260620F"
                required
              />
            </div>
          </div>

          {/* 第二行：询价人 + 客户编号 */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                询价人
              </label>
              <input
                value={inquirer}
                onChange={(event) => setInquirer(event.target.value)}
                className="h-9 w-full rounded-lg border border-gray-300 bg-gray-50 px-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:bg-gray-900"
                placeholder="LC-Roger"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                客户编号
              </label>
              <input
                value={customerNo}
                onChange={(event) => setCustomerNo(event.target.value)}
                className="h-9 w-full rounded-lg border border-gray-300 bg-gray-50 px-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:bg-gray-900"
                placeholder="A001"
                required
              />
            </div>
          </div>

          {/* 内容简述 */}
          <div className="mb-5 space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              内容简述
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:bg-gray-900"
              placeholder="产品名称、规格、数量或客户需求摘要（选填）"
            />
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
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800"
            >
              {mode === 'edit' ? '保存修改' : '新增询价'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
