'use client';

import {
  headerCellOverflowClass,
  headerRowClass,
} from '@/components/table/tableHeaderStyles';
import { ResizeHandle } from '@/components/table/ResizeHandle';
import { type ResizableColumnDef, useResizableColumns } from '@/components/table/useResizableColumns';
import type { InquiryRecord } from '@/features/inquiry/types';
import { PurchaseRegistrationRow } from './PurchaseRegistrationRow';

interface PurchaseRegistrationTableProps {
  records: InquiryRecord[];
  onEditRecord: (record: InquiryRecord) => void;
  purchaseSupplierNameById: Map<string, string>;
}

// 采购部登记表本身没有响应式断点（任何屏宽都渲染同样 4 列），直接全量启用拖拽调宽。
// "询报价状态"列默认宽度比原先 26% 更宽（用户反馈原宽度装不下状态提示），可拖拽后用户还能再自行调整。
//
// 最后一列"状态描述"（main）故意不放进这个数组、不给拖拽手柄：它是唯一没有显式像素宽度的列，
// 表格 table-layout:fixed 算法会把 table 宽度（w-full）减去其它列显式宽度后的剩余空间全部分给它，
// 这样表格才能始终撑满容器宽度，不会在列宽总和小于容器宽度时右侧留白。
// 关键是这个"吸收剩余空间"的列必须是渲染顺序里最后一列——之前误放在第 2 列"内容描述"上，
// 导致拖动它后面任意一列（询报价状态/状态描述）的手柄时，被拖列的宽度变化要靠"内容描述"收缩/膨胀来补偿，
// 而"内容描述"在它们左边，于是视觉上变成"往左扩展"而不是正常的"往右扩展"，用户反馈过这个问题。
// 放在最后一列就不会有这个问题：拖动前面任意一列的手柄，只会让"状态描述"从它自己的右边界（也就是
// 表格自己的右边界）收缩/膨胀，不会波及其它列的左边界。
const COLUMNS: ResizableColumnDef[] = [
  { id: 'no', defaultWidth: 150, minWidth: 100 },
  { id: 'desc', defaultWidth: 320, minWidth: 160 },
  { id: 'status', defaultWidth: 340, minWidth: 180 },
];

const STATUS_DESCRIPTION_MIN_WIDTH = 180;
const resizableHeaderCellClass = `${headerCellOverflowClass} relative`;
const headerLabelClass = 'flex h-6 items-center truncate whitespace-nowrap';

export function PurchaseRegistrationTable({ records, onEditRecord, purchaseSupplierNameById }: PurchaseRegistrationTableProps) {
  const { widths, startResize, resetColumn } = useResizableColumns('purchaseRegistration.tableColWidths', COLUMNS);
  const tableMinWidth = widths.no + widths.desc + widths.status + STATUS_DESCRIPTION_MIN_WIDTH;

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
      <div className="overflow-x-auto">
        <table className="w-full table-fixed" style={{ minWidth: tableMinWidth }}>
          <colgroup>
            <col style={{ width: widths.no ?? 150 }} />
            <col style={{ width: widths.desc ?? 320 }} />
            <col style={{ width: widths.status ?? 340 }} />
            <col />
          </colgroup>
          <thead>
            <tr className={headerRowClass}>
              <th className={resizableHeaderCellClass}>
                <span className={headerLabelClass}>询价编号</span>
                <ResizeHandle onPointerDown={startResize('no')} onDoubleClick={() => resetColumn('no')} label="询价编号" />
              </th>
              <th className={resizableHeaderCellClass}>
                <span className={headerLabelClass}>内容描述</span>
                <ResizeHandle onPointerDown={startResize('desc')} onDoubleClick={() => resetColumn('desc')} label="内容描述" />
              </th>
              <th className={resizableHeaderCellClass}>
                <span className={headerLabelClass}>询报价状态</span>
                <ResizeHandle onPointerDown={startResize('status')} onDoubleClick={() => resetColumn('status')} label="询报价状态" />
              </th>
              <th className={headerCellOverflowClass}>
                <span className={headerLabelClass}>状态描述</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <PurchaseRegistrationRow
                key={record.id}
                record={record}
                onEditRecord={onEditRecord}
                purchaseSupplierNameById={purchaseSupplierNameById}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
