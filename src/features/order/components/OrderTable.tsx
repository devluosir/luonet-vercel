'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import {
  headerCellCenterClass,
  headerCellOverflowClass,
  headerCellOverflowRightClass,
  headerRowClass,
} from '@/components/table/tableHeaderStyles';
import { ResizeHandle } from '@/components/table/ResizeHandle';
import { type ResizableColumnDef, useResizableColumns } from '@/components/table/useResizableColumns';
import type { InquiryRecord } from '@/features/inquiry/types';
import {
  type OrderTableBreakpoint,
  getVisibleColWidths,
  showAdminCols,
  showConfirmDateCol,
  showCustomerCol,
  showLgCols,
} from '../utils/orderTableLayout';
import { OrderEditModal } from './OrderEditModal';
import { OrderRow } from './OrderRow';

export type SortField = 'orderNo' | 'deliveryDate';

export type { OrderTableBreakpoint };

const headerCellClass = headerCellOverflowClass;
const headerCellRightClass = headerCellOverflowRightClass;

// 全选列宽度固定、不参与拖拽调宽
const CHECK_COL_PX = 40;

// 订单状态表（销售侧）：只在 xl 断点（全列展示，含"客户订单号"）启用拖拽调宽，
// 其余断点继续用原有百分比响应式布局，不受影响。列 id 与下方 <th> 一一对应。
const RESIZABLE_COLUMN_DEFS: Record<string, ResizableColumnDef> = {
  orderNo: { id: 'orderNo', defaultWidth: 120, minWidth: 90 },
  deliveryDate: { id: 'deliveryDate', defaultWidth: 64, minWidth: 56 },
  customer: { id: 'customer', defaultWidth: 96, minWidth: 70 },
  desc: { id: 'desc', defaultWidth: 192, minWidth: 120 },
  confirmDate: { id: 'confirmDate', defaultWidth: 64, minWidth: 56 },
  customerOrderNo: { id: 'customerOrderNo', defaultWidth: 200, minWidth: 100 },
  deliveryStatus: { id: 'deliveryStatus', defaultWidth: 144, minWidth: 100 },
  amount: { id: 'amount', defaultWidth: 110, minWidth: 80 },
  paymentDate: { id: 'paymentDate', defaultWidth: 70, minWidth: 60 },
  receivedAmount: { id: 'receivedAmount', defaultWidth: 120, minWidth: 90 },
};

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
  canBatchEdit?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (allIds: string[]) => void;
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
  canBatchEdit = false,
  selectedIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
}: OrderTableProps) {
  const bp = useBreakpoint();
  const colWidths = getVisibleColWidths(bp, canViewFinancials, canBatchEdit);
  const customerCol = showCustomerCol(bp);
  const confirmDateCol = showConfirmDateCol(bp);
  const lgCols = showLgCols(bp);
  const adminCols = showAdminCols(bp, canViewFinancials);
  const resizable = bp === 'xl';

  // 当前实际渲染的可拖拽列 id（与下方 <th> 渲染条件一一对应），只在 resizable 断点计算/使用
  const visibleResizableIds = [
    'orderNo',
    'deliveryDate',
    ...(customerCol ? ['customer'] : []),
    'desc',
    ...(confirmDateCol ? ['confirmDate'] : []),
    ...(lgCols ? ['customerOrderNo'] : []),
    'deliveryStatus',
    ...(adminCols ? ['amount', 'paymentDate', 'receivedAmount'] : []),
  ];
  const resizableColumns = visibleResizableIds.map((id) => RESIZABLE_COLUMN_DEFS[id]);
  const { widths, startResize, resetColumn } = useResizableColumns('order.tableColWidths', resizableColumns);
  const totalWidth =
    (canBatchEdit ? CHECK_COL_PX : 0) +
    resizableColumns.reduce((sum, c) => sum + (widths[c.id] ?? c.defaultWidth), 0);

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const editingRecord = editingRecordId
    ? records.find((record) => record.id === editingRecordId) ?? null
    : null;
  const allIds = records.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id)) && !allSelected;

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
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-[#2C2C2E]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">暂无订单记录</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          在询报价登记中填写订单编号后，记录会自动显示在这里
        </p>
      </div>
    );
  }

  const th = (_id: string) => `${headerCellClass} ${resizable ? 'relative' : ''}`;
  const handle = (id: string, label: string) =>
    resizable && <ResizeHandle onPointerDown={startResize(id)} onDoubleClick={() => resetColumn(id)} label={label} />;

  return (
    <>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <div className="overflow-x-auto">
      <table
        className={`table-fixed ${resizable ? '' : 'w-full'}`}
        style={resizable ? { width: totalWidth } : undefined}
      >
        <colgroup>
          {resizable ? (
            <>
              {canBatchEdit && <col style={{ width: CHECK_COL_PX }} />}
              {resizableColumns.map((c) => (
                <col key={c.id} style={{ width: widths[c.id] ?? c.defaultWidth }} />
              ))}
            </>
          ) : (
            colWidths.map((w, i) => <col key={i} style={{ width: w }} />)
          )}
        </colgroup>
        <thead>
          <tr className={headerRowClass}>
            {canBatchEdit && (
              <th className={headerCellCenterClass}>
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
            <th className={`${th('orderNo')} sm:px-3`}>
              {thSort('orderNo', '订单编号', '编号')}
              {handle('orderNo', '订单编号')}
            </th>
            <th className={`${th('deliveryDate')} px-1.5 sm:px-2`}>
              {thSort('deliveryDate', '交货')}
              {handle('deliveryDate', '交货')}
            </th>
            {customerCol && (
              <th className={th('customer')}>
                <span className="block truncate">客户</span>
                {handle('customer', '客户')}
              </th>
            )}
            <th className={th('desc')}>
              <span className="block truncate">内容简述</span>
              {handle('desc', '内容简述')}
            </th>
            {confirmDateCol && (
              <th className={`${th('confirmDate')} px-1.5 sm:px-2`}>
                <span className="block truncate">
                  {bp === 'sm' ? '确认' : '确认日'}
                </span>
                {handle('confirmDate', '确认日')}
              </th>
            )}
            {lgCols && (
              <th className={th('customerOrderNo')}>
                <span className="block truncate">客户订单号</span>
                {handle('customerOrderNo', '客户订单号')}
              </th>
            )}
            <th className={`${th('deliveryStatus')} px-1.5 sm:px-2`}>
              <span className="block truncate">
                {bp === 'sm' ? '执行' : '执行情况'}
              </span>
              {handle('deliveryStatus', '执行情况')}
            </th>
            {adminCols && (
              <>
                <th className={`${headerCellRightClass} ${resizable ? 'relative' : ''}`}>
                  <span className="block truncate">金额</span>
                  {handle('amount', '金额')}
                </th>
                <th className={th('paymentDate')}>
                  <span className="block truncate">回款</span>
                  {handle('paymentDate', '回款')}
                </th>
                <th className={`${headerCellRightClass} ${resizable ? 'relative' : ''}`}>
                  <span className="block truncate">到账金额</span>
                  {handle('receivedAmount', '到账金额')}
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
              onOpenEdit={(record) => setEditingRecordId(record.id)}
              canBatchEdit={canBatchEdit}
              selected={selectedIds.has(record.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </tbody>
      </table>
      </div>
    </div>
    <OrderEditModal
      isOpen={editingRecordId !== null}
      record={editingRecord}
      canViewFinancials={canViewFinancials}
      consigneeOptions={consigneeOptions}
      onClose={() => setEditingRecordId(null)}
      onSave={(id, patch) => onUpdate(id, patch)}
    />
    </>
  );
}
