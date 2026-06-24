'use client';

import { useEffect, useRef, useState } from 'react';

export function todayMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function fmtMonth(value: string): string {
  const [y, m] = value.split('-').map(Number);
  return y === new Date().getFullYear() ? `${m}月` : `${y}年${m}月`;
}

export function shiftMonth(base: string, delta: number): string {
  const [y, m] = base.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 自定义月份浮层（Safari / 移动端兼容，不依赖原生 month input） */
export function MonthPickerPopover({
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
