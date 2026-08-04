import { createElement } from 'react';
import { act, render, renderHook, screen, within } from '@testing-library/react';
import { InquiryFilterBar } from '../../components/InquiryFilterBar';
import type { InquiryRecord } from '../../types';
import {
  matchesQuoteStatus,
  type QuoteStatusFilter,
  useInquiryFilter,
} from '../useInquiryFilter';

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

const quoteStatusCases: Array<[
  QuoteStatusFilter,
  Partial<InquiryRecord>,
  boolean,
]> = [
  ['customer_quoted', {
    quotedStatuses: [{
      id: 'quoted', quoteDate: '[7.1]', supplierShortName: '', version: '', type: 'quoted',
    }],
  }, true],
  ['unavailable', {
    quotedStatuses: [{
      id: 'closed', quoteDate: '[7.1]', supplierShortName: '', version: '', type: 'closed',
    }],
  }, true],
  ['has_order', { orderNo: 'ORDER-1' }, true],
  ['cancelled', { orderSubStatus: 'cancelled' }, true],
  ['followup', { orderSubStatus: 'followup' }, true],
];

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

describe('useInquiryFilter quote status', () => {
  it('counts a supplemented-only record in both the 未报价 table and badge', () => {
    const records = [
      createRecord('supplemented', {
        quotedStatuses: [{
          id: 'supplemented-status',
          quoteDate: '[6.30]',
          supplierShortName: '',
          version: '',
          type: 'supplemented',
        }],
      }),
      createRecord('quoted', {
        quotedStatuses: [{
          id: 'quoted-status',
          quoteDate: '[7.1]',
          supplierShortName: '',
          version: '',
          type: 'quoted',
        }],
      }),
    ];
    const { result } = renderHook(() => useInquiryFilter(records));

    act(() => {
      result.current.setFilter({
        ...result.current.filter,
        timeRange: 'all',
        quoteStatus: 'customer_pending',
      });
    });

    expect(result.current.filteredAndSorted.map((record) => record.id)).toEqual(['supplemented']);
    expect(matchesQuoteStatus(records[0], 'customer_quoted')).toBe(false);

    render(createElement(InquiryFilterBar, {
      filter: result.current.filter,
      setFilter: jest.fn(),
      inquirers: result.current.inquirers,
      activeCount: result.current.activeCount,
      onReset: jest.fn(),
      records: result.current.baseFiltered,
      filteredCount: result.current.filteredAndSorted.length,
    }));

    const pendingChip = screen.getByRole('button', { name: /未报价/ });
    expect(within(pendingChip).getByText('1')).toBeInTheDocument();
  });

  it.each(quoteStatusCases)('preserves the existing %s predicate', (status, overrides, expected) => {
    expect(matchesQuoteStatus(createRecord(status, overrides), status)).toBe(expected);
  });
});
