import { useMemo, useState } from 'react';
import type { InquiryRecord } from '../types';
import { getDateInputValueFromInquiryNo } from '../utils/inquiryUtils';

export type TimeRange = 'all' | '7d' | '30d' | '90d' | '1y';
export type QuoteStatusFilter =
  | 'all'
  | 'supplier_pending'
  | 'customer_pending'
  | 'customer_quoted'
  | 'unavailable'
  | 'has_order';

export interface InquiryFilterState {
  timeRange: TimeRange;
  customerNo: string;
  inquirer: string;
  quoteStatus: QuoteStatusFilter;
  sortDir: 'asc' | 'desc';
  keyword: string;
}

const DEFAULT_FILTER: InquiryFilterState = {
  timeRange: 'all',
  customerNo: '',
  inquirer: '',
  quoteStatus: 'all',
  sortDir: 'desc',
  keyword: '',
};

const DAYS_IN_MS = 24 * 60 * 60 * 1000;

function getTimeRangeDays(timeRange: TimeRange): number {
  switch (timeRange) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '1y':
      return 365;
    default:
      return 0;
  }
}

export function useInquiryFilter(records: InquiryRecord[]) {
  const [filter, setFilter] = useState<InquiryFilterState>(DEFAULT_FILTER);

  const customers = useMemo(
    () => Array.from(new Set(records.map((record) => record.customerNo).filter(Boolean))).sort(),
    [records]
  );

  const inquirers = useMemo(
    () => Array.from(new Set(records.map((record) => record.inquirer).filter(Boolean))).sort(),
    [records]
  );

  const filteredAndSorted = useMemo(() => {
    const now = Date.now();

    return records
      .filter((record) => {
        if (filter.timeRange !== 'all') {
          const dateStr = getDateInputValueFromInquiryNo(record.inquiryNo);
          const recordTime = new Date(dateStr).getTime();
          const days = getTimeRangeDays(filter.timeRange);

          if (Number.isFinite(recordTime) && now - recordTime > days * DAYS_IN_MS) {
            return false;
          }
        }

        if (filter.keyword.trim()) {
          const keyword = filter.keyword.trim().toLowerCase();
          const matchesKeyword =
            record.inquiryNo.toLowerCase().includes(keyword) ||
            record.customerNo.toLowerCase().includes(keyword) ||
            (record.description ?? '').toLowerCase().includes(keyword);

          if (!matchesKeyword) return false;
        }

        if (filter.customerNo && record.customerNo !== filter.customerNo) return false;
        if (filter.inquirer && record.inquirer !== filter.inquirer) return false;

        switch (filter.quoteStatus) {
          case 'supplier_pending':
            return record.supplierStatuses.some(
              (supplier) => !supplier.status || supplier.status === 'pending'
            );
          case 'customer_pending':
            return record.quotedStatuses.length === 0;
          case 'customer_quoted':
            return (
              !record.quotedStatuses.some(
                (s) => s.type === 'unavailable' || s.type === 'closed'
              ) && record.quotedStatuses.some((s) => !s.type || s.type === 'quoted')
            );
          case 'unavailable':
            return record.quotedStatuses.some(
              (s) => s.type === 'unavailable' || s.type === 'closed'
            );
          case 'has_order':
            return Boolean(record.orderNo?.trim());
          default:
            return true;
        }
      })
      .sort((a, b) =>
        filter.sortDir === 'desc'
          ? b.inquiryNo.localeCompare(a.inquiryNo)
          : a.inquiryNo.localeCompare(b.inquiryNo)
      );
  }, [filter, records]);

  const activeCount = [
    filter.timeRange !== 'all',
    Boolean(filter.keyword.trim()),
    Boolean(filter.customerNo),
    Boolean(filter.inquirer),
    filter.quoteStatus !== 'all',
  ].filter(Boolean).length;

  const reset = () => setFilter(DEFAULT_FILTER);

  return {
    filter,
    setFilter,
    filteredAndSorted,
    customers,
    inquirers,
    activeCount,
    reset,
  };
}
