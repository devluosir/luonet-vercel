import { useEffect, useMemo, useState } from 'react';
import { useInquiryStore } from '@/features/inquiry';
import type { InquiryRecord } from '@/features/inquiry';
import {
  countInquiriesInMonth,
  countInquiriesInWeek,
  countQuotedInMonth,
  countQuotedInWeek,
  countOrdersInMonth,
  countOrdersInWeek,
  buildTrendData,
  type Granularity,
  type QuotedStatusField,
  type TrendPoint,
} from '../utils/inquiryStats';

export interface InquiryOrderWeekStats {
  inquiryCount: number;
  quotedCount: number;
  orderCount: number;
}

export interface InquiryOrderMonthStats {
  inquiryCount: number;
  quotedCount: number;
  orderCount: number;
}

/** 趋势图数据来源：inquiry=询报价登记表（客户视角已报价），purchase=采购部登记（供应商视角已报价，TASK-113） */
export type TrendSource = 'inquiry' | 'purchase';

/**
 * 首页「询价/已报价/订单」统计（本周 + 本月）+ 趋势图数据源。
 * 直接读 useInquiryStore 的本地 records 现算，不做服务端聚合（见 TASK-110 非目标）。
 * week/month/trend 三组数据全部按 source 切换已报价字段（quotedStatuses 客户视角 / purchaseQuotedStatuses
 * 供应商视角）——首页细化需求要求"本周/本月"统计跟着趋势图 tab 一起切换到对应的表（见后续调整记录）。
 */
export function useInquiryOrderStats(enabled: boolean, granularity: Granularity, source: TrendSource = 'inquiry') {
  const records = useInquiryStore((state) => state.records);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    useInquiryStore.getState().init();
  }, []);

  const activeRecords = useMemo(
    () => (records ?? []).filter((r: InquiryRecord) => r.status !== 'deleted'),
    [records]
  );

  const quotedStatusField: QuotedStatusField = source === 'purchase' ? 'purchaseQuotedStatuses' : 'quotedStatuses';

  const week: InquiryOrderWeekStats = useMemo(() => {
    if (!enabled || !mounted) return { inquiryCount: 0, quotedCount: 0, orderCount: 0 };
    const now = new Date();
    return {
      inquiryCount: countInquiriesInWeek(activeRecords, now),
      quotedCount: countQuotedInWeek(activeRecords, now, quotedStatusField),
      orderCount: countOrdersInWeek(activeRecords, now),
    };
  }, [activeRecords, enabled, mounted, quotedStatusField]);

  const month: InquiryOrderMonthStats = useMemo(() => {
    if (!enabled || !mounted) return { inquiryCount: 0, quotedCount: 0, orderCount: 0 };
    const now = new Date();
    return {
      inquiryCount: countInquiriesInMonth(activeRecords, now),
      quotedCount: countQuotedInMonth(activeRecords, now, quotedStatusField),
      orderCount: countOrdersInMonth(activeRecords, now),
    };
  }, [activeRecords, enabled, mounted, quotedStatusField]);

  const trend: TrendPoint[] = useMemo(() => {
    if (!enabled || !mounted) return [];
    return buildTrendData(activeRecords, granularity, quotedStatusField);
  }, [activeRecords, enabled, mounted, granularity, quotedStatusField]);

  return { week, month, trend, mounted };
}
