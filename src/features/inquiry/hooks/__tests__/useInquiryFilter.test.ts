import { act, renderHook } from '@testing-library/react';
import type { InquiryRecord } from '../../types';
import { useInquiryFilter } from '../useInquiryFilter';

jest.mock('../../utils/inquiryUtils', () => ({
  getDateInputValueFromInquiryNo: () => '2026-07-12',
}));

function createRecord(id: string, overrides: Partial<InquiryRecord> = {}): InquiryRecord {
  return {
    id,
    inquiryDate: '2026-07-12',
    inquiryNo: `RFQ-${id}`,
    inquirer: '测试客户',
    customerNo: `CUSTOMER-${id}`,
    description: `DESCRIPTION-${id}`,
    supplierStatuses: [],
    quotedStatuses: [],
    createdAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z',
    ...overrides,
  };
}

function search(records: InquiryRecord[], keyword: string): InquiryRecord[] {
  const { result } = renderHook(() => useInquiryFilter(records));

  act(() => {
    result.current.setFilter({
      ...result.current.filter,
      timeRange: 'all',
      keyword,
    });
  });

  return result.current.filteredAndSorted;
}

describe('useInquiryFilter keyword search', () => {
  it('matches an order number substring case-insensitively and tolerates missing order numbers', () => {
    const records = [
      createRecord('one', { orderNo: 'FL-ABC-152' }),
      createRecord('two', { orderNo: 'OTHER-ORDER' }),
      createRecord('three', { orderNo: undefined }),
    ];

    expect(search(records, 'abc-15').map((record) => record.id)).toEqual(['one']);
  });

  it.each([
    ['inquiry number', 'rfq-target'],
    ['customer number', 'customer-target'],
    ['description', 'description-target'],
  ])('keeps matching by %s', (_label, keyword) => {
    const records = [createRecord('target'), createRecord('other')];

    expect(search(records, keyword).map((record) => record.id)).toEqual(['target']);
  });
});
