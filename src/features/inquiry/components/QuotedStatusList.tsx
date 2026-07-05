'use client';

import { Fragment } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CustomerQuoteStatus } from '../types';
import { stripDateBrackets, type InquiryColorClass } from '../utils/inquiryUtils';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface QuotedStatusListProps {
  statuses: CustomerQuoteStatus[];
  colorClass: InquiryColorClass;
  onEditRequest: (status: CustomerQuoteStatus) => void;
  onAddRequest: () => void;
  onRemove: (statusId: string) => void;
}

export function QuotedStatusList({
  statuses,
  colorClass,
  onEditRequest,
  onAddRequest,
  onRemove,
}: QuotedStatusListProps) {
  const confirm = useConfirm();

  return (
    <Fragment>
      {statuses.map((status) => {
        const tagLabel = `${stripDateBrackets(status.quoteDate)} ${status.supplierShortName} ${status.version}`;

        return (
          <span
            key={status.id}
            className="inline-flex items-center rounded-full bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:ring-blue-900"
          >
            <button
              type="button"
              onClick={() => onEditRequest(status)}
              className={`max-w-[200px] truncate rounded-l-full px-2.5 py-1 text-xs font-medium hover:opacity-70 ${colorClass}`}
              title="编辑已报价状态"
            >
              {tagLabel}
            </button>
            <button
              type="button"
              onClick={async () => {
                const confirmed = await confirm({
                  title: '删除已报价状态',
                  description: `确定删除「${tagLabel}」吗？`,
                  confirmLabel: '删除',
                  variant: 'danger',
                });
                if (confirmed) onRemove(status.id);
              }}
              className="rounded-r-full border-l border-blue-100 px-1.5 py-1 text-gray-400 hover:text-red-500 dark:border-blue-900"
              title="删除"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        );
      })}

      <button
        type="button"
        onClick={onAddRequest}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-500 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
      >
        <Plus className="h-3 w-3" />
        已报价
      </button>
    </Fragment>
  );
}
