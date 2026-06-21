'use client';

import type {
  InquiryFilterState,
  QuoteStatusFilter,
  TimeRange,
} from '../hooks/useInquiryFilter';

interface InquiryFilterBarProps {
  filter: InquiryFilterState;
  setFilter: (filter: InquiryFilterState) => void;
  customers: string[];
  inquirers: string[];
  activeCount: number;
  filteredCount: number;
  totalCount: number;
  onReset: () => void;
}

const timeOptions: Array<{ label: string; value: TimeRange }> = [
  { label: '全部', value: 'all' },
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
  { label: '近90天', value: '90d' },
];

const statusOptions: Array<{
  activeColor?: string;
  label: string;
  value: QuoteStatusFilter;
}> = [
  { label: '全部', value: 'all' },
  { label: '等待供应商', value: 'supplier_pending' },
  { label: '未报客户', value: 'customer_pending' },
  { label: '已报客户', value: 'customer_quoted', activeColor: 'bg-blue-600 text-white' },
  { label: '无法报价', value: 'unavailable', activeColor: 'bg-gray-500 text-white' },
  { label: '已成单', value: 'has_order', activeColor: 'bg-green-600 text-white' },
];

function chip(
  label: string,
  active: boolean,
  onClick: () => void,
  activeColor = 'bg-blue-600 text-white'
) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
        active
          ? activeColor
          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

export function InquiryFilterBar({
  filter,
  setFilter,
  customers,
  inquirers,
  activeCount,
  filteredCount,
  totalCount,
  onReset,
}: InquiryFilterBarProps) {
  const summary =
    filteredCount === totalCount ? `共 ${totalCount} 条` : `共 ${filteredCount}/${totalCount} 条`;
  const selectClass =
    'h-7 min-w-[128px] rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';

  return (
    <div className="border-t border-gray-100 pt-2 dark:border-gray-800">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-8 text-xs font-medium text-gray-400 dark:text-gray-500">时间</span>
        {timeOptions.map((option) => (
          <div key={option.value} className="contents">
            {chip(option.label, filter.timeRange === option.value, () =>
              setFilter({ ...filter, timeRange: option.value })
            )}
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="w-8 text-xs font-medium text-gray-400 dark:text-gray-500">状态</span>
        {statusOptions.map((option) => (
          <div key={option.value} className="contents">
            {chip(
              option.label,
              filter.quoteStatus === option.value,
              () => setFilter({ ...filter, quoteStatus: option.value }),
              option.activeColor
            )}
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
        <input
          type="search"
          value={filter.keyword}
          onChange={(event) => setFilter({ ...filter, keyword: event.target.value })}
          placeholder="搜索编号 / 客户 / 简述..."
          className={
            'h-7 min-w-[160px] flex-1 rounded-lg border border-gray-200 bg-white px-3 ' +
            'text-xs text-gray-700 outline-none placeholder:text-gray-400 ' +
            'focus:border-blue-400 focus:ring-1 focus:ring-blue-200 ' +
            'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 ' +
            'dark:focus:border-blue-500'
          }
        />

        <select
          value={filter.customerNo}
          onChange={(event) => setFilter({ ...filter, customerNo: event.target.value })}
          className={selectClass}
        >
          <option value="">全部客户</option>
          {customers.map((customerNo) => (
            <option key={customerNo} value={customerNo}>
              {customerNo}
            </option>
          ))}
        </select>

        <select
          value={filter.inquirer}
          onChange={(event) => setFilter({ ...filter, inquirer: event.target.value })}
          className={selectClass}
        >
          <option value="">全部询价人</option>
          {inquirers.map((inquirer) => (
            <option key={inquirer} value={inquirer}>
              {inquirer}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center justify-end gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{summary}</span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-gray-200 px-2 py-0.5 font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              重置筛选
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
