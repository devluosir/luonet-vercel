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

  it('matches an inquirer name substring case-insensitively and tolerates empty names', () => {
    const records = [
      createRecord('one', { inquirer: 'Jacob Smith' }),
      createRecord('two', { inquirer: 'Alice' }),
      createRecord('three', { inquirer: '' }),
    ];

    expect(search(records, 'AcOb').map((record) => record.id)).toEqual(['one']);
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

describe('useInquiryFilter order status', () => {
  it('includes every record with an order number in 已成单 regardless of C/P/S sub-status', () => {
    const records = [
      createRecord('normal', { orderNo: 'ORDER-NORMAL' }),
      createRecord('suspended', { orderNo: 'ORDER-P', orderSubStatus: 'suspended' }),
      createRecord('cancelled', { orderNo: 'ORDER-C', orderSubStatus: 'cancelled' }),
      createRecord('followup', { orderNo: 'ORDER-S', orderSubStatus: 'followup' }),
      createRecord('blank', { orderNo: '   ', orderSubStatus: 'cancelled' }),
      createRecord('missing', { orderNo: undefined }),
    ];
    const { result } = renderHook(() => useInquiryFilter(records));

    act(() => {
      result.current.setFilter({
        ...result.current.filter,
        timeRange: 'all',
        quoteStatus: 'has_order',
      });
    });

    expect(result.current.filteredAndSorted.map((record) => record.id).sort()).toEqual([
      'cancelled',
      'followup',
      'normal',
      'suspended',
    ]);
  });
});
