'use client';

import { Search, FileCheck, ClipboardCheck, RefreshCw } from 'lucide-react';
import { StatChip } from './StatChip';
import type { InquiryOrderMonthStats, TrendSource } from '../hooks/useInquiryOrderStats';

interface InquiryOrderStatsProps {
  visible: boolean;
  loading: boolean;
  month: InquiryOrderMonthStats;
  /** 当前展示哪张表的数据——决定询价/已报价/订单跳转到询报价登记表还是采购部登记表 */
  source: TrendSource;
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * 首页「本月」询价/已报价/订单统计徽标行。原来同时有「本周」+「本月」两组、中间一道竖分隔线，
 * 用户反馈"本周"参考价值不大，2026-07-10 改成只保留「本月」一组；顺带把呈现方式优化成
 * 浅底色圆角标签 + 更宽松的间距，不再是两组数字挤在一起的样子（见 CODEX_TASKS.md）。
 * 数据随首页趋势图 tab 切换（询价订单统计图 / 采购部询价订单统计图）联动，不是固定读询报价登记表——
 * 见调用方 `DashboardPage.tsx` 如何根据当前激活的趋势图 tab 选择 inquiry/purchase 两组统计结果传入。
 * 仅在用户拥有对应权限时渲染（由调用方通过 `visible` 控制，不在这里读权限）。
 */
export function InquiryOrderStats({
  visible,
  loading,
  month,
  source,
  onRefresh,
  refreshing,
}: InquiryOrderStatsProps) {
  if (!visible) return null;

  const inquiryPath = source === 'purchase' ? '/purchase-registration' : '/inquiry';
  const orderPath = source === 'purchase' ? '/purchase-order-table' : '/order';

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3">
      <span className="mr-1 shrink-0 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold tracking-wide text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
        本月
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700/50"
        title={refreshing ? '正在刷新' : '刷新统计'}
        aria-label={refreshing ? '正在刷新统计' : '刷新统计'}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
      <StatChip icon={Search} label="询价" value={month.inquiryCount} colorClass="text-pink-500 dark:text-pink-400" path={inquiryPath} loading={loading} />
      <StatChip icon={FileCheck} label="已报价" value={month.quotedCount} colorClass="text-blue-600 dark:text-blue-400" path={inquiryPath} loading={loading} />
      <StatChip icon={ClipboardCheck} label="订单" value={month.orderCount} colorClass="text-emerald-600 dark:text-emerald-400" path={orderPath} loading={loading} />
    </div>
  );
}
