import { Download, Archive, FileText } from 'lucide-react';
import { executeExport, downloadFile } from '@/utils/historyImportExport';
import type { HistoryType } from '@/utils/historyImportExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: HistoryType;
  filteredData: any[];
}

export default function ExportModal({
  isOpen,
  onClose,
  activeTab,
  filteredData
}: ExportModalProps) {
  if (!isOpen) return null;

  // 导出
  const handleExport = (type: 'current' | 'all' | 'filtered') => {
    const { jsonData, fileName, exportStats } = executeExport(type, activeTab, filteredData);
    if (downloadFile(jsonData, fileName)) {
      alert('导出成功！\n' + exportStats);
      onClose();
    } else {
      alert('导出失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              导出历史记录
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              选择导出方式
            </p>
          </div>
        </div>
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleExport('current')}
            className="w-full p-4 text-left bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  导出当前选项卡数据
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  仅导出当前显示的{activeTab === 'quotation' ? '报价单' : activeTab === 'confirmation' ? '销售确认' : activeTab === 'invoice' ? '发票' : '采购单'}数据
                </div>
              </div>
            </div>
          </button>
          <button
            onClick={() => handleExport('all')}
            className="w-full p-4 text-left bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-green-200 dark:border-green-800 hover:from-green-100 hover:to-emerald-100 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Archive className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  导出所有历史记录
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  导出所有类型的完整历史数据
                </div>
              </div>
            </div>
          </button>
          <button
            onClick={() => handleExport('filtered')}
            className="w-full p-4 text-left bg-gradient-to-r from-purple-50 to-violet-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-violet-100 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  导出筛选结果
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  导出当前筛选条件下的数据
                </div>
              </div>
            </div>
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
} 