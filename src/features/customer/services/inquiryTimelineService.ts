import type { InquiryRecord } from '@/features/inquiry/types';
import { getDateInputValueFromInquiryNo } from '@/features/inquiry/utils/inquiryUtils';
import type { CustomerTimelineEvent } from '../types';

export interface InquiryQuoteStatusBadge {
  label: '未报价' | '已报价' | '无法报价' | '已成单' | '已辙销';
  className: string;
}

export function getInquiryQuoteStatusBadge(record: InquiryRecord): InquiryQuoteStatusBadge {
  if (record.orderSubStatus === 'cancelled') {
    return { label: '已辙销', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' };
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

export function buildInquiryTimelineEvents(
  customerId: string,
  inquiryRecords: InquiryRecord[]
): CustomerTimelineEvent[] {
  return inquiryRecords
    .filter((record) => record.customerId === customerId)
    .map((record) => ({
      id: `inquiry-${record.id}`,
      customerId,
      type: 'inquiry' as const,
      title: `询价 ${record.inquiryNo}`,
      description: record.description || `询价人：${record.inquirer}`,
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
