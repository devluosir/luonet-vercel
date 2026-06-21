'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import type { InquiryRecord } from '../types';
import { InquiryRow } from './InquiryRow';

interface InquiryTableProps {
  records: InquiryRecord[];
  sortDir: 'asc' | 'desc';
  onSortToggle: () => void;
  onEditRecord: (record: InquiryRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  emptyMessage?: string;
  emptySubMessage?: string;
}

export function InquiryTable({
  records,
  sortDir,
  onSortToggle,
  onEditRecord,
  onDeleteRecord,
  emptyMessage = '暂无询报价记录',
  emptySubMessage = '点击"新增询价"后，会在这里登记供应商询价和客户报价状态。',
}: InquiryTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-[#2C2C2E]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{emptyMessage}</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{emptySubMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-gray-100 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="w-[24%] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 md:w-[16%] lg:w-[10%]">
                <button
                  type="button"
                  onClick={onSortToggle}
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
              <th className="hidden w-[16%] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 md:table-cell lg:w-[12%]">
                询价人
              </th>
              <th className="hidden px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 lg:table-cell lg:w-[24%] xl:w-[26%]">
                客户编号
              </th>
              <th className="w-[34%] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 md:w-[32%] lg:w-[22%]">
                内容简述
              </th>
              <th className="w-[34%] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 md:w-[30%] lg:w-[28%] xl:w-[26%]">
                询报价状态
              </th>
              <th className="w-[8%] px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 md:w-[6%] lg:w-[4%]">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {records.map((record) => (
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
