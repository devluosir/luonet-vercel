'use client';

import {
  headerCellOverflowClass,
  headerRowClass,
} from '@/components/table/tableHeaderStyles';
import type { InquiryRecord } from '@/features/inquiry/types';
import { PurchaseRegistrationRow } from './PurchaseRegistrationRow';

interface PurchaseRegistrationTableProps {
  records: InquiryRecord[];
  onUpdate: (id: string, patch: Partial<InquiryRecord>) => void;
  onEditRecord: (record: InquiryRecord) => void;
}

export function PurchaseRegistrationTable({ records, onUpdate, onEditRecord }: PurchaseRegistrationTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-[#2C2C2E]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">暂无采购部登记记录</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          询报价登记同步后，记录会显示在这里
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[42%]" />
          <col className="w-[26%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr className={headerRowClass}>
            <th className={headerCellOverflowClass}>询价编号</th>
            <th className={headerCellOverflowClass}>内容描述</th>
            <th className={headerCellOverflowClass}>询报价状态</th>
            <th className={headerCellOverflowClass}>状态</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <PurchaseRegistrationRow
              key={record.id}
              record={record}
              onUpdate={(patch) => onUpdate(record.id, patch)}
              onEditRecord={onEditRecord}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
