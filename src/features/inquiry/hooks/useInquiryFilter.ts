import { useMemo, useState } from 'react';
import type { InquiryRecord } from '../types';
import { getDateInputValueFromInquiryNo } from '../utils/inquiryUtils';

export type TimeRange =
  | 'all'          // 全部
  | 'this_month'   // 本月
  | 'last_month'   // 上月
  | '3months'      // 近3月（默认）
  | `month:${string}`; // 指定月份，格式 month:YYYY-MM

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
  timeRange: '3months', // 默认显示近3个月
  customerNo: '',
  inquirer: '',
  quoteStatus: 'all',
  sortDir: 'desc',
  keyword: '',
};

/** 判断记录是否落在指定时间范围内（月维度比较） */
function matchesTimeRange(record: InquiryRecord, timeRange: TimeRange, now: Date): boolean {
  if (timeRange === 'all') return true;

  const dateStr = getDateInputValueFromInquiryNo(record.inquiryNo);
  const recordDate = new Date(dateStr);
  if (!Number.isFinite(recordDate.getTime())) return true;

  const rYear = recordDate.getFullYear();
  const rMonth = recordDate.getMonth(); // 0-indexed
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();

  if (timeRange === 'this_month') {
    return rYear === nowYear && rMonth === nowMonth;
  }

  if (timeRange === 'last_month') {
    const lm = nowMonth === 0 ? 11 : nowMonth - 1;
    const ly = nowMonth === 0 ? nowYear - 1 : nowYear;
    return rYear === ly && rMonth === lm;
  }

  if (timeRange === '3months') {
    // 当前月 + 前两个月，例如 6月 → 4/5/6月
    let sm = nowMonth - 2;
    let sy = nowYear;
    if (sm < 0) { sm += 12; sy -= 1; }
    return recordDate >= new Date(sy, sm, 1);
  }

  // month:YYYY-MM
  if (timeRange.startsWith('month:')) {
    const parts = timeRange.slice(6).split('-');
    if (parts.length === 2) {
      const ty = Number(parts[0]);
      const tm = Number(parts[1]) - 1;
      return rYear === ty && rMonth === tm;
    }
  }

  return true;
}

export function useInquiryFilter(records: InquiryRecord[]) {
  const [filter, setFilter] = useState<InquiryFilterState>(DEFAULT_FILTER);

  const customers = useMemo(
    () => Array.from(new Set(records.map((r) => r.customerNo).filter(Boolean))).sort(),
    [records]
  );

  const inquirers = useMemo(
    () => Array.from(new Set(records.map((r) => r.inquirer).filter(Boolean))).sort(),
    [records]
  );

  /** 应用除状态外所有筛选条件 — 用于计算各状态角标数字 */
  const baseFiltered = useMemo(() => {
    const now = new Date();

    return records.filter((record) => {
      if (!matchesTimeRange(record, filter.timeRange, now)) return false;

      if (filter.keyword.trim()) {
        const kw = filter.keyword.trim().toLowerCase();
        const hit =
          record.inquiryNo.toLowerCase().includes(kw) ||
          record.customerNo.toLowerCase().includes(kw) ||
          (record.description ?? '').toLowerCase().includes(kw);
        if (!hit) return false;
      }

      if (filter.customerNo && record.customerNo !== filter.customerNo) return false;
      if (filter.inquirer && record.inquirer !== filter.inquirer) return false;

      return true;
    });
  }, [filter.timeRange, filter.keyword, filter.customerNo, filter.inquirer, records]);

  const filteredAndSorted = useMemo(() => {
    return baseFiltered
      .filter((record) => {
        switch (filter.quoteStatus) {
          case 'supplier_pending':
            return record.supplierStatuses.some(
              (s) => !s.status || s.status === 'pending'
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
  }, [baseFiltered, filter.quoteStatus, filter.sortDir]);

  // '3months' 是默认值，不计入 activeCount
  const activeCount = [
    filter.timeRange !== '3months',
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
    baseFiltered,
    customers,
    inquirers,
    activeCount,
    reset,
  };
}
