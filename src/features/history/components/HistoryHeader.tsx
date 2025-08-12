import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Download, Upload, RefreshCw, X } from 'lucide-react';
import { useHistoryActions } from '../hooks/useHistoryActions';
import { useHistorySelectedCount, useHistoryFilters } from '../state/history.selectors';
import { useHistoryStore } from '../state/history.store';

interface HistoryHeaderProps {
  onRefresh: () => void;
  onExport: () => void;
  onImport: () => void;
  onBatchDelete: () => void;
  isDeleting: boolean;
}

export function HistoryHeader({
  onRefresh,
  onExport,
  onImport,
  onBatchDelete,
  isDeleting,
}: HistoryHeaderProps) {
  const selectedCount = useHistorySelectedCount();
  const filters = useHistoryFilters();
  const { setFilters } = useHistoryStore();

  const handleSearchChange = (value: string) => {
    setFilters({ search: value });
  };

  const handleClearSearch = () => {
    setFilters({ search: '' });
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 第一行：返回按钮 */}
        <div className="flex items-center h-12">
          <Link
            href="/dashboard"
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            返回
          </Link>
        </div>

        {/* 第二行：标题、搜索框和操作按钮 */}
        <div className="flex items-center justify-between h-16">
          {/* 左侧：标题 */}
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              单据管理中心
            </h1>
          </div>

          {/* 中间：搜索框 */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索客户名称、单据号..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {filters.search && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center space-x-2">
            {/* 刷新按钮 */}
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="刷新"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            {/* 导入按钮 */}
            <button
              onClick={onImport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="导入"
            >
              <Upload className="h-4 w-4" />
            </button>

            {/* 导出按钮 */}
            <button
              onClick={onExport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="导出"
            >
              <Download className="h-4 w-4" />
            </button>

            {/* 批量删除按钮 */}
            {selectedCount > 0 && (
              <button
                onClick={onBatchDelete}
                disabled={isDeleting}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? '删除中...' : `删除选中 (${selectedCount})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
