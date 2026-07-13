'use client';

import { useEffect, useState } from 'react';
import {
  headerCellOverflowClass,
  headerCellOverflowRightClass,
  headerRowClass,
} from '@/components/table/tableHeaderStyles';
import { ResizeHandle } from '@/components/table/ResizeHandle';
import { type ResizableColumnDef, useResizableColumns } from '@/components/table/useResizableColumns';
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

// 采购订单表（采购侧）：只在 lg/xl 断点（全列展示，含"客户订单号"）启用拖拽调宽，
// sm/md 断点继续用原有百分比响应式布局，不受影响。列 id 与下方 <th> 一一对应。
// "内容描述"（desc）故意不在这里、不给拖拽手柄：它是唯一没有显式像素宽度的列，
// table-layout:fixed 会把 table 宽度（w-full）减去其它列显式宽度后的剩余空间全分给它，
// 表格才能始终撑满容器，不会在列宽总和小于容器宽度时右侧留白。
const RESIZABLE_COLUMN_DEFS: Record<string, ResizableColumnDef> = {
  orderNo: { id: 'orderNo', defaultWidth: 110, minWidth: 90 },
  purchaseOrderNo: { id: 'purchaseOrderNo', defaultWidth: 110, minWidth: 80 },
  supplier: { id: 'supplier', defaultWidth: 130, minWidth: 90 },
  amount: { id: 'amount', defaultWidth: 100, minWidth: 80 },
  deliveryDate: { id: 'deliveryDate', defaultWidth: 90, minWidth: 70 },
  confirmDate: { id: 'confirmDate', defaultWidth: 90, minWidth: 70 },
  customerNo: { id: 'customerNo', defaultWidth: 130, minWidth: 90 },
  deliveryStatus: { id: 'deliveryStatus', defaultWidth: 140, minWidth: 100 },
};

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
  const resizable = bp === 'lg' || bp === 'xl';

  // 当前实际渲染的可拖拽列 id（与下方 <th> 渲染条件一一对应，desc 除外），只在 resizable 断点计算/使用
  const visibleResizableIds = [
    'orderNo',
    ...(purchaseOrderNoCol ? ['purchaseOrderNo'] : []),
    'supplier',
    ...(canViewFinancials ? ['amount'] : []),
    'deliveryDate',
    ...(confirmDateCol ? ['confirmDate'] : []),
    ...(customerNoCol ? ['customerNo'] : []),
    'deliveryStatus',
  ];
  const resizableColumns = visibleResizableIds.map((id) => RESIZABLE_COLUMN_DEFS[id]);
  const { widths, startResize, resetColumn } = useResizableColumns('purchaseOrderTable.tableColWidths', resizableColumns);

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
  const th = (_id: string) => `${headerCellOverflowClass} ${resizable ? 'relative' : ''}`;
  const handle = (id: string, label: string) =>
    resizable && <ResizeHandle onPointerDown={startResize(id)} onDoubleClick={() => resetColumn(id)} label={label} />;

  return (
    <>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <colgroup>
          {resizable ? (
            <>
              <col style={{ width: widths.orderNo ?? RESIZABLE_COLUMN_DEFS.orderNo.defaultWidth }} />
              <col />
              {purchaseOrderNoCol && (
                <col style={{ width: widths.purchaseOrderNo ?? RESIZABLE_COLUMN_DEFS.purchaseOrderNo.defaultWidth }} />
              )}
              <col style={{ width: widths.supplier ?? RESIZABLE_COLUMN_DEFS.supplier.defaultWidth }} />
              {canViewFinancials && <col style={{ width: widths.amount ?? RESIZABLE_COLUMN_DEFS.amount.defaultWidth }} />}
              <col style={{ width: widths.deliveryDate ?? RESIZABLE_COLUMN_DEFS.deliveryDate.defaultWidth }} />
              {confirmDateCol && (
                <col style={{ width: widths.confirmDate ?? RESIZABLE_COLUMN_DEFS.confirmDate.defaultWidth }} />
              )}
              {customerNoCol && (
                <col style={{ width: widths.customerNo ?? RESIZABLE_COLUMN_DEFS.customerNo.defaultWidth }} />
              )}
              <col style={{ width: widths.deliveryStatus ?? RESIZABLE_COLUMN_DEFS.deliveryStatus.defaultWidth }} />
            </>
          ) : (
            colWidths.map((w, i) => <col key={i} style={{ width: w }} />)
          )}
        </colgroup>
        <thead>
          <tr className={headerRowClass}>
            <th className={`${th('orderNo')} sm:px-3`}>
              订单编号
              {handle('orderNo', '订单编号')}
            </th>
            <th className={headerCellOverflowClass}>内容描述</th>
            {purchaseOrderNoCol && (
              <th className={`${th('purchaseOrderNo')} px-1.5 sm:px-2`}>
                采购单号
                {handle('purchaseOrderNo', '采购单号')}
              </th>
            )}
            <th className={`${th('supplier')} px-1.5 sm:px-2`}>
              供应商
              {handle('supplier', '供应商')}
            </th>
            {canViewFinancials && (
              <th className={`${headerCellOverflowRightClass} ${resizable ? 'relative' : ''}`}>
                金额
                {handle('amount', '金额')}
              </th>
            )}
            <th className={`${th('deliveryDate')} px-1.5 sm:px-2`}>
              交货日期
              {handle('deliveryDate', '交货日期')}
            </th>
            {confirmDateCol && (
              <th className={th('confirmDate')}>
                确认日期
                {handle('confirmDate', '确认日期')}
              </th>
            )}
            {customerNoCol && (
              <th className={th('customerNo')}>
                客户订单号
                {handle('customerNo', '客户订单号')}
              </th>
            )}
            <th className={`${th('deliveryStatus')} px-1.5 sm:px-2`}>
              执行情况
              {handle('deliveryStatus', '执行情况')}
            </th>
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
