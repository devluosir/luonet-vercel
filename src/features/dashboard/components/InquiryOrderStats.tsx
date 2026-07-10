'use client';

import { Search, FileCheck, ClipboardCheck } from 'lucide-react';
import { StatChip } from './StatChip';
import type { InquiryOrderWeekStats, InquiryOrderMonthStats, TrendSource } from '../hooks/useInquiryOrderStats';

interface InquiryOrderStatsProps {
  visible: boolean;
  loading: boolean;
  week: InquiryOrderWeekStats;
  month: InquiryOrderMonthStats;
  /** 当前展示哪张表的数据——决定询价/已报价/订单跳转到询报价登记表还是采购部登记表 */
  source: TrendSource;
}

/**
 * 「本周」+「本月」询价/已报价/订单，合并成一行紧凑徽标，中间用一道竖分隔线区分两组。
 * 数据随首页趋势图 tab 切换（询价订单统计图 / 采购部询价订单统计图）联动，不是固定读询报价登记表——
 * 见调用方 `DashboardPage.tsx` 如何根据当前激活的趋势图 tab 选择 inquiry/purchase 两组统计结果传入。
 * 仅在用户拥有对应权限时渲染（由调用方通过 `visible` 控制，不在这里读权限）。
 */
export function InquiryOrderStats({ visible, loading, week, month, source }: InquiryOrderStatsProps) {
  if (!visible) return null;

  const inquiryPath = source === 'purchase' ? '/purchase-registration' : '/inquiry';
  const orderPath = source === 'purchase' ? '/purchase-order-table' : '/order';

  return (
    <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 px-3 py-2.5">
      <span className="mr-1 shrink-0 text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500">
        本周
      </span>
      <StatChip icon={Search} label="询价" value={week.inquiryCount} colorClass="text-pink-500 dark:text-pink-400" path={inquiryPath} loading={loading} />
      <StatChip icon={FileCheck} label="已报价" value={week.quotedCount} colorClass="text-blue-600 dark:text-blue-400" path={inquiryPath} loading={loading} />
      <StatChip icon={ClipboardCheck} label="订单" value={week.orderCount} colorClass="text-emerald-600 dark:text-emerald-400" path={orderPath} loading={loading} />

      <div className="mx-2 hidden h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-700 sm:block" />

      <span className="mr-1 shrink-0 text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500">
        本月
      </span>
      <StatChip icon={Search} label="询价" value={month.inquiryCount} colorClass="text-pink-500 dark:text-pink-400" path={inquiryPath} loading={loading} />
      <StatChip icon={FileCheck} label="已报价" value={month.quotedCount} colorClass="text-blue-600 dark:text-blue-400" path={inquiryPath} loading={loading} />
      <StatChip icon={ClipboardCheck} label="订单" value={month.orderCount} colorClass="text-emerald-600 dark:text-emerald-400" path={orderPath} loading={loading} />
    </div>
  );
}
