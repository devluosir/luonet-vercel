'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { InquiryRecord } from '../types';
import { InquiryRow } from './InquiryRow';

function useBreakpoint() {
  const [bp, setBp] = useState<'sm' | 'md' | 'lg'>('lg');

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      setBp(width >= 1024 ? 'lg' : width >= 768 ? 'md' : 'sm');
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return bp;
}

interface InquiryTableProps {
  records: InquiryRecord[];
  sortDir: 'asc' | 'desc';
  onSortToggle: () => void;
  onEditRecord: (record: InquiryRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  emptyMessage?: string;
  emptySubMessage?: string;
  isAdmin?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (allIds: string[]) => void;
}

export function InquiryTable({
  records,
  sortDir,
  onSortToggle,
  onEditRecord,
  onDeleteRecord,
  emptyMessage = '暂无询报价记录',
  emptySubMessage = '点击"新增询价"后，会在这里登记供应商询价和客户报价状态。',
  isAdmin = false,
  selectedIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
}: InquiryTableProps) {
  const bp = useBreakpoint();

  const allIds = records.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id)) && !allSelected;

  // 列宽：有 checkbox 列时从询价编号列各借 3%
  const W = isAdmin
    ? {
        check:    '3%',
        no:       bp === 'lg' ? '9%'  : bp === 'md' ? '13%' : '27%',
        inquirer: bp === 'lg' ? '11%' : '12%',
        custno:   '22%',
        desc:     bp === 'lg' ? '21%' : bp === 'md' ? '21%' : '25%',
        status:   bp === 'lg' ? '30%' : bp === 'md' ? '45%' : '37%',
        del:      bp === 'lg' ? '4%'  : bp === 'md' ? '7%'  : '8%',
      }
    : {
        check:    '0%',
        no:       bp === 'lg' ? '10%' : bp === 'md' ? '15%' : '28%',
        inquirer: bp === 'lg' ? '12%' : '13%',
        custno:   '24%',
        desc:     bp === 'lg' ? '22%' : bp === 'md' ? '22%' : '26%',
        status:   bp === 'lg' ? '28%' : bp === 'md' ? '43%' : '38%',
        del:      bp === 'lg' ? '4%'  : bp === 'md' ? '7%'  : '8%',
      };

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
        <table className="w-full table-fixed divide-y divide-gray-100 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              {/* 全选 checkbox */}
              {isAdmin && (
                <th style={{ width: W.check }} className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={() => onToggleSelectAll?.(allIds)}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-blue-600 dark:border-gray-600"
                    aria-label="全选"
                    title={allSelected ? '取消全选' : '全选当前页'}
                  />
                </th>
              )}

              <th style={{ width: W.no }} className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 md:px-3">
                <button
                  type="button"
                  onClick={onSortToggle}
                  className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded hover:text-gray-700 dark:hover:text-gray-200"
                  title={sortDir === 'desc' ? '当前：最新在前，点击切换' : '当前：最早在前，点击切换'}
                >
                  <span className="truncate">询价编号</span>
                  {sortDir === 'desc' ? (
                    <ArrowDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ArrowUp className="h-3 w-3 shrink-0" />
                  )}
                </button>
              </th>
              <th style={{ width: W.inquirer }} className="hidden px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 md:table-cell">
                <span className="whitespace-nowrap">询价人</span>
              </th>
              <th style={{ width: W.custno }} className="hidden px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 lg:table-cell">
                <span className="whitespace-nowrap">客户编号</span>
              </th>
              <th style={{ width: W.desc }} className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 md:px-3">
                <span className="whitespace-nowrap">内容简述</span>
              </th>
              <th style={{ width: W.status }} className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 md:px-3">
                <span className="block whitespace-nowrap truncate">询报价状态</span>
              </th>
              <th style={{ width: W.del }} className="px-1 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 md:px-3">
                <span className="hidden md:inline">操作</span>
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
                isAdmin={isAdmin}
                selected={selectedIds.has(record.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
