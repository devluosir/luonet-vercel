import type { InquiryRecord } from '@/features/inquiry/types';
import { getDateInputValueFromInquiryNo } from '@/features/inquiry/utils/inquiryUtils';
import type { CustomerTimelineEvent } from '../types';

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
