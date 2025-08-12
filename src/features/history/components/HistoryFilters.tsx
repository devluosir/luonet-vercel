import React from 'react';
import { X } from 'lucide-react';
import { useHistoryFilters, useHistorySortConfig } from '../state/history.selectors';
import { useHistoryStore } from '../state/history.store';

interface HistoryFiltersProps {
  showFilters: boolean;
  onToggleFilters: () => void;
}

export function HistoryFilters({ showFilters, onToggleFilters }: HistoryFiltersProps) {
  const filters = useHistoryFilters();
  const sortConfig = useHistorySortConfig();
  const { setFilters, resetFilters, toggleSort } = useHistoryStore();

  const handleDateRangeChange = (value: string) => {
    setFilters({ dateRange: value as any });
  };

  const handleSort = (key: string) => {
    toggleSort(key);
  };

  const hasActiveFilters = filters.search || filters.dateRange !== 'all';

  // 如果筛选器不显示，则不渲染任何内容
  if (!showFilters) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* 筛选器内容 */}
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-8">
            {/* 时间范围 */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                时间:
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">全部时间</option>
                <option value="today">今天</option>
                <option value="yesterday">昨天</option>
                <option value="week">最近7天</option>
                <option value="month">最近30天</option>
                <option value="quarter">最近3个月</option>
                <option value="year">最近一年</option>
              </select>
            </div>

            {/* 排序方式 */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                排序:
              </label>
              <select
                value={`${sortConfig.key}-${sortConfig.direction}`}
                onChange={(e) => {
                  const [key, direction] = e.target.value.split('-');
                  if (key === 'updatedAt' || key === 'totalAmount') {
                    // 如果当前已经是这个key，则切换方向
                    if (sortConfig.key === key) {
                      toggleSort(key);
                    } else {
                      // 如果是新的key，设置为降序
                      toggleSort(key);
                    }
                  }
                }}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="updatedAt-desc">最新修改 ↓</option>
                <option value="updatedAt-asc">最早修改 ↑</option>
                <option value="totalAmount-desc">金额从高到低 ↓</option>
                <option value="totalAmount-asc">金额从低到高 ↑</option>
              </select>
            </div>

            {/* 清除筛选按钮 */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center text-sm text-red-600 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X className="h-4 w-4 mr-1" />
                清除筛选
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
