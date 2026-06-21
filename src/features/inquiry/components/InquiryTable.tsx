'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { InquiryRecord } from '../types';
import { InquiryRow } from './InquiryRow';

interface InquiryTableProps {
  records: InquiryRecord[];
  onEditRecord: (record: InquiryRecord) => void;
  onDeleteRecord: (recordId: string) => void;
}

export function InquiryTable({ records, onEditRecord, onDeleteRecord }: InquiryTableProps) {
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(
    () =>
      [...records].sort((a, b) =>
        sortDir === 'desc'
          ? b.inquiryNo.localeCompare(a.inquiryNo)
          : a.inquiryNo.localeCompare(b.inquiryNo)
      ),
    [records, sortDir]
  );

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-[#2C2C2E]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">暂无询报价记录</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          点击&ldquo;新增询价&rdquo;后，会在这里登记供应商询价和客户报价状态。
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                日期
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <button
                  type="button"
                  onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                  className="inline-flex items-center gap-1 rounded hover:text-gray-700 dark:hover:text-gray-200"
                  title={sortDir === 'desc' ? '当前：最新在前，点击切换' : '当前：最早在前，点击切换'}
                >
                  询价编号
                  {sortDir === 'desc' ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUp className="h-3 w-3" />
                  )}
                </button>
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                询价人
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                客户编号
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                内容简述
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                询报价状态
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sorted.map((record) => (
              <InquiryRow
                key={record.id}
                record={record}
                onEdit={onEditRecord}
                onDelete={onDeleteRecord}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
