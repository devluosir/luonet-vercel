'use client';

import { useEffect, useRef, useState } from 'react';
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
  filteredCount?: number;
}

// ── 状态角标计数 ──────────────────────────────────────────
function countByStatus(records: InquiryRecord[], status: QuoteStatusFilter): number {
  return records.filter((r) => {
    switch (status) {
      case 'customer_pending':  return r.quotedStatuses.length === 0;
      case 'customer_quoted':
        return (
          !r.quotedStatuses.some((s) => s.type === 'unavailable' || s.type === 'closed') &&
           r.quotedStatuses.some((s) => !s.type || s.type === 'quoted')
        );
      case 'unavailable': return r.quotedStatuses.some((s) => s.type === 'unavailable' || s.type === 'closed');
      case 'has_order':
        return (
          Boolean(r.orderNo?.trim()) &&
          (r.orderSubStatus === undefined || r.orderSubStatus === 'suspended')
        );
      case 'cancelled':   return r.orderSubStatus === 'cancelled';
      case 'followup':    return r.orderSubStatus === 'followup';
      default:            return false;
    }
  }).length;
}

// ── 日期工具 ──────────────────────────────────────────────
function todayMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtMonth(value: string): string {
  const [y, m] = value.split('-').map(Number);
  return y === new Date().getFullYear() ? `${m}月` : `${y}年${m}月`;
}

function shiftMonth(base: string, delta: number): string {
  const [y, m] = base.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── 自定义月份选择浮层（兼容 Safari） ────────────────────
function MonthPickerPopover({
  value,
  onSelect,
  onClose,
  anchorRef,
}: {
  value: string;
  onSelect: (ym: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const today = todayMonth();
  const curYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState(() =>
    value ? Number(value.split('-')[0]) : curYear
  );

  // 点击浮层外部关闭
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={ref}
      className="absolute left-1/2 top-full z-50 mt-1.5 w-44 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-2.5 shadow-xl dark:border-gray-700 dark:bg-[#2C2C2E]"
    >
      {/* 年份导航 */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewYear((y) => y - 1)}
          className="rounded px-1.5 py-0.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >‹</button>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{viewYear}年</span>
        <button
          type="button"
          onClick={() => setViewYear((y) => y + 1)}
          disabled={viewYear >= curYear}
          className={`rounded px-1.5 py-0.5 text-sm ${
            viewYear >= curYear
              ? 'cursor-not-allowed text-gray-200 dark:text-gray-700'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >›</button>
      </div>

      {/* 月份格子 4×3 */}
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 12 }, (_, i) => {
          const ym = `${viewYear}-${String(i + 1).padStart(2, '0')}`;
          const isSelected = ym === value;
          const isFuture = ym > today;
          return (
            <button
              key={ym}
              type="button"
              disabled={isFuture}
              onClick={() => { onSelect(ym); onClose(); }}
              className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : isFuture
                  ? 'cursor-not-allowed text-gray-200 dark:text-gray-700'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {i + 1}月
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── 常量 ─────────────────────────────────────────────────
const statusOptions: Array<{
  label: string; value: QuoteStatusFilter; activeColor: string; badgeColor: string;
}> = [
  { label: '未报价',   value: 'customer_pending', activeColor: 'bg-pink-500 text-white',   badgeColor: 'bg-pink-500' },
  { label: '已报价',   value: 'customer_quoted',  activeColor: 'bg-blue-600 text-white',   badgeColor: 'bg-blue-600' },
  { label: '无法报价', value: 'unavailable',       activeColor: 'bg-yellow-500 text-white', badgeColor: 'bg-yellow-500' },
  { label: '已成单',   value: 'has_order',         activeColor: 'bg-green-600 text-white',  badgeColor: 'bg-green-600' },
  { label: '已辙销',   value: 'cancelled',         activeColor: 'bg-red-600 text-white',    badgeColor: 'bg-red-600' },
  { label: '善后',     value: 'followup',          activeColor: 'bg-orange-500 text-white', badgeColor: 'bg-orange-500' },
];

// ── Chip ─────────────────────────────────────────────────
function Chip({
  label, active, onClick,
  activeColor = 'bg-blue-600 text-white',
  badge, badgeColor = 'bg-blue-600',
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
  id, filter, setFilter, inquirers, activeCount, onReset, records, filteredCount,
}: InquiryFilterBarProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const isCustomMonth = filter.timeRange.startsWith('month:');
  const navMonth = isCustomMonth ? filter.timeRange.slice(6) : todayMonth();
  const canGoNext = navMonth < todayMonth();

  const setMonth = (ym: string) =>
    setFilter({ ...filter, timeRange: `month:${ym}` as TimeRange });

  const divider = <span className="select-none text-gray-200 dark:text-gray-700">·</span>;

  return (
    <div id={id} className="flex flex-col gap-2.5 py-2">

      {/* ── 第一行：时间范围 + 状态筛选芯片 ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip
          label="近3月"
          active={filter.timeRange === '3months'}
          onClick={() => { setFilter({ ...filter, timeRange: '3months' }); setIsPickerOpen(false); }}
          badge={filteredCount}
          badgeColor="bg-blue-800"
        />
        <Chip
          label="全部"
          active={filter.timeRange === 'all'}
          onClick={() => { setFilter({ ...filter, timeRange: 'all' }); setIsPickerOpen(false); }}
          badge={filteredCount}
          badgeColor="bg-blue-800"
        />

        {/* 月份导航器：‹ [选月/M月] › */}
        <div ref={navRef} className="relative inline-flex items-center overflow-visible">
          <div className="inline-flex items-center overflow-hidden rounded-full border border-gray-200 bg-white text-xs dark:border-gray-700 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => { setMonth(shiftMonth(navMonth, -1)); setIsPickerOpen(false); }}
              className="px-2 py-0.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              aria-label="上一个月"
            >‹</button>
            <button
              type="button"
              onClick={() => setIsPickerOpen((o) => !o)}
              className={`min-w-[3.25rem] border-x border-gray-100 px-2 py-0.5 text-center font-medium transition-colors dark:border-gray-700 ${
                isCustomMonth
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
              title={isCustomMonth ? '点击更换月份' : '选择特定月份'}
            >
              {isCustomMonth ? fmtMonth(navMonth) : '选月'}
            </button>
            <button
              type="button"
              onClick={canGoNext ? () => { setMonth(shiftMonth(navMonth, 1)); setIsPickerOpen(false); } : undefined}
              disabled={!canGoNext}
              className={`px-2 py-0.5 transition-colors ${
                canGoNext
                  ? 'text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                  : 'cursor-not-allowed text-gray-200 dark:text-gray-700'
              }`}
              aria-label="下一个月"
            >›</button>
          </div>
          {isCustomMonth && filteredCount !== undefined && (
            <span className="pointer-events-none absolute -right-1.5 -top-1.5 z-10 min-w-4 rounded-full bg-blue-800 px-1 text-[10px] font-semibold leading-4 text-white">
              {filteredCount}
            </span>
          )}
          {isPickerOpen && (
            <MonthPickerPopover
              value={isCustomMonth ? navMonth : ''}
              onSelect={(ym) => setMonth(ym)}
              onClose={() => setIsPickerOpen(false)}
              anchorRef={navRef}
            />
          )}
        </div>

        {divider}

        {/* 报价状态 chips */}
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
      </div>

      {/* ── 第二行：搜索 + 询价人 + 重置 ── */}
      <div className="flex items-center gap-1.5">
        <input
          type="search"
          value={filter.keyword}
          onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
          placeholder="搜索..."
          className={
            'h-7 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 ' +
            'text-xs text-gray-700 outline-none placeholder:text-gray-400 ' +
            'focus:border-blue-400 focus:ring-1 focus:ring-blue-200 ' +
            'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 ' +
            'dark:focus:border-blue-500'
          }
        />
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
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="h-7 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            重置
          </button>
        )}
      </div>
    </div>
  );
}
