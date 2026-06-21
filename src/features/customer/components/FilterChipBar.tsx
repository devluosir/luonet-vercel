import { Grid3X3, List, Search } from 'lucide-react';

export type CustomerFilterType = 'all' | 'high' | 'needs_followup' | 'this_month';
export type CustomerSortType = 'date_desc' | 'name' | 'activity';
export type CustomerViewMode = 'grid' | 'list';

interface FilterChipBarProps {
  total: number;
  activeFilter: CustomerFilterType;
  onFilterChange: (filter: CustomerFilterType) => void;
  sortBy: CustomerSortType;
  onSortChange: (sortBy: CustomerSortType) => void;
  viewMode: CustomerViewMode;
  onViewModeChange: (viewMode: CustomerViewMode) => void;
  highCount: number;
  needsFollowUpCount: number;
  thisMonthCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const filterItems: Array<{
  key: CustomerFilterType;
  label: string;
  countKey: 'total' | 'highCount' | 'needsFollowUpCount' | 'thisMonthCount';
  dotClassName?: string;
}> = [
  { key: 'all', label: '全部', countKey: 'total' },
  { key: 'high', label: '高活跃', countKey: 'highCount', dotClassName: 'bg-green-500' },
  {
    key: 'needs_followup',
    label: '需跟进',
    countKey: 'needsFollowUpCount',
    dotClassName: 'bg-red-500',
  },
  { key: 'this_month', label: '本月新增', countKey: 'thisMonthCount' },
];

const sortOptions: Array<{ value: CustomerSortType; label: string }> = [
  { value: 'date_desc', label: '最近创建' },
  { value: 'name', label: '名称 A-Z' },
  { value: 'activity', label: '活跃优先' },
];

export function FilterChipBar({
  total,
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  highCount,
  needsFollowUpCount,
  thisMonthCount,
  searchQuery,
  onSearchChange,
}: FilterChipBarProps) {
  const counts = {
    total,
    highCount,
    needsFollowUpCount,
    thisMonthCount,
  };

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索客户、电话、邮箱..."
              className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-blue-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filterItems.map((item) => {
              const active = activeFilter === item.key;
              const count = counts[item.countKey];

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onFilterChange(item.key)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
                    active
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.dotClassName && (
                    <span className={`h-1.5 w-1.5 rounded-full ${item.dotClassName}`} />
                  )}
                  <span>{item.label}</span>
                  <span className={active ? 'text-blue-500' : 'text-gray-400'}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as CustomerSortType)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            aria-label="排序方式"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="inline-flex h-9 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`inline-flex w-9 items-center justify-center transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              }`}
              aria-label="网格视图"
              title="网格视图"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`inline-flex w-9 items-center justify-center border-l border-gray-200 transition-colors dark:border-gray-700 ${
                viewMode === 'list'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              }`}
              aria-label="列表视图"
              title="列表视图"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
