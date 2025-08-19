import { Download, Archive, FileText, CheckCircle, XCircle, X, CheckSquare } from 'lucide-react';
import { useState } from 'react';
import { executeExport, downloadFile } from '@/utils/historyImportExport';
import type { HistoryType, HistoryItem } from '@/utils/historyImportExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: HistoryType;
  filteredData?: HistoryItem[];
  selectedIds?: Set<string>;
}

export default function ExportModal({
  isOpen,
  onClose,
  activeTab,
  filteredData,
  selectedIds
}: ExportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; content: string } | null>(null);

  if (!isOpen) return null;

  // 显示消息
  const showMessage = (type: 'success' | 'error', content: string) => {
    setMessage({ type, content });
    if (type === 'success') {
      // 成功消息2秒后自动关闭
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 2000);
    }
  };

  // 清除消息
  const clearMessage = () => {
    setMessage(null);
  };

  // 导出
  const handleExport = async (type: 'current' | 'all' | 'filtered' | 'selected') => {
    setIsLoading(true);
    clearMessage();
    
    try {
      const { jsonData, fileName, exportStats } = executeExport(type, activeTab, filteredData, selectedIds);
      if (downloadFile(jsonData, fileName)) {
        showMessage('success', `导出成功！\n${exportStats}`);
      } else {
        showMessage('error', '导出失败，请重试');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导出失败，请重试';
      showMessage('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCount = selectedIds?.size || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl relative">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="关闭对话框"
        >
          <X className="w-4 h-4" />
        </button>

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

        {/* 消息显示 */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start space-x-3">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className={`text-sm font-medium ${
                  message.type === 'success' 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {message.type === 'success' ? '导出成功' : '导出失败'}
                </div>
                <div className={`text-sm mt-1 whitespace-pre-line ${
                  message.type === 'success' 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {message.content}
                </div>
              </div>
              {message.type !== 'success' && (
                <button
                  onClick={clearMessage}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {/* 选中单据导出按钮 */}
          {selectedCount > 0 && (
            <button
              onClick={() => handleExport('selected')}
              disabled={isLoading}
              className="w-full p-4 text-left bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 hover:from-orange-100 hover:to-red-100 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-orange-600 dark:border-orange-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    导出选中单据 ({selectedCount} 条)
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    仅导出当前选中的单据数据
                  </div>
                </div>
              </div>
            </button>
          )}

          <button
            onClick={() => handleExport('current')}
            disabled={isLoading}
            className="w-full p-4 text-left bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  导出当前选项卡数据
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  仅导出当前显示的{activeTab === 'quotation' ? '报价单' : activeTab === 'confirmation' ? '销售确认' : activeTab === 'invoice' ? '发票' : activeTab === 'purchase' ? '采购单' : '装箱单'}数据
                </div>
              </div>
            </div>
          </button>
          <button
            onClick={() => handleExport('all')}
            disabled={isLoading}
            className="w-full p-4 text-left bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-green-200 dark:border-green-800 hover:from-green-100 hover:to-emerald-100 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-green-600 dark:border-green-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Archive className="w-4 h-4 text-green-600 dark:text-green-400" />
                )}
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
            disabled={isLoading}
            className="w-full p-4 text-left bg-gradient-to-r from-purple-50 to-violet-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-violet-100 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-purple-600 dark:border-purple-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                )}
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
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
} 