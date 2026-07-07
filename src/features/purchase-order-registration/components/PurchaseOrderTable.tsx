'use client';

import {
  headerCellOverflowClass,
  headerCellOverflowRightClass,
  headerRowClass,
} from '@/components/table/tableHeaderStyles';
import type { InquiryRecord } from '@/features/inquiry/types';
import { PurchaseOrderRow } from './PurchaseOrderRow';

interface PurchaseOrderTableProps {
  records: InquiryRecord[];
  canViewFinancials: boolean;
  consigneeOptions: string[];
  onUpdate: (id: string, patch: Partial<InquiryRecord>) => void;
}

export function PurchaseOrderTable({ records, canViewFinancials, consigneeOptions, onUpdate }: PurchaseOrderTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-[#2C2C2E]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">暂无采购订单记录</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          在询报价登记中填写订单编号后，记录会自动显示在这里
        </p>
      </div>
    );
  }

  const colWidths = canViewFinancials
    ? ['14%', '13%', '15%', '10%', '9%', '9%', '13%', '17%']
    : ['15%', '14%', '17%', '10%', '10%', '14%', '20%'];

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
            <th className={`${headerCellOverflowClass} sm:px-3`}>订单编号</th>
            <th className={`${headerCellOverflowClass} px-1.5 sm:px-2`}>采购单号</th>
            <th className={`${headerCellOverflowClass} px-1.5 sm:px-2`}>供应商</th>
            {canViewFinancials && <th className={headerCellOverflowRightClass}>金额</th>}
            <th className={`${headerCellOverflowClass} px-1.5 sm:px-2`}>交货日期</th>
            <th className={headerCellOverflowClass}>确认日期</th>
            <th className={headerCellOverflowClass}>客户订单号</th>
            <th className={`${headerCellOverflowClass} px-1.5 sm:px-2`}>执行情况</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <PurchaseOrderRow
              key={record.id}
              record={record}
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
