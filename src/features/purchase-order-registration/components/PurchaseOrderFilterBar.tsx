'use client';

import { FilterChip } from '@/components/FilterChip';
import { MonthRangeNav, type MonthTimeRange } from '@/components/MonthRangeNav';

interface PurchaseOrderFilterBarProps {
  keyword: string;
  timeRange: MonthTimeRange;
  filteredCount: number;
  activeCount: number;
  onKeywordChange: (keyword: string) => void;
  onTimeRangeChange: (range: MonthTimeRange) => void;
  onReset: () => void;
}

export function PurchaseOrderFilterBar({
  keyword,
  timeRange,
  filteredCount,
  activeCount,
  onKeywordChange,
  onTimeRangeChange,
  onReset,
}: PurchaseOrderFilterBarProps) {
  return (
    <div className="mb-3 overflow-visible rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <div className="flex flex-col gap-2.5 overflow-visible lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 overflow-visible">
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
        </div>

        <div className="flex w-full items-center gap-1.5 sm:max-w-md lg:w-auto">
          <input
            type="search"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="搜索订单编号/采购单号/供应商..."
            className="h-7 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-blue-500 sm:w-64 sm:flex-none"
          />
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
