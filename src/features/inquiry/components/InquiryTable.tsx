'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  headerCellCenterClass,
  headerCellClass,
  headerRowClass,
} from '@/components/table/tableHeaderStyles';
import { ResizeHandle } from '@/components/table/ResizeHandle';
import {
  computeResizableTableMinWidth,
  type ResizableColumnDef,
  useResizableColumns,
} from '@/components/table/useResizableColumns';
import type { InquiryRecord } from '../types';
import { InquiryRow } from './InquiryRow';

// 全选列宽度固定、不参与拖拽调宽（避免用户把勾选框拖没了）
const CHECK_COL_PX = 40;

// 询报价登记表（销售侧）：只在 lg 断点（客户编号列可见，即全列展示）启用拖拽调宽，
// 其余断点（md/sm）继续用原有百分比响应式布局，不受影响。
//
// "询报价状态"列（也是表格最后一列）故意不在这个数组里、不给拖拽手柄：
// 它是唯一没有显式像素宽度的列，table-layout:fixed 会把 table 宽度（w-full）减去其它列显式宽度后
// 的剩余空间全分给它，表格才能始终撑满容器，不会在列宽总和小于容器宽度时右侧留白；
// table min-width 同时为它保留下限，空间不足时由外层横向滚动承接，避免状态列被压窄或隐藏。
// 这个"吸收剩余空间"的列必须放在可拖拽列里的最后一个——之前误放在中间的"内容简述"上，导致拖动它
// 后面的"询报价状态"手柄时，宽度变化要靠"内容简述"收缩/膨胀补偿，而"内容简述"在左边，视觉上就变成
// "往左扩展"而不是正常的"往右扩展"，用户反馈过这个问题。放在最后一个可拖拽列就不会有这个问题。
const RESIZABLE_COLUMNS: ResizableColumnDef[] = [
  { id: 'no', defaultWidth: 110, minWidth: 80 },
  { id: 'inquirer', defaultWidth: 120, minWidth: 80 },
  { id: 'custno', defaultWidth: 230, minWidth: 140 },
  { id: 'desc', defaultWidth: 230, minWidth: 140 },
];

const INQUIRY_STATUS_MIN_WIDTH = 180;
const headerLabelClass = 'flex h-6 items-center truncate whitespace-nowrap';

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
  emptyMessage?: string;
  emptySubMessage?: string;
  canBatchEdit?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (allIds: string[]) => void;
}

export function InquiryTable({
  records,
  sortDir,
  onSortToggle,
  onEditRecord,
  emptyMessage = '暂无询报价记录',
  emptySubMessage = '点击"新增询价"后，会在这里登记供应商询价和客户报价状态。',
  canBatchEdit = false,
  selectedIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
}: InquiryTableProps) {
  const bp = useBreakpoint();
  const resizable = bp === 'lg';
  const { widths, startResize, resetColumn } = useResizableColumns('inquiry.tableColWidths', RESIZABLE_COLUMNS);
  const tableMinWidth = resizable
    ? computeResizableTableMinWidth(
        RESIZABLE_COLUMNS,
        widths,
        INQUIRY_STATUS_MIN_WIDTH,
        canBatchEdit ? CHECK_COL_PX : 0
      )
    : undefined;

  const allIds = records.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id)) && !allSelected;

  // 列宽：有 checkbox 列时从询价编号列各借 3%（仅非拖拽调宽断点适用）
  const W = canBatchEdit
    ? {
        check:    '3%',
        no:       bp === 'lg' ? '9%'  : bp === 'md' ? '13%' : '25%',
        inquirer: bp === 'lg' ? '11%' : '12%',
        custno:   '22%',
        desc:     bp === 'lg' ? '21%' : bp === 'md' ? '21%' : '33%',
        status:   bp === 'lg' ? '30%' : bp === 'md' ? '52%' : '39%',
      }
    : {
        check:    '0%',
        no:       bp === 'lg' ? '10%' : bp === 'md' ? '15%' : '26%',
        inquirer: bp === 'lg' ? '12%' : '13%',
        custno:   '24%',
        desc:     bp === 'lg' ? '22%' : bp === 'md' ? '22%' : '33%',
        status:   bp === 'lg' ? '28%' : bp === 'md' ? '50%' : '41%',
      };

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-[#2C2C2E]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{emptyMessage}</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{emptySubMessage}</p>
      </div>
    );
  }

  // 拖拽调宽断点（lg）下，各列宽度改为拖拽 hook 提供的像素值；其余断点保持原有百分比不变
  const colWidth = (id: 'no' | 'inquirer' | 'custno' | 'desc'): string | number =>
    resizable ? widths[id] ?? RESIZABLE_COLUMNS.find((c) => c.id === id)!.defaultWidth : W[id];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <div className="overflow-x-auto">
        <table
          className="w-full table-fixed divide-y divide-gray-100 dark:divide-gray-800"
          style={tableMinWidth ? { minWidth: tableMinWidth } : undefined}
        >
          <thead>
            <tr className={headerRowClass}>
              {/* 全选 checkbox */}
              {canBatchEdit && (
                <th style={{ width: resizable ? CHECK_COL_PX : W.check }} className={headerCellCenterClass}>
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

              <th style={{ width: colWidth('no') }} className={`${headerCellClass} ${resizable ? 'relative' : ''}`}>
                <button
                  type="button"
                  onClick={onSortToggle}
                  className="inline-flex h-6 max-w-full items-center gap-1 whitespace-nowrap rounded-md bg-white/80 px-1.5 text-[11px] font-semibold text-blue-700 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-white hover:text-blue-800 dark:bg-gray-900/60 dark:text-blue-300 dark:ring-gray-700 dark:hover:bg-gray-900"
                  title={sortDir === 'desc' ? '当前：最新在前，点击切换' : '当前：最早在前，点击切换'}
                >
                  <span className="truncate">询价编号</span>
                  {sortDir === 'desc' ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronUp className="h-3 w-3 shrink-0" />
                  )}
                </button>
                {resizable && <ResizeHandle onPointerDown={startResize('no')} onDoubleClick={() => resetColumn('no')} label="询价编号" />}
              </th>
              <th style={{ width: colWidth('inquirer') }} className={`${headerCellClass} hidden md:table-cell ${resizable ? 'relative' : ''}`}>
                <span className={headerLabelClass}>询价人</span>
                {resizable && <ResizeHandle onPointerDown={startResize('inquirer')} onDoubleClick={() => resetColumn('inquirer')} label="询价人" />}
              </th>
              <th style={{ width: colWidth('custno') }} className={`${headerCellClass} hidden lg:table-cell ${resizable ? 'relative' : ''}`}>
                <span className={headerLabelClass}>客户编号</span>
                {resizable && <ResizeHandle onPointerDown={startResize('custno')} onDoubleClick={() => resetColumn('custno')} label="客户编号" />}
              </th>
              <th style={{ width: colWidth('desc') }} className={`${headerCellClass} ${resizable ? 'relative' : ''}`}>
                <span className={headerLabelClass}>内容简述</span>
                {resizable && <ResizeHandle onPointerDown={startResize('desc')} onDoubleClick={() => resetColumn('desc')} label="内容简述" />}
              </th>
              <th style={resizable ? undefined : { width: W.status }} className={headerCellClass}>
                <span className={headerLabelClass}>询报价状态</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {records.map((record) => (
              <InquiryRow
                key={record.id}
                record={record}
                onEdit={onEditRecord}
                canBatchEdit={canBatchEdit}
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
