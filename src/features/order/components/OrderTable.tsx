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

const headerRowClass =
  'border-b border-gray-200/80 bg-gradient-to-b from-gray-50 to-gray-100/80 ' +
  'shadow-[inset_0_-1px_0_rgba(15,23,42,0.04)] dark:border-gray-700/80 ' +
  'dark:from-gray-900/90 dark:to-gray-800/80';

const headerCellClass =
  'overflow-hidden border-r border-gray-200/70 px-2 py-2.5 text-left align-middle text-[11px] ' +
  'font-semibold text-gray-600 last:border-r-0 dark:border-gray-700/70 dark:text-gray-300';

const headerCellRightClass =
  'overflow-hidden border-r border-gray-200/70 px-2 py-2.5 text-right align-middle text-[11px] ' +
  'font-semibold text-gray-600 last:border-r-0 dark:border-gray-700/70 dark:text-gray-300';

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
  canViewFinancials: boolean;
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  consigneeOptions: string[];
  onSortToggle: (field: SortField) => void;
  onUpdate: (id: string, patch: Partial<InquiryRecord>) => void;
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: 'asc' | 'desc' }) {
  if (field !== sortField) return <ChevronsUpDown className="h-3 w-3 shrink-0 text-gray-300 dark:text-gray-600" />;
  return sortDir === 'asc'
    ? <ChevronUp className="h-3 w-3 shrink-0" />
    : <ChevronDown className="h-3 w-3 shrink-0" />;
}

export function OrderTable({
  records,
  canViewFinancials,
  sortField,
  sortDir,
  consigneeOptions,
  onSortToggle,
  onUpdate,
}: OrderTableProps) {
  const bp = useBreakpoint();
  const colWidths = getVisibleColWidths(bp, canViewFinancials);
  const customerCol = showCustomerCol(bp);
  const lgCols = showLgCols(bp);
  const adminCols = showAdminCols(bp, canViewFinancials);

  const thSort = (field: SortField, label: string, shortLabel?: string) => {
    const active = field === sortField;
    return (
      <button
        type="button"
        onClick={() => onSortToggle(field)}
        className={`inline-flex h-6 max-w-full items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[11px] font-semibold transition-colors ${
          active
            ? 'bg-white/80 text-blue-700 shadow-sm ring-1 ring-gray-200 hover:bg-white hover:text-blue-800 dark:bg-gray-900/60 dark:text-blue-300 dark:ring-gray-700 dark:hover:bg-gray-900'
            : 'text-gray-600 hover:bg-white/70 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/60 dark:hover:text-gray-100'
        }`}
      >
        <span className="truncate">{bp === 'sm' && shortLabel ? shortLabel : label}</span>
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </button>
    );
  };

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
          <tr className={headerRowClass}>
            <th className={`${headerCellClass} sm:px-3`}>
              {thSort('orderNo', '订单编号', '编号')}
            </th>
            <th className={`${headerCellClass} px-1.5 sm:px-2`}>
              {thSort('deliveryDate', '交货')}
            </th>
            {customerCol && (
              <th className={headerCellClass}>
                <span className="block truncate">客户</span>
              </th>
            )}
            <th className={headerCellClass}>
              <span className="block truncate">内容简述</span>
            </th>
            {lgCols && (
              <>
                <th className={headerCellClass}>
                  <span className="block truncate">确认日</span>
                </th>
                <th className={headerCellClass}>
                  <span className="block truncate">客户订单号</span>
                </th>
              </>
            )}
            <th className={`${headerCellClass} px-1.5 sm:px-2`}>
              <span className="block truncate">
                {bp === 'sm' ? '执行' : '执行情况'}
              </span>
            </th>
            {adminCols && (
              <>
                <th className={headerCellRightClass}>
                  <span className="block truncate">金额</span>
                </th>
                <th className={headerCellClass}>
                  <span className="block truncate">回款</span>
                </th>
                <th className={headerCellRightClass}>
                  <span className="block truncate">到账金额</span>
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
              canViewFinancials={canViewFinancials}
              consigneeOptions={consigneeOptions}
              onUpdate={(patch) => onUpdate(record.id, patch)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
