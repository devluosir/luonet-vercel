'use client';

import { CalendarDays } from 'lucide-react';
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

/** 将 YYYY-MM 格式化为简短显示，同年只显示 M月 */
function formatMonthLabel(value: string): string {
  const parts = value.split('-');
  if (parts.length !== 2) return value;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const thisYear = new Date().getFullYear();
  return year === thisYear ? `${month}月` : `${year}年${month}月`;
}

/** 今天的 YYYY-MM，用于限制月份选择器的上限 */
function todayMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const timeChips: Array<{ label: string; value: TimeRange }> = [
  { label: '近3月', value: '3months' },
  { label: '本月',  value: 'this_month' },
  { label: '上月',  value: 'last_month' },
  { label: '全部',  value: 'all' },
];

const statusOptions: Array<{
  label: string;
  value: QuoteStatusFilter;
  activeColor: string;
  badgeColor: string;
}> = [
  { label: '未报价',   value: 'customer_pending', activeColor: 'bg-pink-500 text-white',   badgeColor: 'bg-pink-500' },
  { label: '已报价',   value: 'customer_quoted',  activeColor: 'bg-blue-600 text-white',   badgeColor: 'bg-blue-600' },
  { label: '无法报价', value: 'unavailable',       activeColor: 'bg-yellow-500 text-white', badgeColor: 'bg-yellow-500' },
  { label: '已成单',   value: 'has_order',         activeColor: 'bg-green-600 text-white',  badgeColor: 'bg-green-600' },
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

  // 是否当前为指定月模式
  const isCustomMonth =
    typeof filter.timeRange === 'string' && filter.timeRange.startsWith('month:');
  // 当前指定月的值（YYYY-MM），供 input[type=month] 使用
  const customMonthValue = isCustomMonth ? filter.timeRange.slice(6) : '';

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM
    if (val) {
      setFilter({ ...filter, timeRange: `month:${val}` as TimeRange });
    }
  };

  const clearCustomMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFilter({ ...filter, timeRange: '3months' });
  };

  return (
    <div
      id={id}
      className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
    >
      {/* ── 时间筛选 ── */}
      {timeChips.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          active={filter.timeRange === opt.value}
          onClick={() =>
            setFilter({
              ...filter,
              timeRange: filter.timeRange === opt.value ? '3months' : opt.value,
            })
          }
        />
      ))}

      {/* 指定月份选择器 */}
      {isCustomMonth ? (
        /* 当前已选某月 → 显示为可关闭的 chip，点击可重新选月 */
        <label
          className="relative flex cursor-pointer items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white"
          title="点击更换月份"
        >
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span>{formatMonthLabel(customMonthValue)}</span>
          <span
            role="button"
            aria-label="清除月份筛选"
            onClick={clearCustomMonth}
            className="ml-0.5 opacity-70 hover:opacity-100"
          >
            ×
          </span>
          <input
            type="month"
            value={customMonthValue}
            max={todayMonth()}
            onChange={handleMonthChange}
            className="sr-only"
          />
        </label>
      ) : (
        /* 未选月份 → 显示 "选月" 按钮 */
        <label
          className="flex cursor-pointer items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          title="选择特定月份"
        >
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span>选月</span>
          <input
            type="month"
            value=""
            max={todayMonth()}
            onChange={handleMonthChange}
            className="sr-only"
          />
        </label>
      )}

      {divider}

      {/* ── 报价状态筛选 ── */}
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

      {/* ── 关键词搜索 ── */}
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

      {/* ── 询价人 ── */}
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

      {/* ── 重置 ── */}
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
