import { useState, useEffect, useCallback } from 'react';
import { getPackingHistory, deletePackingHistory, exportPackingHistory, importPackingHistory } from '@/utils/packingHistory';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  FileText, 
  Package,
  Search, 
  Filter, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  Copy, 
  Eye,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
  Archive,
  Star,
  X
} from 'lucide-react';

interface PackingHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  consigneeName: string;
  invoiceNo: string;
  orderNo: string;
  totalAmount: number;
  currency: string;
  documentType: 'proforma' | 'packing' | 'both';
  data: any;
}

interface Filters {
  search: string;
  type: any;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  amountRange: 'all' | 'low' | 'medium' | 'high';
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface PackingHistoryTabProps {
  filters: Filters;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  onEdit: (id: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  mainColor: string;
  refreshKey: number;
}

export default function PackingHistoryTab({
  filters,
  sortConfig,
  onSort,
  onEdit,
  onCopy,
  onDelete,
  onPreview,
  selectedIds,
  onSelect,
  onSelectAll,
  mainColor,
  refreshKey
}: PackingHistoryTabProps) {
  const [history, setHistory] = useState<PackingHistory[]>([]);
  const [loading, setLoading] = useState(false);

  // 过滤历史记录
  const filterHistory = useCallback((items: PackingHistory[]) => {
    return items.filter(item => {
      // 搜索过滤
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = 
          item.consigneeName.toLowerCase().includes(searchLower) ||
          item.invoiceNo.toLowerCase().includes(searchLower) ||
          item.orderNo.toLowerCase().includes(searchLower);
        
        if (!matches) return false;
      }
      
      // 文档类型过滤 - 只有当类型是装箱单相关类型时才进行过滤
      if (filters.type !== 'all' && filters.type !== 'packing') {
        // 如果过滤类型不是 'all' 且不是 'packing'，并且不是装箱单相关类型，则不显示
        if (!['proforma', 'packing', 'both'].includes(filters.type)) {
          return false;
        }
      }
      
      // 如果是装箱单相关的具体类型过滤
      if (['proforma', 'packing', 'both'].includes(filters.type) && item.documentType !== filters.type) {
        return false;
      }
      
      // 日期范围过滤
      if (filters.dateRange !== 'all') {
        const itemDate = new Date(item.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - itemDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        switch (filters.dateRange) {
          case 'today':
            if (diffDays > 1) return false;
            break;
          case 'week':
            if (diffDays > 7) return false;
            break;
          case 'month':
            if (diffDays > 30) return false;
            break;
          case 'year':
            if (diffDays > 365) return false;
            break;
        }
      }
      
      // 金额范围过滤
      if (filters.amountRange !== 'all') {
        const amount = item.totalAmount;
        switch (filters.amountRange) {
          case 'low':
            if (amount >= 1000) return false;
            break;
          case 'medium':
            if (amount < 1000 || amount >= 10000) return false;
            break;
          case 'high':
            if (amount < 10000) return false;
            break;
        }
      }
      
      return true;
    });
  }, [filters]);

  // 排序历史记录
  const sortHistory = useCallback((items: PackingHistory[]) => {
    if (!sortConfig.key) return items;

    return [...items].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof PackingHistory];
      const bValue = b[sortConfig.key as keyof PackingHistory];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      return 0;
    });
  }, [sortConfig]);

  // 加载历史记录
  const loadHistory = useCallback(() => {
    setLoading(true);
    try {
      const rawHistory = getPackingHistory();
      const filteredHistory = filterHistory(rawHistory);
      const sortedHistory = sortHistory(filteredHistory);
      setHistory(sortedHistory);
    } catch (error) {
      // 静默处理错误
    } finally {
      setLoading(false);
    }
  }, [filterHistory, sortHistory]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-teal-500" />
      : <ChevronDown className="h-4 w-4 text-teal-500" />;
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500">加载中...</div>;
  }

  if (history.length === 0) {
    return <div className="py-8 text-center text-gray-400">暂无装箱单历史记录</div>;
  }

  return (
    <div className="overflow-hidden">
      {/* 表头 */}
      <div className={`bg-gradient-to-r px-4 py-2 sm:py-4 border-b border-gray-200 dark:border-gray-600 ${
        mainColor === 'teal' ? 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20' :
        'from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800'
      }`}>
        <div className="flex items-center w-full">
          <div className="w-6 flex-shrink-0 flex items-center justify-center">
            <input 
              type="checkbox"
              checked={selectedIds.size === history.length && history.length > 0}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-400 
                         bg-white dark:bg-gray-800
                         text-teal-600 dark:text-teal-400 
                         focus:ring-teal-500 focus:ring-2
                         checked:bg-teal-600 dark:checked:bg-teal-500
                         checked:border-teal-600 dark:checked:border-teal-500"
            />
          </div>
          <button
            onClick={() => onSort('consigneeName')}
            className="flex-1 min-w-0 truncate font-semibold pl-2 text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center group whitespace-nowrap text-gray-900 dark:text-white"
          >
            收货人
            <span className="ml-1 flex items-center">{renderSortIcon('consigneeName')}</span>
          </button>
          <button
            onClick={() => onSort('invoiceNo')}
            className="w-24 sm:w-40 flex-shrink-0 font-semibold pl-2 text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center group whitespace-nowrap text-gray-900 dark:text-white"
          >
            发票号
            <span className="ml-1 flex items-center">{renderSortIcon('invoiceNo')}</span>
          </button>
          <button
            onClick={() => onSort('totalAmount')}
            className="hidden md:flex w-36 flex-shrink-0 font-semibold pl-2 text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center group whitespace-nowrap text-gray-900 dark:text-white"
          >
            金额
            <span className="ml-1 flex items-center">{renderSortIcon('totalAmount')}</span>
          </button>
          <button
            onClick={() => onSort('updatedAt')}
            className="hidden lg:flex w-40 flex-shrink-0 font-semibold pl-2 text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center group whitespace-nowrap text-gray-900 dark:text-white"
          >
            修改时间
            <span className="ml-1 flex items-center">{renderSortIcon('updatedAt')}</span>
          </button>
          <button
            onClick={() => onSort('createdAt')}
            className="hidden xl:flex w-40 flex-shrink-0 font-semibold pl-2 text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center group whitespace-nowrap text-gray-900 dark:text-white"
          >
            创建时间
            <span className="ml-1 flex items-center">{renderSortIcon('createdAt')}</span>
          </button>
          <div className="w-10 sm:w-32 flex-shrink-0 flex items-center justify-center font-semibold text-gray-900 dark:text-white">
            操作
          </div>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {history.map((item) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <div
              key={item.id}
              className={`px-4 py-2 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 ${
                isSelected ? 'bg-teal-50 dark:bg-teal-900/20 ring-1 ring-teal-200 dark:ring-teal-800' : ''
              }`}
            >
              <div className="flex items-center w-full">
                <div className="w-6 flex-shrink-0 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect(item.id, e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-400 
                               bg-white dark:bg-gray-800
                               text-teal-600 dark:text-teal-400 
                               focus:ring-teal-500 focus:ring-2
                               checked:bg-teal-600 dark:checked:bg-teal-500
                               checked:border-teal-600 dark:checked:border-teal-500"
                  />
                </div>
                <div className="flex-1 min-w-0 truncate text-xs sm:text-sm font-medium text-gray-900 dark:text-white pl-2" title={item.consigneeName}>
                  {(item.consigneeName || '-').split('\n')[0]?.trim() || item.consigneeName || '-'}
                </div>
                <div className="w-24 sm:w-40 flex-shrink-0">
                  <div className="whitespace-nowrap text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 font-mono">
                    {item.invoiceNo || '-'}
                  </div>
                </div>
                <div className="hidden md:block w-36 flex-shrink-0">
                  <span className="whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {item.currency} {item.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="hidden lg:block w-40 flex-shrink-0">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </div>
                </div>
                <div className="hidden xl:block w-40 flex-shrink-0">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {format(new Date(item.updatedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </div>
                </div>
                <div className="w-10 sm:w-32 flex-shrink-0 flex items-center justify-center">
                  <div className="flex items-center justify-end space-x-0.5 sm:space-x-1">
                    <button
                      onClick={() => onPreview(item.id)}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/20 rounded-lg transition-all duration-200"
                      title="预览"
                    >
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(item.id)}
                      className="hidden sm:inline-flex p-1.5 sm:p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 rounded-lg transition-all duration-200"
                      title="编辑"
                    >
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => onCopy(item.id)}
                      className="hidden sm:inline-flex p-1.5 sm:p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:text-green-400 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                      title="复制"
                    >
                      <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="hidden sm:inline-flex p-1.5 sm:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 金额统计 */}
      {history.length > 0 && (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-t border-teal-200 dark:border-teal-800 px-4 py-2 sm:py-3">
          <div className="text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
            {Object.entries(history.reduce((acc, item) => {
              if (!acc[item.currency]) acc[item.currency] = 0;
              acc[item.currency] += item.totalAmount;
              return acc;
            }, {} as Record<string, number>)).map(([currency, total]) => (
              <span key={currency} className="mr-4">
                {currency} 合计：
                <span className="font-bold text-teal-600 dark:text-teal-400">{total.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 