import type { InquiryRecord } from '@/features/inquiry';
import type { Customer, CustomerCategory } from '../../types';

// inquiryStats also contains date helpers that load nanoid's browser-only ESM build.
// This suite exercises only the customer aggregation helpers, so isolate that unrelated dependency.
jest.mock('@/features/inquiry/utils/inquiryUtils', () => ({
  getDateInputValueFromInquiryNo: jest.fn(),
  dateInputToDate: jest.fn(),
  stripDateBrackets: jest.fn(),
}));

import {
  buildCustomerCategoryData,
  buildCustomerRanking,
} from '../CustomerStatsPanel';

function makeCustomer(
  id: string,
  name: string,
  category?: CustomerCategory,
  shortName?: string
): Customer {
  return {
    id,
    type: 'customer',
    name,
    shortName,
    address: '',
    contacts: [],
    category,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeRecord(
  id: string,
  customerId: string,
  options: { quoted?: boolean; order?: boolean; deleted?: boolean } = {}
): InquiryRecord {
  return {
    id,
    inquiryDate: '2026-07-01',
    inquiryNo: `2026-${id}`,
    inquirer: 'tester',
    customerNo: id,
    customerId,
    description: '',
    orderNo: options.order ? `ORDER-${id}` : undefined,
    supplierStatuses: [],
    quotedStatuses: options.quoted
      ? [{ id: `quote-${id}`, quoteDate: '7.1', supplierShortName: 'S', version: 'A', type: 'quoted' }]
      : [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    status: options.deleted ? 'deleted' : 'active',
  };
}

describe('CustomerStatsPanel helpers', () => {
  it('builds a top-10 ranking, skips deleted and unresolved records, and prefers short names', () => {
    const customers = Array.from({ length: 11 }, (_, index) =>
      makeCustomer(`c${index + 1}`, `Customer ${index + 1}`, undefined, index === 0 ? '客户一' : undefined)
    );
    const records = customers.map((customer, index) =>
      makeRecord(`base-${index}`, customer.id, { quoted: index === 0, order: index === 0 })
    );
    records.push(
      makeRecord('extra-1', 'c1', { quoted: true }),
      makeRecord('extra-2', 'c1', { order: true }),
      makeRecord('deleted', 'c1', { deleted: true }),
      makeRecord('unknown', 'missing-customer', { quoted: true, order: true })
    );

    const ranking = buildCustomerRanking(customers, records);

    expect(ranking).toHaveLength(10);
    expect(ranking[0]).toEqual({
      customerId: 'c1',
      name: '客户一',
      inquiryCount: 3,
      quotedCount: 2,
      orderCount: 2,
    });
    expect(ranking.some((item) => item.customerId === 'missing-customer')).toBe(false);
  });

  it('normalizes missing categories to New and preserves all five category totals', () => {
    const customers = [
      makeCustomer('a', 'A', 'A'),
      makeCustomer('b', 'B', 'B'),
      makeCustomer('c', 'C', 'C'),
      makeCustomer('new', 'New', 'New'),
      makeCustomer('missing', 'Missing'),
      makeCustomer('blacklist', 'Blacklist', 'Blacklist'),
    ];

    const categories = buildCustomerCategoryData(customers);
    const counts = Object.fromEntries(categories.map((item) => [item.key, item.count]));

    expect(categories).toHaveLength(5);
    expect(counts).toEqual({ A: 1, B: 1, C: 1, New: 2, Blacklist: 1 });
    expect(categories.reduce((total, item) => total + item.count, 0)).toBe(customers.length);
  });

  it('sorts the ranking by quoted and order metrics independently', () => {
    const customers = [
      makeCustomer('c1', '询价领先'),
      makeCustomer('c2', '报价领先'),
      makeCustomer('c3', '订单领先'),
    ];
    const records = [
      ...Array.from({ length: 4 }, (_, index) => makeRecord(`c1-${index}`, 'c1', { quoted: index === 0 })),
      ...Array.from({ length: 3 }, (_, index) => makeRecord(`c2-${index}`, 'c2', { quoted: true, order: index === 0 })),
      ...Array.from({ length: 2 }, (_, index) => makeRecord(`c3-${index}`, 'c3', { quoted: index === 0, order: true })),
    ];

    const quotedRanking = buildCustomerRanking(customers, records, 'quoted');
    const orderRanking = buildCustomerRanking(customers, records, 'order');

    expect(quotedRanking.map((item) => item.customerId)).toEqual(['c2', 'c1', 'c3']);
    expect(orderRanking.map((item) => item.customerId)).toEqual(['c3', 'c2', 'c1']);
  });
});
