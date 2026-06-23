'use client';

import { Trash2 } from 'lucide-react';
import type { InquiryRecord } from '../types';
import { getRecordColorState, stripDateBrackets } from '../utils/inquiryUtils';
import { InquiryQuoteStatusDisplay } from './InquiryQuoteStatusDisplay';

interface InquiryRowProps {
  record: InquiryRecord;
  onEdit: (record: InquiryRecord) => void;
  onDelete: (recordId: string) => void;
  isAdmin?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function InquiryRow({
  record,
  onEdit,
  onDelete,
  isAdmin = false,
  selected = false,
  onToggleSelect,
}: InquiryRowProps) {
  const mainColorClass = getRecordColorState(record);
  const mainTextClass = `${mainColorClass} font-medium`;

  return (
    <tr
      className={`group cursor-pointer border-b border-gray-100 align-middle last:border-b-0 dark:border-gray-800 ${
        selected
          ? 'bg-blue-50 dark:bg-blue-950/20'
          : 'hover:bg-gray-50/70 dark:hover:bg-gray-800/40'
      }`}
      onClick={() => onEdit(record)}
    >
      {/* 管理员批量选择 checkbox */}
      {isAdmin && (
        <td
          className="w-8 px-2 py-2 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(record.id)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-blue-600 dark:border-gray-600"
            aria-label={`选择 ${record.inquiryNo}`}
          />
        </td>
      )}

      <td className="overflow-hidden px-2 py-2 text-sm md:px-3">
        <div className="flex min-w-0 flex-col gap-0 leading-tight">
          <span className={`block truncate font-mono leading-4 ${mainTextClass}`}>
            {record.inquiryNo}
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-gray-400 dark:text-gray-500">
            <span className="shrink-0">{stripDateBrackets(record.inquiryDate)}</span>
            {record.orderNo && (
              <span className="inline-flex min-w-0 items-center truncate rounded-full bg-green-50 px-1.5 py-0 text-[11px] font-medium leading-4 text-green-700 ring-1 ring-green-200 dark:bg-green-950/40 dark:text-green-400 dark:ring-green-800">
                {record.orderNo}
              </span>
            )}
          </span>
        </div>
      </td>
      <td className="hidden overflow-hidden px-3 py-2 text-sm md:table-cell">
        <span className={`block truncate ${mainTextClass}`}>{record.inquirer}</span>
      </td>
      <td className="hidden overflow-hidden px-3 py-2 text-sm lg:table-cell">
        <span
          className={`line-clamp-2 max-w-full break-words leading-4 ${mainTextClass}`}
          title={record.customerNo}
        >
          {record.customerNo}
        </span>
      </td>
      <td className="overflow-hidden px-2 py-2 text-sm md:px-3">
        <p className={`hidden max-w-full truncate lg:block ${mainTextClass}`} title={record.description}>
          {record.description}
        </p>
        <p className={`max-w-full truncate lg:hidden ${mainTextClass}`} title={record.description?.trim() || record.customerNo}>
          {record.description?.trim() || record.customerNo}
        </p>
      </td>
      <td className="overflow-hidden px-2 py-2 md:px-3">
        <InquiryQuoteStatusDisplay record={record} />
      </td>
      <td className="overflow-hidden whitespace-nowrap px-1 py-2 text-right md:px-3">
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
