'use client';

import type { InquiryRecord } from '../types';
import type {
  InquiryFilterState,
  QuoteStatusFilter,
  TimeRange,
} from '../hooks/useInquiryFilter';

interface InquiryFilterBarProps {
  id?: string;
  filter: InquiryFilterState;
  setFilter: (filter: InquiryFilterState) => void;
  inquirers: string[];
  activeCount: number;
  onReset: () => void;
  records: InquiryRecord[];
}

function countByStatus(records: InquiryRecord[], status: QuoteStatusFilter): number {
  return records.filter((r) => {
    switch (status) {
      case 'customer_pending':
        return r.quotedStatuses.length === 0;
      case 'customer_quoted':
        return (
          !r.quotedStatuses.some((s) => s.type === 'unavailable' || s.type === 'closed') &&
          r.quotedStatuses.some((s) => !s.type || s.type === 'quoted')
        );
      case 'unavailable':
        return r.quotedStatuses.some((s) => s.type === 'unavailable' || s.type === 'closed');
      case 'has_order':
        return Boolean(r.orderNo?.trim());
      default:
        return false;
    }
  }).length;
}

const timeOptions: Array<{ label: string; value: TimeRange }> = [
  { label: '7D', value: '7d' },
  { label: '1M', value: '30d' },
  { label: '3M', value: '90d' },
  { label: '1Y', value: '1y' },
];

const statusOptions: Array<{
  label: string;
  value: QuoteStatusFilter;
  activeColor?: string;
  badgeColor: string;
}> = [
  { label: '未报价', value: 'customer_pending', activeColor: 'bg-pink-500 text-white', badgeColor: 'bg-pink-500' },
  { label: '已报价', value: 'customer_quoted', activeColor: 'bg-blue-600 text-white', badgeColor: 'bg-blue-600' },
  { label: '无法报价', value: 'unavailable', activeColor: 'bg-yellow-500 text-white', badgeColor: 'bg-yellow-500' },
  { label: '已成单', value: 'has_order', activeColor: 'bg-green-600 text-white', badgeColor: 'bg-green-600' },
];

function Chip({
  label,
  active,
  onClick,
  activeColor = 'bg-blue-600 text-white',
  badge,
  badgeColor = 'bg-blue-600',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeColor?: string;
  badge?: number;
  badgeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
        active
          ? activeColor
          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      {label}
      {active && badge !== undefined && (
        <span
          className={`absolute -right-1.5 -top-1.5 min-w-4 rounded-full px-1 text-[10px] font-semibold leading-4 text-white ${badgeColor}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export function InquiryFilterBar({
  id,
  filter,
  setFilter,
  inquirers,
  activeCount,
  onReset,
  records,
}: InquiryFilterBarProps) {
  const divider = (
    <span className="select-none text-gray-200 dark:text-gray-700">·</span>
  );

  return (
    <div
      id={id}
      className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
    >
      {/* Time */}
      {timeOptions.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          active={filter.timeRange === opt.value}
          onClick={() =>
            setFilter({
              ...filter,
              timeRange: filter.timeRange === opt.value ? 'all' : opt.value,
            })
          }
        />
      ))}

      {divider}

      {/* Status */}
      {statusOptions.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          active={filter.quoteStatus === opt.value}
          activeColor={opt.activeColor}
          badge={countByStatus(records, opt.value)}
          badgeColor={opt.badgeColor}
          onClick={() =>
            setFilter({
              ...filter,
              quoteStatus: filter.quoteStatus === opt.value ? 'all' : opt.value,
            })
          }
        />
      ))}

      {divider}

      {/* Search */}
      <input
        type="search"
        value={filter.keyword}
        onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
        placeholder="搜索..."
        className={
          'h-7 w-28 min-w-0 rounded-lg border border-gray-200 bg-white px-2 ' +
          'text-xs text-gray-700 outline-none placeholder:text-gray-400 ' +
          'focus:border-blue-400 focus:ring-1 focus:ring-blue-200 ' +
          'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 ' +
          'dark:focus:border-blue-500'
        }
      />

      {/* Inquirer */}
      <select
        value={filter.inquirer}
        onChange={(e) => setFilter({ ...filter, inquirer: e.target.value })}
        className="h-7 rounded-lg border border-gray-200 bg-white px-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        <option value="">询价人</option>
        {inquirers.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      {/* Reset */}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          重置
        </button>
      )}
    </div>
  );
}
