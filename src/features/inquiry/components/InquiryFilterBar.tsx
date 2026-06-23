'use client';

import { useRef } from 'react';
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

// ── 状态角标计数 ───────────────────────────────────────────
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

// ── 日期工具 ──────────────────────────────────────────────
function todayMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** YYYY-MM → 显示文字；同年只显示 M月 */
function fmtMonth(value: string): string {
  const [y, m] = value.split('-').map(Number);
  return y === new Date().getFullYear() ? `${m}月` : `${y}年${m}月`;
}

/** YYYY-MM + delta 个月 → 新的 YYYY-MM */
function shiftMonth(base: string, delta: number): string {
  const [y, m] = base.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── 常量 ─────────────────────────────────────────────────
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

// ── 子组件 ────────────────────────────────────────────────
function Chip({
  label, active, onClick, activeColor = 'bg-blue-600 text-white', badge, badgeColor = 'bg-blue-600',
}: {
  label: string; active: boolean; onClick: () => void;
  activeColor?: string; badge?: number; badgeColor?: string;
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
        <span className={`absolute -right-1.5 -top-1.5 min-w-4 rounded-full px-1 text-[10px] font-semibold leading-4 text-white ${badgeColor}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── 主组件 ────────────────────────────────────────────────
export function InquiryFilterBar({
  id, filter, setFilter, inquirers, activeCount, onReset, records,
}: InquiryFilterBarProps) {
  const monthInputRef = useRef<HTMLInputElement>(null);

  const isCustomMonth = filter.timeRange.startsWith('month:');
  // 导航器的"基准月"：month模式下取选中月，其他模式取当前月
  const navMonth = isCustomMonth ? filter.timeRange.slice(6) : todayMonth();
  const canGoNext = navMonth < todayMonth(); // 到当前月就不能再往后了

  // 唤起原生月份选择器
  const openPicker = (e: React.MouseEvent) => {
    e.preventDefault();
    try { monthInputRef.current?.showPicker(); }
    catch { monthInputRef.current?.focus(); }
  };

  const setMonth = (ym: string) =>
    setFilter({ ...filter, timeRange: `month:${ym}` as TimeRange });

  const divider = <span className="select-none text-gray-200 dark:text-gray-700">·</span>;

  return (
    <div id={id} className="flex min-w-0 flex-1 flex-wrap items-center gap-1">


      {/* ── 时间：语义 chip + 月导航器 ── */}
      <Chip
        label="近3月"
        active={filter.timeRange === '3months'}
        onClick={() => setFilter({ ...filter, timeRange: '3months' })}
      />
      <Chip
        label="全部"
        active={filter.timeRange === 'all'}
        onClick={() => setFilter({ ...filter, timeRange: 'all' })}
      />

      {/* 月份导航器：← [选月/M月] → */}
      <div className="inline-flex items-center overflow-hidden rounded-full border border-gray-200 bg-white text-xs dark:border-gray-700 dark:bg-gray-800">
        {/* 上一月 */}
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(navMonth, -1))}
          className="px-2 py-0.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="上一个月"
        >
          ‹
        </button>

        {/* 月份标签 / 选月入口 — input 紧贴按钮底部，picker 弹出位置正确 */}
        <div className="relative border-x border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={openPicker}
            className={`min-w-[3.25rem] px-2 py-0.5 text-center font-medium transition-colors ${
              isCustomMonth
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
            title={isCustomMonth ? '点击更换月份' : '选择特定月份'}
          >
            {isCustomMonth ? fmtMonth(navMonth) : '选月'}
          </button>
          <input
            ref={monthInputRef}
            type="month"
            max={todayMonth()}
            onChange={(e) => { if (e.target.value) setMonth(e.target.value); }}
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
          />
        </div>

        {/* 下一月 */}
        <button
          type="button"
          onClick={canGoNext ? () => setMonth(shiftMonth(navMonth, 1)) : undefined}
          disabled={!canGoNext}
          className={`px-2 py-0.5 transition-colors ${
            canGoNext
              ? 'text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200'
              : 'cursor-not-allowed text-gray-200 dark:text-gray-700'
          }`}
          aria-label="下一个月"
        >
          ›
        </button>
      </div>

      {divider}

      {/* ── 报价状态 chips ── */}
      {statusOptions.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          active={filter.quoteStatus === opt.value}
          activeColor={opt.activeColor}
          badge={countByStatus(records, opt.value)}
          badgeColor={opt.badgeColor}
          onClick={() =>
            setFilter({ ...filter, quoteStatus: filter.quoteStatus === opt.value ? 'all' : opt.value })
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
          <option key={name} value={name}>{name}</option>
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
