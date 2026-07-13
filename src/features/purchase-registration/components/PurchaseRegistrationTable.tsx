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
  onUpdate: (id: string, patch: Partial<InquiryRecord>) => void;
  onEditRecord: (record: InquiryRecord) => void;
}

// 采购部登记表本身没有响应式断点（任何屏宽都渲染同样 4 列），直接全量启用拖拽调宽。
// "询报价状态"列默认宽度比原先 26% 更宽（用户反馈原宽度装不下状态提示），可拖拽后用户还能再自行调整。
// "内容描述"列故意不放进这个数组、不给拖拽手柄：它是唯一没有显式像素宽度的列，
// 表格 table-layout:fixed 算法会把 table 宽度（w-full）减去其它列显式宽度后的剩余空间全部分给它，
// 这样表格才能始终撑满容器宽度，不会在列宽总和小于容器宽度时右侧留白（早期版本用固定总像素宽度做过，
// 用户反馈四张表都撑不满整个窗口，改成这个方案）。
// "状态描述"列（原"状态"）现在带日期（如"需补充信息（7.13）"），默认宽度比原来 130px 更宽一些。
const COLUMNS: ResizableColumnDef[] = [
  { id: 'no', defaultWidth: 150, minWidth: 100 },
  { id: 'status', defaultWidth: 340, minWidth: 180 },
  { id: 'main', defaultWidth: 170, minWidth: 110 },
];

const th = `${headerCellOverflowClass} relative`;

export function PurchaseRegistrationTable({ records, onUpdate, onEditRecord }: PurchaseRegistrationTableProps) {
  const { widths, startResize, resetColumn } = useResizableColumns('purchaseRegistration.tableColWidths', COLUMNS);

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
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: widths.no ?? 150 }} />
            <col />
            <col style={{ width: widths.status ?? 340 }} />
            <col style={{ width: widths.main ?? 170 }} />
          </colgroup>
          <thead>
            <tr className={headerRowClass}>
              <th className={th}>
                询价编号
                <ResizeHandle onPointerDown={startResize('no')} onDoubleClick={() => resetColumn('no')} label="询价编号" />
              </th>
              <th className={headerCellOverflowClass}>内容描述</th>
              <th className={th}>
                询报价状态
                <ResizeHandle onPointerDown={startResize('status')} onDoubleClick={() => resetColumn('status')} label="询报价状态" />
              </th>
              <th className={th}>
                状态描述
                <ResizeHandle onPointerDown={startResize('main')} onDoubleClick={() => resetColumn('main')} label="状态描述" />
              </th>
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
    </div>
  );
}
