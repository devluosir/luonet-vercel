import { Filter, RefreshCw, Plus, Download, Upload, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TabType } from '../types';

interface CustomerToolbarProps {
  activeTab: TabType;
  onRefresh: () => void;
  onAddNew: () => void;
  onFilter?: () => void;
  onImport?: () => void;
  onExport?: () => void;
}

export function CustomerToolbar({ 
  activeTab, 
  onRefresh, 
  onAddNew, 
  onFilter, 
  onImport, 
  onExport 
}: CustomerToolbarProps) {
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
        {/* 左侧：筛选和设置 */}
        <div className="flex items-center space-x-3">
          {/* 筛选按钮 */}
          <button 
            onClick={onFilter}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
          >
            <Filter className="h-4 w-4" />
            <span>高级筛选</span>
          </button>

          {/* 设置按钮 */}
          <button className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-300 dark:border-gray-600">
            <Settings className="h-4 w-4" />
            <span>设置</span>
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
          <button 
            onClick={onImport}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
          >
            <Upload className="h-4 w-4" />
            <span>导入</span>
          </button>

          {/* 导出按钮 */}
          <button 
            onClick={onExport}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
          >
            <Download className="h-4 w-4" />
            <span>导出</span>
          </button>

          {/* 添加新项目按钮 */}
          <Button
            onClick={onAddNew}
            className="space-x-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>添加{getTabLabel(activeTab)}</span>
          </Button>
        </div>
      </div>

      {/* 快速操作提示 */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>💡 提示：使用顶部搜索框快速查找，或点击高级筛选进行精确筛选</p>
      </div>
    </div>
  );
}
