import { useMemo, useState } from 'react';
import type { MonthTimeRange } from '@/components/MonthRangeNav';
import { todayMonth } from '@/components/MonthPickerPopover';
import type { InquiryRecord } from '../types';
import { getDateInputValueFromInquiryNo } from '../utils/inquiryUtils';

export type TimeRange = MonthTimeRange;

export type QuoteStatusFilter =
  | 'all'
  | 'supplier_pending'
  | 'customer_pending'
  | 'customer_quoted'
  | 'unavailable'
  | 'has_order'
  | 'cancelled'   // 辙销C
  | 'followup';   // 善后S

export type LinkStatusFilter = 'all' | 'unlinked';

/** “已成单”的统一口径：只要存在非空订单编号即可，C/P/S 仅作为可重叠的细分状态。 */
export function hasOrderNumber(record: Pick<InquiryRecord, 'orderNo'>): boolean {
  return Boolean(record.orderNo?.trim());
}

export interface InquiryFilterState {
  timeRange: TimeRange;
  customerNo: string;
  inquirer: string;
  customerId: string;
  contactId: string;
  associationLabel: string;
  quoteStatus: QuoteStatusFilter;
  linkStatus: LinkStatusFilter;
  sortDir: 'asc' | 'desc';
  keyword: string;
}

// 除 timeRange 外的默认值；timeRange 默认取"当月"，需要在每次挂载/重置时动态计算
// （不能写成模块级常量，否则跨月不刷新页面时会一直停留在旧月份），见 getDefaultFilter()
const DEFAULT_FILTER_BASE: Omit<InquiryFilterState, 'timeRange'> = {
  customerNo: '',
  inquirer: '',
  customerId: '',
  contactId: '',
  associationLabel: '',
  quoteStatus: 'all',
  linkStatus: 'all',
  sortDir: 'desc',
  keyword: '',
};

/** 默认筛选：当月（与月份导航器 MonthRangeNav 的 `month:YYYY-MM` 格式一致） */
function getDefaultFilter(): InquiryFilterState {
  return { ...DEFAULT_FILTER_BASE, timeRange: `month:${todayMonth()}` };
}

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
  const [filter, setFilter] = useState<InquiryFilterState>(getDefaultFilter);

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
          (record.customerNo ?? '').toLowerCase().includes(kw) ||
          (record.description ?? '').toLowerCase().includes(kw) ||
          (record.orderNo ?? '').toLowerCase().includes(kw);
        if (!hit) return false;
      }

      if (filter.customerNo && record.customerNo !== filter.customerNo) return false;
      if (filter.inquirer && record.inquirer !== filter.inquirer) return false;
      if (filter.customerId && record.customerId !== filter.customerId) return false;
      if (filter.contactId && record.contactId !== filter.contactId) return false;
      if (filter.linkStatus === 'unlinked' && record.customerId) return false;

      return true;
    });
  }, [
    filter.timeRange,
    filter.keyword,
    filter.customerNo,
    filter.inquirer,
    filter.customerId,
    filter.contactId,
    filter.linkStatus,
    records,
  ]);

  const filteredAndSorted = useMemo(() => {
    return baseFiltered
      .filter((record) => {
        // 防御性兜底：受限视图/异常数据可能缺失 quotedStatuses/supplierStatuses 字段
        const quotedStatuses = record.quotedStatuses ?? [];
        const supplierStatuses = record.supplierStatuses ?? [];
        switch (filter.quoteStatus) {
          case 'supplier_pending':
            return supplierStatuses.some(
              (s) => !s.status || s.status === 'pending'
            );
          case 'customer_pending':
            return quotedStatuses.every((s) => s.type === 'supplemented');
          case 'customer_quoted':
            return (
              !quotedStatuses.some(
                (s) => s.type === 'unavailable' || s.type === 'closed'
              ) && quotedStatuses.some((s) => !s.type || s.type === 'quoted')
            );
          case 'unavailable':
            return quotedStatuses.some(
              (s) => s.type === 'unavailable' || s.type === 'closed'
            );
          case 'has_order':
            return hasOrderNumber(record);
          case 'cancelled':
            return record.orderSubStatus === 'cancelled';
          case 'followup':
            return record.orderSubStatus === 'followup';
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

  // "当月"（`month:${todayMonth()}`）是默认值，不计入 activeCount
  const activeCount = [
    filter.timeRange !== `month:${todayMonth()}`,
    Boolean(filter.keyword.trim()),
    Boolean(filter.customerNo),
    Boolean(filter.inquirer),
    Boolean(filter.customerId || filter.contactId),
    filter.quoteStatus !== 'all',
    filter.linkStatus !== 'all',
  ].filter(Boolean).length;

  const reset = () => setFilter(getDefaultFilter());

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
