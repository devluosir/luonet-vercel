import type { InquiryRecord } from '@/features/inquiry/types';

jest.mock('@/features/inquiry/utils/inquiryUtils', () => ({
  getDateInputValueFromInquiryNo: jest.fn(() => '2026-05-19'),
}));

import {
  buildInquiryTimelineEvents,
  getInquiryQuoteStatusBadge,
} from '../services/inquiryTimelineService';

function createInquiryRecord(overrides: Partial<InquiryRecord> = {}): InquiryRecord {
  return {
    id: 'inq-1',
    inquiryDate: '[5.19]',
    inquiryNo: 'C260519F',
    inquirer: '客户-主',
    customerNo: '叉车轴承',
    customerId: 'customer-1',
    contactId: 'contact-1',
    description: '轴承2项',
    orderNo: 'FL2671',
    supplierStatuses: [],
    quotedStatuses: [],
    createdAt: '2026-05-19T00:00:00.000Z',
    updatedAt: '2026-05-19T00:00:00.000Z',
    ...overrides,
  };
}

describe('inquiryTimelineService', () => {
  it('shows dedicated badges for order sub statuses', () => {
    expect(getInquiryQuoteStatusBadge(createInquiryRecord({ orderSubStatus: 'cancelled' })).label).toBe('已辙销');
    expect(getInquiryQuoteStatusBadge(createInquiryRecord({ orderSubStatus: 'suspended' })).label).toBe('已悬挂');
    expect(getInquiryQuoteStatusBadge(createInquiryRecord({ orderSubStatus: 'followup' })).label).toBe('善后');
  });

  it('includes order sub status remark in customer activity description', () => {
    const events = buildInquiryTimelineEvents('customer-1', [
      createInquiryRecord({
        orderSubStatus: 'followup',
        orderSubStatusRemark: '客户要求先等现场确认',
      }),
    ]);

    expect(events).toHaveLength(1);
    expect(events[0].description).toBe('轴承2项｜客户要求先等现场确认');
  });
});
