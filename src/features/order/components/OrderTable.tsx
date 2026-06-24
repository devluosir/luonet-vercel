'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { OrderRow } from './OrderRow';

export type SortField = 'orderNo' | 'deliveryDate';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('lg');

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

/** 各断点列宽（百分比，合计 100%）：table-fixed + th/col width */
function getColWidths(bp: Breakpoint, isAdmin: boolean) {
  if (bp === 'sm') {
    return {
      orderNo: '18%',
      delivery: '10%',
      customer: '0%',
      desc: '40%',
      confirm: '0%',
      customerNo: '0%',
      status: '32%',
      amount: '0%',
      payment: '0%',
      received: '0%',
    };
  }
  if (bp === 'md') {
    return {
      orderNo: '14%',
      delivery: '7%',
      customer: '13%',
      desc: '32%',
      confirm: '0%',
      customerNo: '0%',
      status: '32%',
      amount: '0%',
      payment: '0%',
      received: '0%',
    };
  }
  if (bp === 'lg' || (bp === 'xl' && !isAdmin)) {
    // 7 列：简述与客户订单号为主信息列，执行情况仅展示短文本
    return {
      orderNo: '10%',
      delivery: '5%',
      customer: '9%',
      desc: '26%',
      confirm: '5%',
      customerNo: '23%',
      status: '17%',
      amount: '0%',
      payment: '0%',
      received: '0%',
    };
  }
  // xl + 管理员：10 列，金额三列右对齐成组
  return {
    orderNo: '10%',
    delivery: '4%',
    customer: '8%',
    desc: '16%',
    confirm: '4%',
    customerNo: '19%',
    status: '12%',
    amount: '10%',
    payment: '5%',
    received: '12%',
  };
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
  const W = getColWidths(bp, isAdmin);

  const thSort = (field: SortField, label: string) => (
    <button type="button" onClick={() => onSortToggle(field)}
      className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
    >
      {label}
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
      <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <colgroup>
          <col style={{ width: W.orderNo }} />
          <col style={{ width: W.delivery }} />
          <col style={{ width: W.customer }} />
          <col style={{ width: W.desc }} />
          <col style={{ width: W.confirm }} />
          <col style={{ width: W.customerNo }} />
          <col style={{ width: W.status }} />
          {isAdmin && <col style={{ width: W.amount }} />}
          {isAdmin && <col style={{ width: W.payment }} />}
          {isAdmin && <col style={{ width: W.received }} />}
        </colgroup>
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th style={{ width: W.orderNo }} className="overflow-hidden px-3 py-2 text-left">
              {thSort('orderNo', '订单编号')}
            </th>
            <th style={{ width: W.delivery }} className="overflow-hidden px-2 py-2 text-left">
              {thSort('deliveryDate', '交货')}
            </th>
            <th style={{ width: W.customer }} className="hidden overflow-hidden px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 md:table-cell">
              <span className="whitespace-nowrap">客户</span>
            </th>
            <th style={{ width: W.desc }} className="overflow-hidden px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500">
              <span className="whitespace-nowrap">内容简述</span>
            </th>
            <th style={{ width: W.confirm }} className="hidden overflow-hidden px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 lg:table-cell">
              <span className="whitespace-nowrap">确认日</span>
            </th>
            <th style={{ width: W.customerNo }} className="hidden overflow-hidden px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 lg:table-cell">
              <span className="whitespace-nowrap">客户订单号</span>
            </th>
            <th style={{ width: W.status }} className="overflow-hidden px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500">
              <span className="block truncate">执行情况</span>
            </th>
            {isAdmin && (
              <th style={{ width: W.amount }} className="hidden overflow-hidden px-2 py-2 text-right text-[11px] font-semibold text-gray-400 dark:text-gray-500 xl:table-cell">
                <span className="whitespace-nowrap">金额</span>
              </th>
            )}
            {isAdmin && (
              <th style={{ width: W.payment }} className="hidden overflow-hidden px-2 py-2 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 xl:table-cell">
                <span className="whitespace-nowrap">回款</span>
              </th>
            )}
            {isAdmin && (
              <th style={{ width: W.received }} className="hidden overflow-hidden px-2 py-2 text-right text-[11px] font-semibold text-gray-400 dark:text-gray-500 xl:table-cell">
                <span className="whitespace-nowrap">到账金额</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <OrderRow key={record.id} record={record} isAdmin={isAdmin}
              onUpdate={(patch) => onUpdate(record.id, patch)}
            />
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
