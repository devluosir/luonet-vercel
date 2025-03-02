'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Edit2, Trash2, Copy, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { InvoiceHistory, InvoiceHistoryFilters } from '@/types/invoice-history';
import { getInvoiceHistory, deleteInvoiceHistory, importInvoiceHistory } from '@/utils/invoiceHistory';

export default function InvoiceHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<InvoiceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<InvoiceHistoryFilters>({
    search: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // 处理搜索
  const getFilteredHistory = useCallback((items: InvoiceHistory[]) => {
    return items.filter(item => {
      if (!filters.search) return true;
      
      const searchTerm = filters.search.toLowerCase().trim();
      
      // 匹配客户名称
      if (item.customerName.toLowerCase().includes(searchTerm)) return true;
      
      // 匹配发票号
      if (item.invoiceNo.toLowerCase().includes(searchTerm)) return true;
      
      // 匹配金额
      const amount = item.totalAmount.toString();
      if (amount.includes(searchTerm)) return true;
      
      return false;
    });
  }, [filters.search]);

  // 加载历史记录
  useEffect(() => {
    const loadHistory = () => {
      setIsLoading(true);
      try {
        const results = getInvoiceHistory();
        const filteredResults = getFilteredHistory(results);
        setHistory(filteredResults);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [filters, getFilteredHistory]);

  // 处理删除
  const handleDelete = (id: string) => {
    const success = deleteInvoiceHistory(id);
    if (success) {
      setHistory(prev => prev.filter(item => item.id !== id));
      setShowDeleteConfirm(null);
    }
  };

  // 处理编辑
  const handleEdit = (id: string) => {
    router.push(`/invoice/edit/${id}`);
  };

  // 处理复制
  const handleCopy = (id: string) => {
    router.push(`/invoice/copy/${id}`);
  };

  // 处理导出
  const handleExport = () => {
    try {
      const results = getInvoiceHistory();
      // 如果有选中的记录，只导出选中的记录
      const dataToExport = selectedIds.size > 0 
        ? results.filter(item => selectedIds.has(item.id))
        : results;
      
      const jsonData = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // 生成文件名
      let fileName = '';
      if (selectedIds.size === 1) {
        // 如果只选择了一条记录，使用其发票号
        const selectedItem = dataToExport[0];
        fileName = `IH-${selectedItem.invoiceNo}-${format(new Date(), 'yyyy-MM-dd')}`;
      } else {
        // 如果选择了多条或全部，使用日期
        const prefix = selectedIds.size > 0 ? `selected-${selectedIds.size}` : 'all';
        fileName = `IH-history-${prefix}-${format(new Date(), 'yyyy-MM-dd')}`;
      }
      
      a.download = `${fileName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting history:', error);
      alert('Export failed, please try again later.');
    }
  };

  // 处理导入
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    // 支持更多的 MIME 类型和文件扩展名
    input.accept = '.json,application/json,text/json,text/plain';
    input.style.display = 'none'; // 隐藏输入元素
    document.body.appendChild(input); // 添加到 DOM 中以确保在移动设备上正常工作

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            try {
              const success = importInvoiceHistory(result);
              if (success) {
                // 重新加载历史记录
                const results = getInvoiceHistory();
                setHistory(results);
                alert('Import successful!');
              } else {
                throw new Error('Import failed');
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error('Error importing history:', errorMessage);
              alert('Import failed, please check if the file format is correct.');
            }
          }
        };
        reader.readAsText(file);
      }
      // 清理 DOM
      document.body.removeChild(input);
    };

    // 如果用户取消选择，也要清理 DOM
    input.oncancel = () => {
      document.body.removeChild(input);
    };

    input.click();
  };

  // 处理多选
  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map(item => item.id)));
    }
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    try {
      const success = Array.from(selectedIds).every(id => deleteInvoiceHistory(id));
      if (success) {
        setHistory(prev => prev.filter(item => !selectedIds.has(item.id)));
        setSelectedIds(new Set());
        setShowBatchDeleteConfirm(false);
      } else {
        alert('Some records deletion failed, please refresh the page and try again.');
      }
    } catch (error) {
      console.error('Error batch deleting:', error);
      alert('Deletion failed, please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* 返回按钮 */}
        <Link href="/invoice" className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Invoice
        </Link>

        {/* 标题和搜索栏 */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-row justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-[#F5F5F7] whitespace-nowrap">
              Invoice History
            </h1>
            <div className="flex flex-row gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowBatchDeleteConfirm(true)}
                  className="h-10 px-4 rounded-xl text-sm font-medium
                    bg-red-600 hover:bg-red-700
                    text-white
                    flex items-center gap-2 whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Delete</span>
                    <span className="inline-flex">({selectedIds.size})</span>
                  </button>
              )}
              <button
                onClick={handleExport}
                className="h-10 px-4 rounded-xl text-sm font-medium
                  bg-[#007AFF] hover:bg-[#0066CC]
                  text-white
                  flex items-center gap-2 whitespace-nowrap"
              >
                <Upload className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Export</span>
                {selectedIds.size > 0 && <span className="inline-flex">({selectedIds.size})</span>}
              </button>
              <button
                onClick={handleImport}
                className="h-10 px-4 rounded-xl text-sm font-medium
                  bg-emerald-600 hover:bg-emerald-700
                  text-white
                  hover:shadow-md
                  flex items-center gap-2 whitespace-nowrap"
              >
                <Download className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Import</span>
              </button>
            </div>
          </div>
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by customer/invoice number/amount..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full h-10 pl-10 pr-4 rounded-xl
                bg-white dark:bg-[#2C2C2E]
                border border-gray-200 dark:border-[#3A3A3C]
                text-gray-900 dark:text-[#F5F5F7]
                placeholder-gray-500 dark:placeholder-[#98989D]
                focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            {filters.search && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="sr-only">Clear search</span>
                ×
              </button>
            )}
          </div>
        </div>

        {/* 历史记录列表 */}
        <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-8 text-center text-gray-500 dark:text-[#98989D]">
                Loading...
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[#3A3A3C]">
                      <th className="w-10 px-2 sm:px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={history.length > 0 && selectedIds.size === history.length}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 dark:border-[#3A3A3C]
                            text-[#007AFF] 
                            focus:ring-[#007AFF]
                            bg-white dark:bg-[#3A3A3C]"
                        />
                      </th>
                      <th className="w-1/4 px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-[#98989D] hidden lg:table-cell">Customer Name</th>
                      <th className="w-[45%] sm:w-2/3 lg:w-1/3 px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-[#98989D]">Invoice No.</th>
                      <th className="w-1/6 px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-[#98989D] hidden lg:table-cell">Amount</th>
                      <th className="w-[35%] sm:w-1/4 lg:w-1/6 px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-[#98989D]">Created At</th>
                      <th className="w-[20%] sm:w-[100px] px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-[#98989D]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id} className="border-b border-gray-200 dark:border-[#3A3A3C] last:border-0 hover:bg-gray-50 dark:hover:bg-[#3A3A3C]">
                        <td className="w-10 px-2 sm:px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => handleSelect(item.id)}
                            className="rounded border-gray-300 dark:border-[#3A3A3C]
                              text-[#007AFF]
                              focus:ring-[#007AFF]
                              bg-white dark:bg-[#3A3A3C]"
                          />
                        </td>
                        <td className="w-1/4 px-2 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-[#F5F5F7] hidden lg:table-cell whitespace-nowrap overflow-hidden text-ellipsis">{item.customerName}</td>
                        <td className="w-[45%] sm:w-2/3 lg:w-1/3 px-2 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-[#F5F5F7] whitespace-nowrap overflow-hidden text-ellipsis">{item.invoiceNo}</td>
                        <td className="w-1/6 px-2 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-[#F5F5F7] hidden lg:table-cell">{item.currency === 'USD' ? '$' : '¥'}{item.totalAmount.toFixed(2)}</td>
                        <td className="w-[35%] sm:w-1/4 lg:w-1/6 px-2 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-[#F5F5F7] whitespace-nowrap overflow-hidden text-ellipsis">
                          {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                        </td>
                        <td className="w-[20%] sm:w-[100px] px-2 sm:px-4 py-2.5">
                          <div className="flex items-center gap-0.5 sm:gap-2">
                            <button
                              onClick={() => handleEdit(item.id)}
                              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#48484A]
                                text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleCopy(item.id)}
                              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#48484A]
                                text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
                              title="Copy"
                            >
                              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(item.id)}
                              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#48484A]
                                text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {history.length === 0 && (
                  <div className="py-8 text-center text-gray-500 dark:text-[#98989D]">
                    No records found
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-[#98989D] mb-6">
              Are you sure you want to delete this history record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-gray-100 dark:bg-[#3A3A3C]
                  text-gray-900 dark:text-[#F5F5F7]
                  hover:bg-gray-200 dark:hover:bg-[#48484A]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-red-600 hover:bg-red-700
                  text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除确认弹窗 */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] mb-4">
              Confirm Batch Deletion
            </h3>
            <p className="text-gray-600 dark:text-[#98989D] mb-6">
              Are you sure you want to delete the selected {selectedIds.size} history records? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-gray-100 dark:bg-[#3A3A3C]
                  text-gray-900 dark:text-[#F5F5F7]
                  hover:bg-gray-200 dark:hover:bg-[#48484A]"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-red-600 hover:bg-red-700
                  text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 