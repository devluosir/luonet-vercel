import type { InquiryRecord } from '@/features/inquiry/types';
import { getDateInputValueFromInquiryNo } from '@/features/inquiry/utils/inquiryUtils';
import type { CustomerTimelineEvent } from '../types';

export interface InquiryQuoteStatusBadge {
  label: '未报价' | '已报价' | '无法报价' | '已成单' | '已辙销' | '已悬挂' | '善后';
  className: string;
}

export function getInquiryQuoteStatusBadge(record: InquiryRecord): InquiryQuoteStatusBadge {
  if (record.orderSubStatus === 'cancelled') {
    return { label: '已辙销', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' };
  }
  if (record.orderSubStatus === 'suspended') {
    return { label: '已悬挂', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' };
  }
  if (record.orderSubStatus === 'followup') {
    return { label: '善后', className: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' };
  }
  if (record.orderNo?.trim()) {
    return { label: '已成单', className: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' };
  }
  if (record.quotedStatuses.some((status) => status.type === 'unavailable' || status.type === 'closed')) {
    return { label: '无法报价', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' };
  }
  if (record.quotedStatuses.some((status) => !status.type || status.type === 'quoted')) {
    return { label: '已报价', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' };
  }
  return { label: '未报价', className: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300' };
}

function buildInquiryActivityDescription(record: InquiryRecord): string {
  const description = record.description || `客户询价编号：${record.customerNo}`;
  const remark = record.orderSubStatusRemark?.trim();
  if (!record.orderSubStatus || !remark) return description;
  return `${description}｜${remark}`;
}

export function buildInquiryTimelineEvents(
  customerId: string,
  inquiryRecords: InquiryRecord[],
  options: {
    contactIds?: string[];
    inquirerAliases?: string[];
  } = {}
): CustomerTimelineEvent[] {
  const contactIdSet = new Set((options.contactIds ?? []).filter(Boolean));
  const inquirerAliasSet = new Set((options.inquirerAliases ?? []).filter(Boolean));

  return inquiryRecords
    .filter((record) => {
      if (record.customerId) return record.customerId === customerId;
      if (record.contactId && contactIdSet.has(record.contactId)) return true;
      return Boolean(record.inquirer && inquirerAliasSet.has(record.inquirer));
    })
    .map((record) => ({
      id: `inquiry-${record.id}`,
      customerId,
      type: 'inquiry' as const,
      title: record.inquiryNo,
      description: buildInquiryActivityDescription(record),
      date: getDateInputValueFromInquiryNo(record.inquiryNo) || record.inquiryDate,
      status: record.orderSubStatus === 'cancelled'
        ? 'cancelled' as const
        : record.orderNo?.trim()
          ? 'completed' as const
          : 'pending' as const,
      documentId: record.id,
      documentNo: record.inquiryNo,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
