'use client';

import {
  headerCellOverflowClass,
  headerCellOverflowRightClass,
  headerRowClass,
} from '@/components/table/tableHeaderStyles';
import type { PurchaseOrderRecord } from '../types';
import { PurchaseOrderRow } from './PurchaseOrderRow';

interface PurchaseOrderTableProps {
  records: PurchaseOrderRecord[];
  onEdit: (record: PurchaseOrderRecord) => void;
  onDelete: (record: PurchaseOrderRecord) => void;
  onUpdate: (id: string, patch: Partial<PurchaseOrderRecord>) => void;
}

export function PurchaseOrderTable({ records, onEdit, onDelete, onUpdate }: PurchaseOrderTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-[#2C2C2E]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">暂无采购订单表记录</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          新增记录后可在这里追踪备货、交货和发票状态
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[22%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[24%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead>
          <tr className={headerRowClass}>
            <th className={headerCellOverflowClass}>采购单号</th>
            <th className={headerCellOverflowClass}>供应商</th>
            <th className={headerCellOverflowRightClass}>金额</th>
            <th className={headerCellOverflowClass}>创建日期</th>
            <th className={headerCellOverflowClass}>备货 / 交货 / 发票</th>
            <th className={headerCellOverflowRightClass}>操作</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <PurchaseOrderRow
              key={record.id}
              record={record}
              onEdit={() => onEdit(record)}
              onDelete={() => onDelete(record)}
              onUpdate={(patch) => onUpdate(record.id, patch)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
