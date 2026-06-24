'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { InquiryRecord } from '@/features/inquiry/types';
import {
  type OrderTableBreakpoint,
  getVisibleColWidths,
  showAdminCols,
  showCustomerCol,
  showLgCols,
} from '../utils/orderTableLayout';
import { OrderRow } from './OrderRow';

export type SortField = 'orderNo' | 'deliveryDate';

export type { OrderTableBreakpoint };

function useBreakpoint(): OrderTableBreakpoint {
  const [bp, setBp] = useState<OrderTableBreakpoint>('lg');

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setBp(w >= 1280 ? 'xl' : w >= 1024 ? 'lg' : w >= 768 ? 'md' : 'sm');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return bp;
}

interface OrderTableProps {
  records: InquiryRecord[];
  isAdmin: boolean;
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onSortToggle: (field: SortField) => void;
  onUpdate: (id: string, patch: Partial<InquiryRecord>) => void;
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: 'asc' | 'desc' }) {
  if (field !== sortField) return <ChevronsUpDown className="h-3 w-3 text-gray-300 dark:text-gray-600" />;
  return sortDir === 'asc'
    ? <ChevronUp className="h-3 w-3" />
    : <ChevronDown className="h-3 w-3" />;
}

export function OrderTable({ records, isAdmin, sortField, sortDir, onSortToggle, onUpdate }: OrderTableProps) {
  const bp = useBreakpoint();
  const colWidths = getVisibleColWidths(bp, isAdmin);
  const customerCol = showCustomerCol(bp);
  const lgCols = showLgCols(bp);
  const adminCols = showAdminCols(bp, isAdmin);

  const thSort = (field: SortField, label: string, shortLabel?: string) => (
    <button type="button" onClick={() => onSortToggle(field)}
      className="inline-flex max-w-full items-center gap-0.5 whitespace-nowrap text-[11px] font-semibold text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
    >
      <span className="truncate">{bp === 'sm' && shortLabel ? shortLabel : label}</span>
      <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
    </button>
  );

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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <table className="w-full table-fixed">
        <colgroup>
          {colWidths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="overflow-hidden px-2 py-2 text-left sm:px-3">
              {thSort('orderNo', '订单编号', '编号')}
            </th>
            <th className="overflow-hidden px-1.5 py-2 text-left sm:px-2">
              {thSort('deliveryDate', '交货')}
            </th>
            {customerCol && (
              <th className="overflow-hidden px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                <span className="whitespace-nowrap">客户</span>
              </th>
            )}
            <th className="overflow-hidden px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500">
              <span className="whitespace-nowrap">内容简述</span>
            </th>
            {lgCols && (
              <>
                <th className="overflow-hidden px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                  <span className="whitespace-nowrap">确认日</span>
                </th>
                <th className="overflow-hidden px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                  <span className="whitespace-nowrap">客户订单号</span>
                </th>
              </>
            )}
            <th className="overflow-hidden px-1.5 py-2 text-left sm:px-2">
              <span className="block truncate text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                {bp === 'sm' ? '执行' : '执行情况'}
              </span>
            </th>
            {adminCols && (
              <>
                <th className="overflow-hidden px-2 py-2 text-right text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                  <span className="whitespace-nowrap">金额</span>
                </th>
                <th className="overflow-hidden px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                  <span className="whitespace-nowrap">回款</span>
                </th>
                <th className="overflow-hidden px-2 py-2 text-right text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                  <span className="whitespace-nowrap">到账金额</span>
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <OrderRow
              key={record.id}
              record={record}
              bp={bp}
              isAdmin={isAdmin}
              onUpdate={(patch) => onUpdate(record.id, patch)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
