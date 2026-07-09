import { useEffect, useMemo, useState } from 'react';
import { useInquiryStore } from '@/features/inquiry';
import type { InquiryRecord } from '@/features/inquiry';
import {
  countInquiriesOn,
  countInquiriesInMonth,
  countQuotedOn,
  countOrdersOn,
  countOrdersInMonth,
  buildTrendData,
  type Granularity,
  type TrendPoint,
} from '../utils/inquiryStats';

export interface InquiryOrderTodayStats {
  inquiryCount: number;
  quotedCount: number;
  orderCount: number;
}

export interface InquiryOrderMonthStats {
  inquiryCount: number;
  orderCount: number;
}

/**
 * 首页「询价/已报价/订单」统计 + 趋势图数据源。
 * 直接读 useInquiryStore 的本地 records 现算，不做服务端聚合（见 TASK-110 非目标）。
 */
export function useInquiryOrderStats(enabled: boolean, granularity: Granularity) {
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

  const today: InquiryOrderTodayStats = useMemo(() => {
    if (!enabled || !mounted) return { inquiryCount: 0, quotedCount: 0, orderCount: 0 };
    const now = new Date();
    return {
      inquiryCount: countInquiriesOn(activeRecords, now),
      quotedCount: countQuotedOn(activeRecords, now),
      orderCount: countOrdersOn(activeRecords, now),
    };
  }, [activeRecords, enabled, mounted]);

  const month: InquiryOrderMonthStats = useMemo(() => {
    if (!enabled || !mounted) return { inquiryCount: 0, orderCount: 0 };
    const now = new Date();
    return {
      inquiryCount: countInquiriesInMonth(activeRecords, now),
      orderCount: countOrdersInMonth(activeRecords, now),
    };
  }, [activeRecords, enabled, mounted]);

  const trend: TrendPoint[] = useMemo(() => {
    if (!enabled || !mounted) return [];
    return buildTrendData(activeRecords, granularity);
  }, [activeRecords, enabled, mounted, granularity]);

  return { today, month, trend, mounted };
}
