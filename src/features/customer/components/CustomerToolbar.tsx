import { Search, Filter, RefreshCw, Plus, Download, Upload } from 'lucide-react';
import { TabType } from '../types';

interface CustomerToolbarProps {
  activeTab: TabType;
  onRefresh: () => void;
  onAddNew: () => void;
}

export function CustomerToolbar({ activeTab, onRefresh, onAddNew }: CustomerToolbarProps) {
  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case 'customers':
        return '客户';
      case 'suppliers':
        return '供应商';
      case 'consignees':
        return '收货人';
      default:
        return '项目';
    }
  };

  return (
    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* 左侧：搜索和筛选 */}
        <div className="flex flex-1 items-center space-x-4">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={`搜索${getTabLabel(activeTab)}...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors"
            />
          </div>

          {/* 筛选按钮 */}
          <button className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-300 dark:border-gray-600">
            <Filter className="h-4 w-4" />
            <span>筛选</span>
          </button>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center space-x-3">
          {/* 刷新按钮 */}
          <button
            onClick={onRefresh}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
            title="刷新数据"
          >
            <RefreshCw className="h-4 w-4" />
            <span>刷新</span>
          </button>

          {/* 导入按钮 */}
          <button className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-300 dark:border-gray-600">
            <Upload className="h-4 w-4" />
            <span>导入</span>
          </button>

          {/* 导出按钮 */}
          <button className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-300 dark:border-gray-600">
            <Download className="h-4 w-4" />
            <span>导出</span>
          </button>

          {/* 添加新项目按钮 */}
          <button
            onClick={onAddNew}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>添加{getTabLabel(activeTab)}</span>
          </button>
        </div>
      </div>

      {/* 快速操作提示 */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>💡 提示：使用搜索框快速查找{getTabLabel(activeTab)}，或点击筛选按钮进行高级筛选</p>
      </div>
    </div>
  );
}
