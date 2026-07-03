'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, Save, Clock, X } from 'lucide-react';

type SearchFilters = Record<string, string | undefined>;

interface SearchQuery {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  createdAt: string;
  lastUsed: string;
}

interface AdvancedSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onSaveQuery?: (name: string, query: string, filters: SearchFilters) => void;
  placeholder?: string;
  className?: string;
}

const isSearchQuery = (value: unknown): value is SearchQuery => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.query === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.lastUsed === 'string' &&
    typeof record.filters === 'object' &&
    record.filters !== null &&
    !Array.isArray(record.filters)
  );
};

export function AdvancedSearch({
  onSearch,
  onSaveQuery,
  placeholder = "搜索...",
  className = ""
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [savedQueries, setSavedQueries] = useState<SearchQuery[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 加载保存的查询
  useEffect(() => {
    const saved = localStorage.getItem('customer_search_queries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed)) {
          setSavedQueries(parsed.filter(isSearchQuery));
        }
      } catch (error) {
        console.error('Failed to load saved queries:', error);
      }
    }
  }, []);

  // 保存查询到localStorage
  const saveQueriesToStorage = useCallback((queries: SearchQuery[]) => {
    localStorage.setItem('customer_search_queries', JSON.stringify(queries));
  }, []);

  // 执行搜索
  const handleSearch = useCallback(() => {
    onSearch(query, filters);

    // 更新最近使用的查询
    if (query.trim()) {
      const existingIndex = savedQueries.findIndex(q => q.query === query);
      if (existingIndex >= 0) {
        const updated = [...savedQueries];
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastUsed: new Date().toISOString()
        };
        setSavedQueries(updated);
        saveQueriesToStorage(updated);
      }
    }
  }, [filters, onSearch, query, savedQueries, saveQueriesToStorage]);

  // 保存当前查询
  const handleSaveQuery = () => {
    if (!saveQueryName.trim() || !query.trim()) return;

    const newQuery: SearchQuery = {
      id: Date.now().toString(),
      name: saveQueryName.trim(),
      query: query.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };

    const updated = [newQuery, ...savedQueries].slice(0, 10); // 最多保存10个
    setSavedQueries(updated);
    saveQueriesToStorage(updated);

    setSaveQueryName('');
    setShowSaveDialog(false);

    if (onSaveQuery) {
      onSaveQuery(newQuery.name, newQuery.query, newQuery.filters);
    }
  };

  // 加载保存的查询
  const loadSavedQuery = (savedQuery: SearchQuery) => {
    setQuery(savedQuery.query);
    setFilters(savedQuery.filters);
    setShowSavedQueries(false);

    // 更新最后使用时间
    const updated = savedQueries.map(q =>
      q.id === savedQuery.id
        ? { ...q, lastUsed: new Date().toISOString() }
        : q
    );
    setSavedQueries(updated);
    saveQueriesToStorage(updated);

    // 执行搜索
    onSearch(savedQuery.query, savedQuery.filters);
  };

  // 删除保存的查询
  const deleteSavedQuery = (id: string) => {
    const updated = savedQueries.filter(q => q.id !== id);
    setSavedQueries(updated);
    saveQueriesToStorage(updated);
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSearch();
      }
      if (e.key === 'Escape') {
        setShowFilters(false);
        setShowSavedQueries(false);
        setShowSaveDialog(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSearch]);

  // 格式化时间
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`relative ${className}`}>
      {/* 搜索输入框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors"
        />

        {/* 操作按钮 */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {/* 筛选按钮 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 rounded transition-colors ${
              showFilters
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="高级筛选"
          >
            <Filter className="h-4 w-4" />
          </button>

          {/* 保存的查询按钮 */}
          <button
            onClick={() => setShowSavedQueries(!showSavedQueries)}
            className={`p-1 rounded transition-colors ${
              showSavedQueries
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="保存的查询"
          >
            <Clock className="h-4 w-4" />
          </button>

          {/* 保存查询按钮 */}
          {query.trim() && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              title="保存查询"
            >
              <Save className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 高级筛选面板 */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 状态筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                状态
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">全部状态</option>
                <option value="active">活跃</option>
                <option value="inactive">非活跃</option>
                <option value="pending">待处理</option>
              </select>
            </div>

            {/* 类型筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                类型
              </label>
              <select
                value={filters.type || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value || undefined }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">全部类型</option>
                <option value="customer">客户</option>
                <option value="supplier">供应商</option>
                <option value="consignee">收货人</option>
              </select>
            </div>

            {/* 日期范围 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                创建时间
              </label>
              <select
                value={filters.dateRange || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value || undefined }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">全部时间</option>
                <option value="today">今天</option>
                <option value="week">本周</option>
                <option value="month">本月</option>
                <option value="quarter">本季度</option>
                <option value="year">本年</option>
              </select>
            </div>
          </div>

          {/* 筛选操作按钮 */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setFilters({})}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              清除筛选
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowFilters(false)}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                取消
              </button>
              <button
                onClick={() => {
                  handleSearch();
                  setShowFilters(false);
                }}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                应用筛选
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 保存的查询下拉 */}
      {showSavedQueries && savedQueries.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          {savedQueries.map((savedQuery) => (
            <div
              key={savedQuery.id}
              className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            >
              <div
                className="flex-1 min-w-0"
                onClick={() => loadSavedQuery(savedQuery)}
              >
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {savedQuery.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {savedQuery.query}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {formatTime(savedQuery.lastUsed)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSavedQuery(savedQuery.id);
                }}
                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                title="删除"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 保存查询对话框 */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              保存搜索查询
            </h3>
            <input
              type="text"
              value={saveQueryName}
              onChange={(e) => setSaveQueryName(e.target.value)}
              placeholder="输入查询名称"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveQueryName('');
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleSaveQuery}
                disabled={!saveQueryName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 搜索提示 */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        💡 提示：使用 Ctrl+Enter 快速搜索，Esc 关闭面板
      </div>
    </div>
  );
}
