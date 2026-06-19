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
  colorClass: string;
  textColorClass: string;
  tagClass: string;
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
    colorClass: 'bg-blue-50 dark:bg-blue-900/20',
    textColorClass: 'text-blue-600 dark:text-blue-400',
    tagClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300',
  },
  {
    type: 'confirmation',
    label: '销售确认',
    tag: 'SC',
    icon: FileCheck,
    colorClass: 'bg-green-50 dark:bg-green-900/20',
    textColorClass: 'text-green-600 dark:text-green-400',
    tagClass: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300',
  },
  {
    type: 'invoice',
    label: '财务发票',
    tag: 'INV',
    icon: Receipt,
    colorClass: 'bg-purple-50 dark:bg-purple-900/20',
    textColorClass: 'text-purple-600 dark:text-purple-400',
    tagClass: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300',
  },
  {
    type: 'packing',
    label: '箱单发票',
    tag: 'PL',
    icon: Package,
    colorClass: 'bg-teal-50 dark:bg-teal-900/20',
    textColorClass: 'text-teal-600 dark:text-teal-400',
    tagClass: 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300',
  },
  {
    type: 'purchase',
    label: '采购订单',
    tag: 'PO',
    icon: ShoppingCart,
    colorClass: 'bg-orange-50 dark:bg-orange-900/20',
    textColorClass: 'text-orange-600 dark:text-orange-400',
    tagClass: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300',
  },
];

export function StatsCards({ counts, loading = false }: StatsCardsProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {STAT_ITEMS.map(({ type, label, tag, icon: Icon, colorClass, textColorClass, tagClass }) => (
        <button
          key={type}
          type="button"
          onClick={() => router.push(`/history?type=${type}&time=today`)}
          className={`${colorClass} rounded-xl p-4 text-left hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 dark:focus:ring-offset-gray-900`}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Icon className={`h-4 w-4 shrink-0 ${textColorClass}`} />
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</span>
          </div>
          {loading ? (
            <div className="h-8 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-2" />
          ) : (
            <div className={`text-3xl font-bold ${textColorClass} mb-2 tabular-nums`}>
              {counts[type]}
            </div>
          )}
          <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${tagClass}`}>
            {tag}
          </span>
        </button>
      ))}
    </div>
  );
}
