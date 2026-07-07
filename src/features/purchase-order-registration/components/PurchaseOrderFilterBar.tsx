'use client';

import { Plus, RefreshCw } from 'lucide-react';

interface PurchaseOrderFilterBarProps {
  keyword: string;
  isRefreshing: boolean;
  onKeywordChange: (keyword: string) => void;
  onRefresh: () => void;
  onCreate: () => void;
}

export function PurchaseOrderFilterBar({
  keyword,
  isRefreshing,
  onKeywordChange,
  onRefresh,
  onCreate,
}: PurchaseOrderFilterBarProps) {
  return (
    <div className="mb-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="搜索采购单号/供应商/执行情况..."
          className="h-8 min-w-0 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-blue-500 sm:w-80"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            新增
          </button>
        </div>
      </div>
    </div>
  );
}
