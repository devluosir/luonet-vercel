'use client';

import {
  FileCheck,
  FileText,
  FileSignature,
  Package,
  Receipt,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';
import { StatChip } from './StatChip';
import type { PermissionMap } from '../types';

interface StatItem {
  type: 'quotation' | 'confirmation' | 'domestic-quotation' | 'domestic-contract' | 'invoice' | 'packing' | 'purchase';
  label: string;
  icon: LucideIcon;
  textColorClass: string;
}

export interface StatCounts {
  quotation: number;
  confirmation: number;
  'domestic-quotation': number;
  'domestic-contract': number;
  invoice: number;
  packing: number;
  purchase: number;
}

interface StatsCardsProps {
  counts: StatCounts;
  loading?: boolean;
  permissionMap?: PermissionMap;
}

const STAT_ITEMS: StatItem[] = [
  { type: 'quotation', label: '报价单', icon: FileText, textColorClass: 'text-blue-600 dark:text-blue-400' },
  { type: 'confirmation', label: '销售确认', icon: FileCheck, textColorClass: 'text-green-600 dark:text-green-400' },
  { type: 'domestic-quotation', label: '内销报价', icon: FileSignature, textColorClass: 'text-blue-600 dark:text-blue-400' },
  { type: 'domestic-contract', label: '内销合同', icon: FileSignature, textColorClass: 'text-green-600 dark:text-green-400' },
  { type: 'invoice', label: '财务发票', icon: Receipt, textColorClass: 'text-purple-600 dark:text-purple-400' },
  { type: 'packing', label: '箱单发票', icon: Package, textColorClass: 'text-teal-600 dark:text-teal-400' },
  { type: 'purchase', label: '采购订单', icon: ShoppingCart, textColorClass: 'text-orange-600 dark:text-orange-400' },
];

/**
 * 「今日新增单据」紧凑徽标行。不再自带外层边框/阴影——由 `DashboardPage.tsx` 统一包一层
 * 外壳，跟 `InquiryOrderStats` 的「今日/本月」行合并成一个统一的统计面板（见 TASK-110 追加调整）。
 */
export function StatsCards({ counts, loading = false, permissionMap }: StatsCardsProps) {
  const visibleItems = STAT_ITEMS.filter(({ type }) => {
    if (!permissionMap) return true;
    return permissionMap.documentTypePermissions[type] ?? false;
  });

  if (visibleItems.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 px-3 py-2.5">
      <span className="mr-1 shrink-0 text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500">
        今日
      </span>
      {visibleItems.map(({ type, label, icon, textColorClass }) => (
        <StatChip
          key={type}
          icon={icon}
          label={label}
          value={counts[type]}
          colorClass={textColorClass}
          path={`/history?type=${type}&time=today`}
          loading={loading}
        />
      ))}
    </div>
  );
}
