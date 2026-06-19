'use client';

import { useRouter } from 'next/navigation';
import {
  FileCheck,
  FileText,
  Package,
  Receipt,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';

interface StatItem {
  type: 'quotation' | 'confirmation' | 'invoice' | 'packing' | 'purchase';
  label: string;
  tag: string;
  icon: LucideIcon;
  textColorClass: string;
  dotClass: string;
}

export interface StatCounts {
  quotation: number;
  confirmation: number;
  invoice: number;
  packing: number;
  purchase: number;
}

interface StatsCardsProps {
  counts: StatCounts;
  loading?: boolean;
}

const STAT_ITEMS: StatItem[] = [
  {
    type: 'quotation',
    label: '报价单',
    tag: 'QTN',
    icon: FileText,
    textColorClass: 'text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500',
  },
  {
    type: 'confirmation',
    label: '销售确认',
    tag: 'SC',
    icon: FileCheck,
    textColorClass: 'text-green-600 dark:text-green-400',
    dotClass: 'bg-green-500',
  },
  {
    type: 'invoice',
    label: '财务发票',
    tag: 'INV',
    icon: Receipt,
    textColorClass: 'text-purple-600 dark:text-purple-400',
    dotClass: 'bg-purple-500',
  },
  {
    type: 'packing',
    label: '箱单发票',
    tag: 'PL',
    icon: Package,
    textColorClass: 'text-teal-600 dark:text-teal-400',
    dotClass: 'bg-teal-500',
  },
  {
    type: 'purchase',
    label: '采购订单',
    tag: 'PO',
    icon: ShoppingCart,
    textColorClass: 'text-orange-600 dark:text-orange-400',
    dotClass: 'bg-orange-500',
  },
];

export function StatsCards({ counts, loading = false }: StatsCardsProps) {
  const router = useRouter();

  return (
    <div className="mb-4 flex items-stretch overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* 左侧「今日」标签 */}
      <div className="flex shrink-0 items-center border-r border-gray-100 px-3 dark:border-gray-700">
        <span className="text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500">
          今日
        </span>
      </div>

      {/* 5 个统计项 */}
      {STAT_ITEMS.map(({ type, label, icon: Icon, textColorClass }, index) => (
        <button
          key={type}
          type="button"
          onClick={() => router.push(`/history?type=${type}&time=today`)}
          className={`group flex flex-1 items-center gap-2 px-3 py-3 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:hover:bg-gray-700/40 ${
            index > 0 ? 'border-l border-gray-100 dark:border-gray-700' : ''
          }`}
          title={`查看今日${label}`}
        >
          <Icon className={`h-4 w-4 shrink-0 ${textColorClass}`} />
          <span className="hidden truncate text-xs text-gray-500 dark:text-gray-400 sm:block">
            {label}
          </span>
          <span className={`ml-auto font-bold tabular-nums text-lg leading-none ${textColorClass}`}>
            {loading ? (
              <span className="inline-block h-5 w-7 animate-pulse rounded bg-gray-200 align-middle dark:bg-gray-700" />
            ) : (
              counts[type]
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
