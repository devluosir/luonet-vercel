'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Calendar, Filter, Edit2, Trash2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { QuotationHistory, QuotationHistoryFilters } from '@/types/quotation-history';
import { getQuotationHistory, deleteQuotationHistory } from '@/utils/quotationHistory';

export default function QuotationHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<QuotationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<QuotationHistoryFilters>({
    search: '',
    type: 'all'
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // 加载历史记录
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const results = await getQuotationHistory(filters);
        setHistory(results);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [filters]);

  // 处理删除
  const handleDelete = async (id: string) => {
    const success = await deleteQuotationHistory(id);
    if (success) {
      setHistory(prev => prev.filter(item => item.id !== id));
      setShowDeleteConfirm(null);
    }
  };

  // 处理编辑
  const handleEdit = (id: string) => {
    router.push(`/quotation/edit/${id}`);
  };

  // 处理复制
  const handleCopy = (id: string) => {
    router.push(`/quotation/copy/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* 返回按钮 */}
        <Link href="/quotation" className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回报价
        </Link>

        {/* 标题和搜索栏 */}
        <div className="mt-4 sm:mt-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-[#F5F5F7] mb-6">
            报价历史记录
          </h1>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* 搜索框 */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索客户名称或报价单号..."
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
              </div>
            </div>

            {/* 类型筛选 */}
            <div className="w-full sm:w-48">
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full h-10 px-4 rounded-xl
                  bg-white dark:bg-[#2C2C2E]
                  border border-gray-200 dark:border-[#3A3A3C]
                  text-gray-900 dark:text-[#F5F5F7]
                  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
              >
                <option value="all">全部类型</option>
                <option value="quotation">报价单</option>
                <option value="confirmation">订单确认</option>
              </select>
            </div>
          </div>

          {/* 历史记录列表 */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#3A3A3C]">
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 dark:text-[#98989D]">客户名称</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 dark:text-[#98989D]">报价单号</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 dark:text-[#98989D]">类型</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 dark:text-[#98989D]">金额</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 dark:text-[#98989D]">创建时间</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 dark:text-[#98989D]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 dark:border-[#3A3A3C] last:border-0">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-[#F5F5F7]">{item.customerName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-[#F5F5F7]">{item.quotationNo}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-[#F5F5F7]">
                        {item.type === 'quotation' ? '报价单' : '订单确认'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-[#F5F5F7]">
                        {item.currency === 'USD' ? '$' : '¥'}{item.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-[#F5F5F7]">
                        {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(item.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C]
                              text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCopy(item.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C]
                              text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
                            title="复制"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(item.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C]
                              text-red-600 hover:text-red-700"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {history.length === 0 && (
              <div className="py-12 text-center text-gray-500 dark:text-[#98989D]">
                暂无历史记录
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] mb-4">
              确认删除
            </h3>
            <p className="text-gray-600 dark:text-[#98989D] mb-6">
              确定要删除这条历史记录吗？此操作无法撤销。
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
                onClick={() => handleDelete(showDeleteConfirm)}
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
    </div>
  );
} 