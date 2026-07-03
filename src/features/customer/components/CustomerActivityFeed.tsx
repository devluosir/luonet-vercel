'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { buildCustomerContactLabel } from '@/features/customer/components/CustomerContactPicker';
import type { Customer } from '@/features/customer/types';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import { inquiryService } from '@/features/inquiry/services/inquiry.service';
import type { CustomerQuoteStatus, InquiryBasicInput, InquiryRecord, OrderSubStatus, SupplierQuoteStatus } from '@/features/inquiry/types';
import { InquiryFormModal } from '@/features/inquiry/components/InquiryFormModal';
import {
  buildInquiryActivityDescription,
  buildInquiryTimelineEvents,
  getInquiryQuoteStatusBadge,
  type InquiryActivityDescription,
  type InquiryQuoteStatusBadge,
} from '../services/inquiryTimelineService';

interface CustomerActivityFeedProps {
  customer: Customer;
}

interface ActivityItem {
  id: string;
  title: string;
  displayNo: string;
  description?: string;
  descriptionParts?: InquiryActivityDescription;
  relatedInquiry?: InquiryRecord;
  badge?: InquiryQuoteStatusBadge;
}

const ORDER_SUB_STATUS_FILTERS: Array<{
  value: OrderSubStatus;
  label: string;
  className: string;
  activeClassName: string;
}> = [
  {
    value: 'cancelled',
    label: '已辙销',
    className: 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30',
    activeClassName: 'border-red-500 bg-red-500 text-white dark:border-red-500 dark:bg-red-500 dark:text-white',
  },
  {
    value: 'suspended',
    label: '已悬挂',
    className: 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-900/60 dark:text-green-300 dark:hover:bg-green-950/30',
    activeClassName: 'border-green-600 bg-green-600 text-white dark:border-green-600 dark:bg-green-600 dark:text-white',
  },
  {
    value: 'followup',
    label: '善后',
    className: 'border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300 dark:hover:bg-blue-950/30',
    activeClassName: 'border-blue-600 bg-blue-600 text-white dark:border-blue-600 dark:bg-blue-600 dark:text-white',
  },
];

function buildInquirerAliases(customer: Customer) {
  const aliases = new Set<string>();
  if (customer.shortName) aliases.add(customer.shortName);
  if (customer.code) aliases.add(customer.code);
  if (customer.name) aliases.add(customer.name);
  for (const contact of customer.contacts) {
    aliases.add(buildCustomerContactLabel(customer, contact));
    if (customer.shortName && contact.shortName) {
      aliases.add(`${customer.shortName}-${contact.shortName}`);
    }
  }
  return Array.from(aliases);
}

export function CustomerActivityFeed({ customer }: CustomerActivityFeedProps) {
  const inquiryRecords = useInquiryStore((state) => state.records);
  const updateRecord = useInquiryStore((state) => state.updateRecord);
  const [editingInquiryRecord, setEditingInquiryRecord] = useState<InquiryRecord | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeSubStatusFilter, setActiveSubStatusFilter] = useState<OrderSubStatus | null>(null);

  const inquiryById = useMemo(
    () => new Map(inquiryRecords.map((record) => [record.id, record])),
    [inquiryRecords]
  );
  const contactIds = useMemo(
    () => customer.contacts.map((contact) => contact.id).filter(Boolean),
    [customer.contacts]
  );
  const inquirerAliases = useMemo(() => buildInquirerAliases(customer), [customer]);

  const syncInquiryRecords = useCallback(async () => {
    setIsSyncing(true);
    try {
      const d1Records = await inquiryService.pullFromD1();
      inquiryService.pushLocalToD1(d1Records);
      const merged = inquiryService.mergeFromD1(d1Records);
      useInquiryStore.setState({ records: merged });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    useInquiryStore.getState().init();
    void syncInquiryRecords();
  }, [customer.id, syncInquiryRecords]);

  const activities = useMemo<ActivityItem[]>(() => {
    return buildInquiryTimelineEvents(customer.id, inquiryRecords, { contactIds, inquirerAliases }).map((event) => {
      const relatedInquiry = event.documentId ? inquiryById.get(event.documentId) : undefined;
      const descriptionParts = relatedInquiry ? buildInquiryActivityDescription(relatedInquiry) : undefined;
      return {
        id: event.id,
        title: event.title,
        displayNo: relatedInquiry?.orderNo?.trim() || event.title,
        description: descriptionParts?.base ?? event.description,
        descriptionParts,
        relatedInquiry,
        badge: relatedInquiry ? getInquiryQuoteStatusBadge(relatedInquiry) : undefined,
      };
    });
  }, [contactIds, customer.id, inquirerAliases, inquiryById, inquiryRecords]);

  const subStatusCounts = useMemo(() => {
    const counts: Record<OrderSubStatus, number> = {
      cancelled: 0,
      suspended: 0,
      followup: 0,
    };
    for (const activity of activities) {
      const status = activity.relatedInquiry?.orderSubStatus;
      if (status) counts[status] += 1;
    }
    return counts;
  }, [activities]);

  useEffect(() => {
    if (activeSubStatusFilter && subStatusCounts[activeSubStatusFilter] === 0) {
      setActiveSubStatusFilter(null);
    }
  }, [activeSubStatusFilter, subStatusCounts]);

  const filteredActivities = useMemo(() => {
    if (!activeSubStatusFilter) return activities;
    return activities.filter((activity) => activity.relatedInquiry?.orderSubStatus === activeSubStatusFilter);
  }, [activeSubStatusFilter, activities]);

  const handleRefresh = () => {
    void syncInquiryRecords();
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
          <span className="text-xs text-gray-500 dark:text-gray-400">({filteredActivities.length} 条)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ORDER_SUB_STATUS_FILTERS.map((filter) => {
            const count = subStatusCounts[filter.value];
            if (count === 0) return null;
            const active = activeSubStatusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveSubStatusFilter((current) => (current === filter.value ? null : filter.value))}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active ? filter.activeClassName : filter.className
                }`}
              >
                <span>{filter.label}</span>
                <span>{count}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? '刷新中' : '刷新'}
          </button>
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-9 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <Calendar className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>暂无询价记录</p>
          <p className="mt-2 text-sm">点击&quot;刷新&quot;拉取最新询价记录。</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:flex-row md:items-center md:gap-3"
            >
              <span className="shrink-0 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                {activity.displayNo}
              </span>
              {activity.badge && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${activity.badge.className}`}>
                  {activity.badge.label}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-gray-600 dark:text-gray-400">
                {activity.descriptionParts ? (
                  <>
                    <span>{activity.descriptionParts.base}</span>
                    {activity.descriptionParts.remark && (
                      <span className={activity.descriptionParts.remarkClassName}>
                        ｜{activity.descriptionParts.remark}
                      </span>
                    )}
                  </>
                ) : (
                  activity.description
                )}
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
