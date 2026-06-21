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
      <td className="px-3 py-2 text-sm">
        <div className="flex flex-col gap-0 leading-tight">
          <span className={`whitespace-nowrap font-mono leading-4 ${mainTextClass}`}>
            {record.inquiryNo}
          </span>
          {record.orderNo && (
            <span className="inline-flex w-fit items-center rounded-full bg-green-50 px-1.5 py-0 text-[11px] font-medium leading-4 text-green-700 ring-1 ring-green-200 dark:bg-green-950/40 dark:text-green-400 dark:ring-green-800">
              {record.orderNo}
            </span>
          )}
          <span className="text-[11px] leading-3 text-gray-400 dark:text-gray-500">
            {stripDateBrackets(record.inquiryDate)}
          </span>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-sm">
        <span className={mainTextClass}>{record.inquirer}</span>
      </td>
      <td className="px-3 py-2 text-sm">
        <span className={`block max-w-[180px] truncate ${mainTextClass}`} title={record.customerNo}>
          {record.customerNo}
        </span>
      </td>
      <td className="min-w-[160px] px-3 py-2 text-sm">
        <p className={`max-w-[260px] truncate ${mainTextClass}`} title={record.description}>
          {record.description}
        </p>
      </td>
      <td className="min-w-[240px] px-3 py-2">
        <InquiryQuoteStatusDisplay record={record} />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">
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
