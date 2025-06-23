'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Edit, Trash2, Download, Upload, FileText, Eye } from 'lucide-react';
import { getPurchaseHistory, deletePurchaseHistory, exportPurchaseHistory, importPurchaseHistory, PurchaseHistory } from '@/utils/purchaseHistory';
import { generatePurchaseOrderPDF } from '@/utils/purchasePdfGenerator';
import { PurchaseOrderData } from '@/types/purchase';
import { Footer } from '@/components/Footer';

export default function PurchaseHistoryPage() {
  const [history, setHistory] = useState<PurchaseHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadHistory();
  }, [searchTerm]);

  const loadHistory = () => {
    const data = getPurchaseHistory({ search: searchTerm });
    setHistory(data);
    setSelectedIds(new Set());
  };

  const handleDelete = async (id: string) => {
    setShowDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    setIsDeleting(showDeleteConfirm);
    try {
      const success = deletePurchaseHistory([showDeleteConfirm]);
      if (success) {
        loadHistory();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('删除失败');
    } finally {
      setIsDeleting(null);
      setShowDeleteConfirm(null);
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setShowBatchDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    if (selectedIds.size === 0) return;
    try {
      const success = deletePurchaseHistory(Array.from(selectedIds));
      if (success) {
        loadHistory();
      } else {
        alert('批量删除失败');
      }
    } catch (error) {
      console.error('Error during bulk delete:', error);
      alert('批量删除失败');
    } finally {
      setShowBatchDeleteConfirm(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSelectedIds = new Set(prev);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      return newSelectedIds;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(history.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleEdit = (id: string) => {
    const record = history.find(item => item.id === id);
    if (record) {
      // 将数据注入到全局变量中
      (window as any).__PURCHASE_DATA__ = record.data;
      (window as any).__EDIT_ID__ = id;
      router.push('/purchase');
    }
  };

  const handleExport = () => {
    try {
      const allHistory = getPurchaseHistory({ search: searchTerm });
      const dataToExport = selectedIds.size > 0
        ? allHistory.filter(item => selectedIds.has(item.id))
        : allHistory;

      if (dataToExport.length === 0) {
        alert("没有可导出的记录。");
        return;
      }

      const jsonData = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const date = new Date().toISOString().split('T')[0];
      const prefix = selectedIds.size > 0 ? `selected-${selectedIds.size}` : 'all';
      a.download = `purchase_history_${prefix}_${date}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting purchase history:', error);
      alert('导出失败');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          try {
            const success = importPurchaseHistory(content);
            if (success) {
              loadHistory();
              alert('导入成功');
            } else {
              alert('导入失败');
            }
          } catch (error) {
            console.error('Error importing:', error);
            alert('导入失败');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handlePreview = async (id: string) => {
    const record = history.find(item => item.id === id);
    if (record) {
      setIsPreviewing(id);
      try {
        const pdfBlob = await generatePurchaseOrderPDF(record.data as PurchaseOrderData, true);
        const pdfDataUrl = URL.createObjectURL(pdfBlob);
        setPreviewUrl(pdfDataUrl);
      } catch (error) {
        console.error('Error generating preview:', error);
        alert('生成预览失败');
      } finally {
        setIsPreviewing(null);
      }
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'CNY': '¥'
    };
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link href="/purchase" className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7] transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Purchase Order
          </Link>

          {/* 标题和操作按钮 */}
          <div className="flex items-center justify-between mt-6 mb-8">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-[#F5F5F7]">
              Purchase Order History
            </h1>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center gap-2"
                    title="批量删除"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>删除 ({selectedIds.size})</span>
                  </button>
              )}
              <button
                onClick={handleExport}
                className="h-10 px-4 rounded-xl text-sm font-medium bg-[#007AFF] hover:bg-[#0066CC] text-white flex items-center gap-2 whitespace-nowrap"
                title="Export"
              >
                <Upload className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Export</span>
                {selectedIds.size > 0 && <span className="inline-flex">({selectedIds.size})</span>}
              </button>
              <button
                onClick={handleImport}
                className="h-10 px-4 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md flex items-center gap-2 whitespace-nowrap"
                title="Import"
              >
                <Download className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Import</span>
              </button>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索供应商名称或订单号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* 历史记录列表 */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-lg overflow-hidden">
            {history.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">暂无历史记录</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-[#3A3A3C]">
                    <tr>
                      <th className="px-4 md:px-6 py-4 w-10 text-left">
                        <input 
                          type="checkbox"
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:checked:bg-blue-500"
                          onChange={handleSelectAll}
                          checked={history.length > 0 && selectedIds.size === history.length}
                          disabled={history.length === 0}
                        />
                      </th>
                      <th className="hidden md:table-cell px-4 md:px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-1/6">
                        供应商
                      </th>
                      <th className="px-4 md:px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-1/4 md:w-1/5">
                        订单号
                      </th>
                      <th className="px-4 md:px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-1/4 md:w-1/6">
                        金额
                      </th>
                      <th className="hidden lg:table-cell px-4 md:px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-1/6">
                        创建时间
                      </th>
                      <th className="hidden md:table-cell px-4 md:px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-1/6">
                        更新时间
                      </th>
                      <th className="px-4 md:px-6 py-4 text-right text-sm font-medium text-gray-700 dark:text-gray-300 w-1/4 md:w-1/6">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#3A3A3C] transition-colors">
                        <td className="px-4 md:px-6 py-4 w-10">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:checked:bg-blue-500"
                            checked={selectedIds.has(item.id)}
                            onChange={() => handleSelect(item.id)}
                          />
                        </td>
                        <td className="hidden md:table-cell px-4 md:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {item.supplierName || '未填写'}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {item.orderNo || '未填写'}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {formatCurrency(item.totalAmount, item.currency)}
                        </td>
                        <td className="hidden lg:table-cell px-4 md:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="hidden md:table-cell px-4 md:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(item.updatedAt)}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 md:gap-2">
                            <button
                              onClick={() => handlePreview(item.id)}
                              disabled={isPreviewing === item.id}
                              className="p-1.5 md:p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors disabled:opacity-50"
                              title="预览"
                            >
                              {isPreviewing === item.id ? (
                                <svg className="animate-spin w-3.5 h-3.5 md:w-4 md:h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleEdit(item.id)}
                              className="p-1.5 md:p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                              title="编辑"
                            >
                              <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={isDeleting === item.id}
                              className="p-1.5 md:p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                              title="删除"
                            >
                              {isDeleting === item.id ? (
                                <svg className="animate-spin w-3.5 h-3.5 md:w-4 md:h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closePreview}>
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
                预览采购订单
              </h3>
              <button
                onClick={closePreview}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-gray-100 dark:bg-[#3A3A3C]
                  text-gray-900 dark:text-[#F5F5F7]
                  hover:bg-gray-200 dark:hover:bg-[#48484A] transition-colors"
              >
                关闭
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={previewUrl} className="w-full h-full border-none rounded-lg" title="PDF Preview" />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] mb-4">
              确认删除
            </h3>
            <p className="text-gray-600 dark:text-[#98989D] mb-6">
              您确定要删除此记录吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-gray-100 dark:bg-[#3A3A3C]
                  text-gray-900 dark:text-[#F5F5F7]
                  hover:bg-gray-200 dark:hover:bg-[#48484A]"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-red-600 hover:bg-red-700
                  text-white"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch delete confirmation dialog */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] mb-4">
              确认批量删除
            </h3>
            <p className="text-gray-600 dark:text-[#98989D] mb-6">
              您确定要删除选中的 {selectedIds.size} 条记录吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-gray-100 dark:bg-[#3A3A3C]
                  text-gray-900 dark:text-[#F5F5F7]
                  hover:bg-gray-200 dark:hover:bg-[#48484A]"
              >
                取消
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-red-600 hover:bg-red-700
                  text-white"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
} 