'use client';

import { useEffect } from 'react';
import { FilterChip } from '@/components/FilterChip';
import { MonthRangeNav } from '@/components/MonthRangeNav';
import type { InquiryRecord } from '../types';
import type {
  InquiryFilterState,
  QuoteStatusFilter,
} from '../hooks/useInquiryFilter';

interface SecondarySelectConfig {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

interface LinkFilterConfig {
  label: string;
  active: boolean;
  count: number;
  onToggle: () => void;
}

interface InquiryFilterBarProps {
  id?: string;
  filter: InquiryFilterState;
  setFilter: (filter: InquiryFilterState) => void;
  inquirers: string[];
  activeCount: number;
  onReset: () => void;
  onClearAssociation?: () => void;
  records: InquiryRecord[];
  filteredCount?: number;
  /** 搜索框旁的第二个下拉筛选，默认是"询价人"；传入后可替换为其它维度（如采购部登记的"供应商"） */
  secondarySelect?: SecondarySelectConfig;
  /** "待关联客户"筛选芯片，默认按 record.customerId 判断；传入后可替换为其它维度（如采购部登记的"待关联供应商"） */
  linkFilter?: LinkFilterConfig;
}

// ── 状态角标计数 ──────────────────────────────────────────
function countByStatus(records: InquiryRecord[], status: QuoteStatusFilter): number {
  return records.filter((r) => {
    // 防御性兜底：受限视图/异常数据可能缺失 quotedStatuses 字段
    const quotedStatuses = r.quotedStatuses ?? [];
    switch (status) {
      case 'customer_pending':  return quotedStatuses.length === 0;
      case 'customer_quoted':
        return (
          !quotedStatuses.some((s) => s.type === 'unavailable' || s.type === 'closed') &&
           quotedStatuses.some((s) => !s.type || s.type === 'quoted')
        );
      case 'unavailable': return quotedStatuses.some((s) => s.type === 'unavailable' || s.type === 'closed');
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

// ── 主组件 ────────────────────────────────────────────────
export function InquiryFilterBar({
  id,
  filter,
  setFilter,
  inquirers,
  activeCount,
  onReset,
  onClearAssociation,
  records,
  filteredCount,
  secondarySelect,
  linkFilter,
}: InquiryFilterBarProps) {
  const defaultUnlinkedCount = records.filter((record) => !record.customerId).length;
  const divider = <span className="select-none text-gray-200 dark:text-gray-700">·</span>;

  const secondary: SecondarySelectConfig = secondarySelect ?? {
    label: '询价人',
    value: filter.inquirer,
    options: inquirers,
    onChange: (value: string) => setFilter({ ...filter, inquirer: value }),
  };

  const link: LinkFilterConfig = linkFilter ?? {
    label: '待关联客户',
    active: filter.linkStatus === 'unlinked',
    count: defaultUnlinkedCount,
    onToggle: () =>
      setFilter({
        ...filter,
        linkStatus: filter.linkStatus === 'unlinked' ? 'all' : 'unlinked',
      }),
  };
  const shouldShowLinkFilter = link.count > 0;

  useEffect(() => {
    if (!linkFilter && filter.linkStatus === 'unlinked' && defaultUnlinkedCount === 0) {
      setFilter({ ...filter, linkStatus: 'all' });
    }
  }, [filter, setFilter, defaultUnlinkedCount, linkFilter]);

  return (
    <div
      id={id}
      className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between xl:gap-4"
    >

      {/* 时间范围 + 状态筛选芯片 */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <FilterChip
          label="近3月"
          active={filter.timeRange === '3months'}
          onClick={() => setFilter({ ...filter, timeRange: '3months' })}
          badge={filteredCount}
          badgeColor="bg-blue-800"
        />
        <FilterChip
          label="全部"
          active={filter.timeRange === 'all'}
          onClick={() => setFilter({ ...filter, timeRange: 'all' })}
          badge={filteredCount}
          badgeColor="bg-blue-800"
        />

        {/* 月份导航器：‹ [选月/M月] › */}
        <MonthRangeNav
          range={filter.timeRange}
          onChange={(timeRange) => setFilter({ ...filter, timeRange })}
          badge={filter.timeRange.startsWith('month:') ? filteredCount : undefined}
        />

        {divider}

        {shouldShowLinkFilter && (
          <>
            <FilterChip
              label={link.label}
              active={link.active}
              activeColor="bg-slate-700 text-white"
              badge={link.count}
              badgeColor="bg-slate-700"
              onClick={link.onToggle}
            />

            {divider}
          </>
        )}

        {/* 报价状态 chips */}
        {statusOptions.map((opt) => (
          <FilterChip
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

      {/* 搜索 + 询价人 + 重置（中屏右对齐限宽，大屏并入同一行） */}
      <div className="flex w-full items-center gap-1.5 sm:max-w-md sm:ml-auto xl:ml-0 xl:w-auto xl:shrink-0 xl:border-l xl:border-gray-100 xl:pl-4 dark:xl:border-gray-700">
        {(filter.customerId || filter.contactId) && (
          <span className="inline-flex h-7 max-w-[12rem] shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 text-xs font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
            <span className="truncate">关联：{filter.associationLabel || '客户记录'}</span>
            <button
              type="button"
              onClick={onClearAssociation}
              className="rounded-full px-1 text-blue-400 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/50 dark:hover:text-blue-200"
              aria-label="清除关联筛选"
            >
              ×
            </button>
          </span>
        )}
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
            'dark:focus:border-blue-500 ' +
            'sm:flex-none sm:w-40 lg:w-44 xl:w-48'
          }
        />
        <select
          value={secondary.value}
          onChange={(e) => secondary.onChange(e.target.value)}
          className="h-7 shrink-0 rounded-lg border border-gray-200 bg-white px-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="">{secondary.label}</option>
          {secondary.options.map((name) => (
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
