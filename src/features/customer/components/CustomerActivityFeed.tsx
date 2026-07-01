'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import type { CustomerQuoteStatus, InquiryBasicInput, InquiryRecord, SupplierQuoteStatus } from '@/features/inquiry/types';
import { InquiryFormModal } from '@/features/inquiry/components/InquiryFormModal';
import { buildInquiryTimelineEvents } from '../services/inquiryTimelineService';

interface CustomerActivityFeedProps {
  customerId: string;
  customerName: string;
}

interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  relatedInquiry?: InquiryRecord;
}

export function CustomerActivityFeed({ customerId }: CustomerActivityFeedProps) {
  const inquiryRecords = useInquiryStore((state) => state.records);
  const updateRecord = useInquiryStore((state) => state.updateRecord);
  const [editingInquiryRecord, setEditingInquiryRecord] = useState<InquiryRecord | null>(null);

  const inquiryById = useMemo(
    () => new Map(inquiryRecords.map((record) => [record.id, record])),
    [inquiryRecords]
  );

  useEffect(() => {
    useInquiryStore.getState().init();
  }, [customerId]);

  const activities = useMemo<ActivityItem[]>(() => {
    return buildInquiryTimelineEvents(customerId, inquiryRecords).map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      relatedInquiry: event.documentId ? inquiryById.get(event.documentId) : undefined,
    }));
  }, [customerId, inquiryRecords, inquiryById]);

  const handleRefresh = () => {
    useInquiryStore.getState().init();
  };

  const handleInquiryEditSubmit = (
    values: InquiryBasicInput,
    suppliers: SupplierQuoteStatus[],
    quoted: CustomerQuoteStatus[]
  ) => {
    if (!editingInquiryRecord) return;
    updateRecord(editingInquiryRecord.id, {
      ...values,
      supplierStatuses: suppliers,
      quotedStatuses: quoted,
    });
    setEditingInquiryRecord(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">活动列表</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">({activities.length} 条)</span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-9 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <Calendar className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>暂无询价记录</p>
          <p className="mt-2 text-sm">点击&quot;刷新&quot;拉取最新询价记录。</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:flex-row md:items-center md:gap-3"
            >
              <span className="shrink-0 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                {activity.title}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-gray-600 dark:text-gray-400">
                {activity.description}
              </span>
              {activity.relatedInquiry && (
                <button
                  type="button"
                  onClick={() => setEditingInquiryRecord(activity.relatedInquiry ?? null)}
                  className="shrink-0 self-start text-sm text-blue-600 hover:underline dark:text-blue-400 md:self-auto"
                >
                  详情
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editingInquiryRecord && (
        <InquiryFormModal
          isOpen
          mode="edit"
          record={editingInquiryRecord}
          existingRecords={inquiryRecords}
          onClose={() => setEditingInquiryRecord(null)}
          onSubmit={handleInquiryEditSubmit}
        />
      )}
    </div>
  );
}
