import { Search, Filter, Download, Upload, RefreshCw, Plus } from 'lucide-react';
import { TabType } from '../types';

interface CustomerToolbarProps {
  activeTab: TabType;
  onRefresh: () => void;
  onAddNew: () => void;
}

export function CustomerToolbar({ activeTab, onRefresh, onAddNew }: CustomerToolbarProps) {
  const getTabLabel = () => {
    switch (activeTab) {
      case 'customers': return '客户';
      case 'suppliers': return '供应商';
      case 'consignees': return '收货人';
      default: return '';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={`搜索${getTabLabel()}...`}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
            筛选
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Download className="w-4 h-4" />
            导出
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Upload className="w-4 h-4" />
            导入
          </button>
          <button 
            onClick={onAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加{getTabLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}
