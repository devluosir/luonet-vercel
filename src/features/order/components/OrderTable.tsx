'use client';

import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { OrderRow } from './OrderRow';

interface OrderTableProps {
  records: InquiryRecord[];
  isAdmin: boolean;
  sortDir: 'asc' | 'desc' | null;
  onSortToggle: () => void;
  onUpdate: (id: string, patch: Partial<InquiryRecord>) => void;
}

export function OrderTable({ records, isAdmin, sortDir, onSortToggle, onUpdate }: OrderTableProps) {
  const SortIcon = sortDir === 'asc' ? ChevronUp : sortDir === 'desc' ? ChevronDown : ChevronsUpDown;

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
        <p className="text-sm text-gray-400 dark:text-gray-500">暂无订单记录</p>
        <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
          在询报价登记中填写订单编号后，记录会自动显示在这里
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <table className="min-w-full table-fixed">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            {/* 订单编号 — 可点击排序 */}
            <th className="whitespace-nowrap px-3 py-2 text-left">
              <button
                type="button"
                onClick={onSortToggle}
                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                订单编号
                <SortIcon className="h-3 w-3" />
              </button>
            </th>
            <th className="w-14 px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500">
              交货
            </th>
            <th className="hidden px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 md:table-cell">
              客户
            </th>
            <th className="px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500">
              内容简述
            </th>
            <th className="hidden w-14 px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 lg:table-cell">
              确认日
            </th>
            <th className="hidden min-w-[80px] px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 lg:table-cell">
              客户订单号
            </th>
            <th className="min-w-[110px] px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500">
              执行情况
            </th>
            {isAdmin && (
              <th className="hidden w-24 px-2 py-2 text-right text-[11px] font-semibold text-gray-400 dark:text-gray-500 xl:table-cell">
                金额
              </th>
            )}
            {isAdmin && (
              <th className="hidden w-16 px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 xl:table-cell">
                回款
              </th>
            )}
            {isAdmin && (
              <th className="hidden w-24 px-2 py-2 text-right text-[11px] font-semibold text-gray-400 dark:text-gray-500 xl:table-cell">
                到账金额
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <OrderRow
              key={record.id}
              record={record}
              isAdmin={isAdmin}
              onUpdate={(patch) => onUpdate(record.id, patch)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
