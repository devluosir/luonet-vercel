'use client';

import { FilterChip } from '@/components/FilterChip';

export type OrderStateFilter = 'all' | 'has_order' | 'no_order';

interface PurchaseRegistrationFilterBarProps {
  keyword: string;
  orderState: OrderStateFilter;
  counts: Record<OrderStateFilter, number>;
  activeCount: number;
  onKeywordChange: (keyword: string) => void;
  onOrderStateChange: (state: OrderStateFilter) => void;
  onReset: () => void;
}

export function PurchaseRegistrationFilterBar({
  keyword,
  orderState,
  counts,
  activeCount,
  onKeywordChange,
  onOrderStateChange,
  onReset,
}: PurchaseRegistrationFilterBarProps) {
  return (
    <div className="mb-3 overflow-visible rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            label="全部"
            active={orderState === 'all'}
            badge={counts.all}
            badgeColor="bg-blue-600"
            onClick={() => onOrderStateChange('all')}
          />
          <FilterChip
            label="已成单"
            active={orderState === 'has_order'}
            badge={counts.has_order}
            badgeColor="bg-green-600"
            onClick={() => onOrderStateChange('has_order')}
          />
          <FilterChip
            label="未成单"
            active={orderState === 'no_order'}
            badge={counts.no_order}
            badgeColor="bg-orange-500"
            onClick={() => onOrderStateChange('no_order')}
          />
        </div>

        <div className="flex w-full items-center gap-1.5 sm:max-w-md lg:w-auto">
          <input
            type="search"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="搜索编号/内容..."
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
