'use client';

import { Search, FileCheck, ClipboardCheck } from 'lucide-react';
import { StatChip } from './StatChip';
import type { InquiryOrderTodayStats, InquiryOrderMonthStats } from '../hooks/useInquiryOrderStats';

interface InquiryOrderStatsProps {
  visible: boolean;
  loading: boolean;
  today: InquiryOrderTodayStats;
  month: InquiryOrderMonthStats;
  /** 上方是否已经有 StatsCards 的「今日」行——决定要不要画顶部分隔线 */
  showTopDivider?: boolean;
}

/**
 * 「今日新增」+「本月累计」询价/已报价/订单，合并成一行紧凑徽标，中间用一道竖分隔线区分两组
 * （原来是两个各自独立的满宽长条盒子堆在 StatsCards 下面，用户反馈"堆一起了"，改成跟
 * StatsCards 共用同一个外壳、同一套 chip 样式，见 TASK-110 追加调整）。
 * 仅在用户拥有 inquiry 模块权限时渲染（由调用方通过 `visible` 控制，不在这里读权限）。
 */
export function InquiryOrderStats({ visible, loading, today, month, showTopDivider = true }: InquiryOrderStatsProps) {
  if (!visible) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-0.5 gap-y-1 px-3 py-2.5 ${
        showTopDivider ? 'border-t border-gray-100 dark:border-gray-700' : ''
      }`}
    >
      <span className="mr-1 shrink-0 text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500">
        今日
      </span>
      <StatChip icon={Search} label="询价" value={today.inquiryCount} colorClass="text-pink-500 dark:text-pink-400" path="/inquiry" loading={loading} />
      <StatChip icon={FileCheck} label="已报价" value={today.quotedCount} colorClass="text-blue-600 dark:text-blue-400" path="/inquiry" loading={loading} />
      <StatChip icon={ClipboardCheck} label="订单" value={today.orderCount} colorClass="text-emerald-600 dark:text-emerald-400" path="/order" loading={loading} />

      <div className="mx-2 hidden h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-700 sm:block" />

      <span className="mr-1 shrink-0 text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500">
        本月
      </span>
      <StatChip icon={Search} label="询价" value={month.inquiryCount} colorClass="text-pink-500 dark:text-pink-400" path="/inquiry" loading={loading} />
      <StatChip icon={ClipboardCheck} label="订单" value={month.orderCount} colorClass="text-emerald-600 dark:text-emerald-400" path="/order" loading={loading} />
    </div>
  );
}
