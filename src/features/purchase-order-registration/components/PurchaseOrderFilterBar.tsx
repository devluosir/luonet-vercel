'use client';

import { FilterChip } from '@/components/FilterChip';
import { MonthRangeNav, type MonthTimeRange } from '@/components/MonthRangeNav';
import type { OrderSubStatus } from '@/features/inquiry/types';

/** 与订单状态表（/order）完全一致的订单状态筛选值，保证两个视图能匹配上同一批记录 */
export type PurchaseOrderStatusFilter = 'all' | 'inProgress' | 'normal' | OrderSubStatus;

export interface PurchaseOrderStatusCounts {
  all: number;
  inProgress: number;
  normal: number;
  cancelled: number;
  suspended: number;
  followup: number;
}

interface PurchaseOrderFilterBarProps {
  keyword: string;
  timeRange: MonthTimeRange;
  filteredCount: number;
  activeCount: number;
  orderStatusFilter: PurchaseOrderStatusFilter;
  statusCounts: PurchaseOrderStatusCounts;
  customerFilter: string;
  customerOptions: string[];
  onKeywordChange: (keyword: string) => void;
  onTimeRangeChange: (range: MonthTimeRange) => void;
  onOrderStatusChange: (filter: PurchaseOrderStatusFilter) => void;
  onCustomerFilterChange: (customer: string) => void;
  onReset: () => void;
}

export function PurchaseOrderFilterBar({
  keyword,
  timeRange,
  filteredCount,
  activeCount,
  orderStatusFilter,
  statusCounts,
  customerFilter,
  customerOptions,
  onKeywordChange,
  onTimeRangeChange,
  onOrderStatusChange,
  onCustomerFilterChange,
  onReset,
}: PurchaseOrderFilterBarProps) {
  return (
    <div className="mb-3 overflow-visible rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <div className="flex flex-col gap-2.5 overflow-visible xl:flex-row xl:items-center xl:justify-between xl:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-visible">
          {/* 时间范围：近3月 / 全部 / 选月导航器（与询报价登记表、订单状态表、采购部登记表一致） */}
          <FilterChip
            label="近3月"
            active={timeRange === '3months'}
            badge={timeRange === '3months' ? filteredCount : undefined}
            onClick={() => onTimeRangeChange('3months')}
          />
          <FilterChip
            label="全部"
            active={timeRange === 'all'}
            badge={timeRange === 'all' ? filteredCount : undefined}
            onClick={() => onTimeRangeChange('all')}
          />
          <MonthRangeNav
            range={timeRange}
            onChange={onTimeRangeChange}
            badge={timeRange.startsWith('month:') ? filteredCount : undefined}
          />

          <span className="select-none text-gray-200 dark:text-gray-700">·</span>

          {/* 订单状态芯片：与订单状态表（/order）完全一致，保证两个视图筛选后对应同一批记录 */}
          <FilterChip
            label="全部"
            active={orderStatusFilter === 'all'}
            badge={statusCounts.all}
            badgeColor="bg-blue-600"
            onClick={() => onOrderStatusChange('all')}
          />
          <FilterChip
            label="进行中"
            active={orderStatusFilter === 'inProgress'}
            activeColor="bg-blue-600 text-white"
            badge={statusCounts.inProgress}
            badgeColor="bg-blue-600"
            onClick={() => onOrderStatusChange('inProgress')}
          />
          <FilterChip
            label="正常"
            active={orderStatusFilter === 'normal'}
            badge={statusCounts.normal}
            badgeColor="bg-blue-600"
            onClick={() => onOrderStatusChange('normal')}
          />
          <FilterChip
            label="辙销C"
            active={orderStatusFilter === 'cancelled'}
            activeColor="bg-red-500 text-white"
            badge={statusCounts.cancelled}
            badgeColor="bg-red-500"
            onClick={() => onOrderStatusChange('cancelled')}
          />
          <FilterChip
            label="悬挂P"
            active={orderStatusFilter === 'suspended'}
            activeColor="bg-orange-400 text-white"
            badge={statusCounts.suspended}
            badgeColor="bg-orange-400"
            onClick={() => onOrderStatusChange('suspended')}
          />
          <FilterChip
            label="善后S"
            active={orderStatusFilter === 'followup'}
            activeColor="bg-orange-500 text-white"
            badge={statusCounts.followup}
            badgeColor="bg-orange-500"
            onClick={() => onOrderStatusChange('followup')}
          />
        </div>

        <div className="flex w-full items-center gap-1.5 sm:ml-auto sm:max-w-md xl:ml-0 xl:w-auto xl:shrink-0 xl:border-l xl:border-gray-100 xl:pl-4 dark:xl:border-gray-700">
          <input
            type="search"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="搜索订单编号/采购单号/供应商..."
            className="h-7 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-blue-500 sm:w-44 sm:flex-none lg:w-52 xl:w-56"
          />
          <select
            value={customerFilter}
            onChange={(e) => onCustomerFilterChange(e.target.value)}
            className="h-7 min-w-0 shrink-0 rounded-lg border border-gray-200 bg-white px-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">客户</option>
            {customerOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="h-7 shrink-0 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              重置
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
