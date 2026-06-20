'use client';

import { Edit2, Trash2 } from 'lucide-react';
import type { InquiryRecord } from '../types';
import { getRecordColorState, stripDateBrackets } from '../utils/inquiryUtils';
import { InquiryQuoteStatus } from './InquiryQuoteStatus';

interface InquiryRowProps {
  record: InquiryRecord;
  onEdit: (record: InquiryRecord) => void;
  onDelete: (recordId: string) => void;
}

export function InquiryRow({ record, onEdit, onDelete }: InquiryRowProps) {
  const mainColorClass = getRecordColorState(record);
  const mainTextClass = `${mainColorClass} font-medium`;

  return (
    <tr className="group border-b border-gray-100 align-top last:border-b-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/40">
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <span className={mainTextClass}>{stripDateBrackets(record.inquiryDate)}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <div className="inline-flex items-center gap-1">
          <span className={mainTextClass}>{record.inquiryNo}</span>
          <button
            type="button"
            onClick={() => onEdit(record)}
            className="rounded p-1 text-gray-400 opacity-0 hover:text-blue-600 group-hover:opacity-100 dark:hover:text-blue-400"
            aria-label={`编辑 ${record.inquiryNo}`}
            title="编辑基本信息"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <span className={mainTextClass}>{record.inquirer}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <span className={mainTextClass}>{record.customerNo}</span>
      </td>
      <td className="min-w-[220px] px-3 py-4 text-sm">
        <p className={`max-w-[320px] whitespace-pre-wrap break-words ${mainTextClass}`}>
          {record.description}
        </p>
      </td>
      <td className="min-w-[360px] px-3 py-4">
        <InquiryQuoteStatus record={record} />
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-right">
        <button
          type="button"
          onClick={() => onDelete(record.id)}
          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          aria-label={`删除 ${record.inquiryNo}`}
          title="删除整行"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
