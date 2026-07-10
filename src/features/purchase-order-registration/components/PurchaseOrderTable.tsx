'use client';

import { useEffect, useState } from 'react';
import {
  headerCellOverflowClass,
  headerCellOverflowRightClass,
  headerRowClass,
} from '@/components/table/tableHeaderStyles';
import type { InquiryRecord } from '@/features/inquiry/types';
import {
  type PurchaseOrderTableBreakpoint,
  getVisibleColWidths,
  showConfirmDateCol,
  showCustomerNoCol,
  showPurchaseOrderNoCol,
} from '../utils/purchaseOrderTableLayout';
import { PurchaseOrderEditModal } from './PurchaseOrderEditModal';
import { PurchaseOrderRow } from './PurchaseOrderRow';

export type { PurchaseOrderTableBreakpoint };

interface PurchaseOrderTableProps {
  records: InquiryRecord[];
  canViewFinancials: boolean;
  consigneeOptions: string[];
  onUpdate: (id: string, patch: Partial<InquiryRecord>) => void;
}

function useBreakpoint(): PurchaseOrderTableBreakpoint {
  const [bp, setBp] = useState<PurchaseOrderTableBreakpoint>('lg');

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

export function PurchaseOrderTable({ records, canViewFinancials, consigneeOptions, onUpdate }: PurchaseOrderTableProps) {
  const bp = useBreakpoint();
  const purchaseOrderNoCol = showPurchaseOrderNoCol(bp);
  const confirmDateCol = showConfirmDateCol(bp);
  const customerNoCol = showCustomerNoCol(bp);
  const [editingRecord, setEditingRecord] = useState<InquiryRecord | null>(null);

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

  const colWidths = getVisibleColWidths(bp, canViewFinancials);

  return (
    <>
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
            <th className={headerCellOverflowClass}>内容描述</th>
            {purchaseOrderNoCol && (
              <th className={`${headerCellOverflowClass} px-1.5 sm:px-2`}>采购单号</th>
            )}
            <th className={`${headerCellOverflowClass} px-1.5 sm:px-2`}>供应商</th>
            {canViewFinancials && <th className={headerCellOverflowRightClass}>金额</th>}
            <th className={`${headerCellOverflowClass} px-1.5 sm:px-2`}>交货日期</th>
            {confirmDateCol && <th className={headerCellOverflowClass}>确认日期</th>}
            {customerNoCol && <th className={headerCellOverflowClass}>客户订单号</th>}
            <th className={`${headerCellOverflowClass} px-1.5 sm:px-2`}>执行情况</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <PurchaseOrderRow
              key={record.id}
              record={record}
              bp={bp}
              canViewFinancials={canViewFinancials}
              consigneeOptions={consigneeOptions}
              onUpdate={(patch) => onUpdate(record.id, patch)}
              onOpenEdit={setEditingRecord}
            />
          ))}
        </tbody>
      </table>
    </div>
    <PurchaseOrderEditModal
      isOpen={editingRecord !== null}
      record={editingRecord}
      canViewFinancials={canViewFinancials}
      consigneeOptions={consigneeOptions}
      onClose={() => setEditingRecord(null)}
      onSave={(id, patch) => onUpdate(id, patch)}
    />
    </>
  );
}
