'use client';

import { useRef, useState } from 'react';
import {
  MonthPickerPopover,
  fmtMonth,
  shiftMonth,
  todayMonth,
} from '@/components/MonthPickerPopover';

export type MonthTimeRange = '3months' | 'all' | `month:${string}`;

interface MonthRangeNavProps {
  range: MonthTimeRange;
  onChange: (range: MonthTimeRange) => void;
  /** 选月模式下显示在导航器旁的角标 */
  badge?: number;
}

/** 月份筛选导航：‹ [选月 / M月] › + 月份浮层（与询报价登记表一致） */
export function MonthRangeNav({ range, onChange, badge }: MonthRangeNavProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const isCustomMonth = range.startsWith('month:');
  const navMonth = isCustomMonth ? range.slice(6) : todayMonth();
  const canGoNext = navMonth < todayMonth();

  const setMonth = (ym: string) => onChange(`month:${ym}`);

  return (
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
      {isCustomMonth && badge !== undefined && (
        <span className="pointer-events-none absolute -right-1.5 -top-1.5 z-10 min-w-4 rounded-full bg-blue-800 px-1 text-[10px] font-semibold leading-4 text-white">
          {badge}
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
  );
}
