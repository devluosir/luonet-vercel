'use client';

import { Trash2 } from 'lucide-react';
import type { InquiryRecord } from '../types';
import { getRecordColorState, stripDateBrackets } from '../utils/inquiryUtils';
import { InquiryQuoteStatusDisplay } from './InquiryQuoteStatusDisplay';

interface InquiryRowProps {
  record: InquiryRecord;
  onEdit: (record: InquiryRecord) => void;
  onDelete: (recordId: string) => void;
}

export function InquiryRow({ record, onEdit, onDelete }: InquiryRowProps) {
  const mainColorClass = getRecordColorState(record);
  const mainTextClass = `${mainColorClass} font-medium`;

  return (
    <tr
      className="group cursor-pointer border-b border-gray-100 align-middle last:border-b-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/40"
      onClick={() => onEdit(record)}
    >
      <td className="w-[24%] px-3 py-2 text-sm md:w-[16%] lg:w-[10%]">
        <div className="flex flex-col gap-0 leading-tight">
          <span className={`whitespace-nowrap font-mono leading-4 ${mainTextClass}`}>
            {record.inquiryNo}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] leading-4 text-gray-400 dark:text-gray-500">
            <span>{stripDateBrackets(record.inquiryDate)}</span>
            {record.orderNo && (
              <span className="inline-flex items-center rounded-full bg-green-50 px-1.5 py-0 text-[11px] font-medium leading-4 text-green-700 ring-1 ring-green-200 dark:bg-green-950/40 dark:text-green-400 dark:ring-green-800">
                {record.orderNo}
              </span>
            )}
          </span>
        </div>
      </td>
      <td className="hidden w-[16%] whitespace-nowrap px-3 py-2 text-sm md:table-cell lg:w-[12%]">
        <span className={mainTextClass}>{record.inquirer}</span>
      </td>
      <td className="hidden px-3 py-2 text-sm lg:table-cell lg:w-[24%] xl:w-[26%]">
        <span
          className={`line-clamp-2 max-w-none break-words leading-4 ${mainTextClass}`}
          title={record.customerNo}
        >
          {record.customerNo}
        </span>
      </td>
      <td className="w-[34%] px-3 py-2 text-sm md:w-[32%] lg:w-[22%]">
        {/* 大屏：客户编号列可见，内容简述只显示 description */}
        <p className={`hidden lg:block max-w-none truncate ${mainTextClass}`} title={record.description}>
          {record.description}
        </p>
        {/* 中小屏：客户编号列隐藏，description 为空时回退显示客户编号 */}
        <p className={`lg:hidden max-w-none truncate ${mainTextClass}`} title={record.description?.trim() || record.customerNo}>
          {record.description?.trim() || record.customerNo}
        </p>
      </td>
      <td className="w-[34%] px-3 py-2 md:w-[30%] lg:w-[28%] xl:w-[26%]">
        <InquiryQuoteStatusDisplay record={record} />
      </td>
      <td className="w-[8%] whitespace-nowrap px-3 py-2 text-right md:w-[6%] lg:w-[4%]">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
          className="rounded-md p-1 text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          aria-label={`删除 ${record.inquiryNo}`}
          title="删除"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
