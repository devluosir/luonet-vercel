'use client';

import { useRouter } from 'next/navigation';
import { Search, FileCheck, ClipboardCheck, type LucideIcon } from 'lucide-react';
import type { InquiryOrderTodayStats, InquiryOrderMonthStats } from '../hooks/useInquiryOrderStats';

interface StatRowItem {
  key: string;
  label: string;
  value: number;
  icon: LucideIcon;
  textColorClass: string;
  path: string;
}

interface InquiryOrderStatsProps {
  visible: boolean;
  loading: boolean;
  today: InquiryOrderTodayStats;
  month: InquiryOrderMonthStats;
}

function StatRow({ tag, items, loading }: { tag: string; items: StatRowItem[]; loading: boolean }) {
  const router = useRouter();

  return (
    <div className="mb-2 flex items-stretch overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex shrink-0 items-center border-r border-gray-100 px-3 dark:border-gray-700">
        <span className="text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500">
          {tag}
        </span>
      </div>

      {items.map(({ key, label, value, icon: Icon, textColorClass, path }, index) => (
        <button
          key={key}
          type="button"
          onClick={() => router.push(path)}
          className={`group flex flex-1 items-center gap-2 px-3 py-3 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:hover:bg-gray-700/40 ${
            index > 0 ? 'border-l border-gray-100 dark:border-gray-700' : ''
          }`}
          title={`查看${label}`}
        >
          <Icon className={`h-4 w-4 shrink-0 ${textColorClass}`} />
          <span className="hidden truncate text-xs text-gray-500 dark:text-gray-400 sm:block">
            {label}
          </span>
          <span className={`ml-auto font-bold tabular-nums text-lg leading-none ${textColorClass}`}>
            {loading ? (
              <span className="inline-block h-5 w-7 animate-pulse rounded bg-gray-200 align-middle dark:bg-gray-700" />
            ) : (
              value
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * 首页「询价/已报价/订单」统计——当天新增 + 当月累计两行。
 * 仅在用户拥有 inquiry 模块权限时渲染（由调用方通过 `visible` 控制，不在这里读权限）。
 */
export function InquiryOrderStats({ visible, loading, today, month }: InquiryOrderStatsProps) {
  if (!visible) return null;

  const todayItems: StatRowItem[] = [
    { key: 'today-inquiry', label: '询价', value: today.inquiryCount, icon: Search, textColorClass: 'text-pink-500 dark:text-pink-400', path: '/inquiry' },
    { key: 'today-quoted', label: '已报价', value: today.quotedCount, icon: FileCheck, textColorClass: 'text-blue-600 dark:text-blue-400', path: '/inquiry' },
    { key: 'today-order', label: '订单', value: today.orderCount, icon: ClipboardCheck, textColorClass: 'text-emerald-600 dark:text-emerald-400', path: '/order' },
  ];

  const monthItems: StatRowItem[] = [
    { key: 'month-inquiry', label: '询价', value: month.inquiryCount, icon: Search, textColorClass: 'text-pink-500 dark:text-pink-400', path: '/inquiry' },
    { key: 'month-order', label: '订单', value: month.orderCount, icon: ClipboardCheck, textColorClass: 'text-emerald-600 dark:text-emerald-400', path: '/order' },
  ];

  return (
    <div className="mb-4">
      <StatRow tag="今日" items={todayItems} loading={loading} />
      <StatRow tag="本月" items={monthItems} loading={loading} />
    </div>
  );
}
