import { useState, useEffect, useCallback } from 'react';
import { getInvoiceHistory, deleteInvoiceHistory, exportInvoiceHistory, importInvoiceHistory } from '@/utils/invoiceHistory';
import { generateInvoicePDF } from '@/utils/invoicePdfGenerator';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  FileText, 
  Receipt, 
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

interface InvoiceHistory {
  id: string;
  createdAt: string;
  customerName: string;
  invoiceNo: string;
  totalAmount: number;
  currency: string;
  data: any;
  updatedAt: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface Filters {
  search: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  amountRange: 'all' | 'low' | 'medium' | 'high';
}

interface Props {
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
  mainColor?: string;
  refreshKey?: number;
}

export default function InvoiceHistoryTab({ 
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
}: Props) {
  const [history, setHistory] = useState<InvoiceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载发票历史
  const loadHistory = useCallback(() => {
    setLoading(true);
    try {
      let results = getInvoiceHistory();
      // 只保留真正的发票数据
      results = results.filter(item => !!item.invoiceNo);
      // 搜索过滤
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(item =>
          item.customerName.toLowerCase().includes(searchLower) ||
          item.invoiceNo.toLowerCase().includes(searchLower) ||
          (item.data?.customerPO && item.data.customerPO.toLowerCase().includes(searchLower))
        );
      }
      // 日期范围过滤
      if (filters.dateRange !== 'all') {
        const now = new Date();
        results = results.filter(item => {
          const itemDate = new Date(item.createdAt);
          const diffTime = Math.abs(now.getTime() - itemDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          switch (filters.dateRange) {
            case 'today': return diffDays <= 1;
            case 'week': return diffDays <= 7;
            case 'month': return diffDays <= 30;
            case 'year': return diffDays <= 365;
            default: return true;
          }
        });
      }
      // 金额范围过滤
      if (filters.amountRange !== 'all') {
        results = results.filter(item => {
          const amount = item.totalAmount;
          switch (filters.amountRange) {
            case 'low': return amount < 10000;
            case 'medium': return amount >= 10000 && amount < 100000;
            case 'high': return amount >= 100000;
            default: return true;
          }
        });
      }
      // 排序
      if (sortConfig.key) {
        results = [...results].sort((a, b) => {
          const aValue = a[sortConfig.key as keyof InvoiceHistory];
          const bValue = b[sortConfig.key as keyof InvoiceHistory];
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
      }
      setHistory(results);
    } finally {
      setLoading(false);
    }
  }, [filters, sortConfig]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-blue-500" />
      : <ChevronDown className="h-4 w-4 text-blue-500" />;
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500">加载中...</div>;
  }

  if (history.length === 0) {
    return <div className="py-8 text-center text-gray-400">暂无发票历史记录</div>;
  }

  return (
    <div className="overflow-hidden">
      {/* 表头 */}
      <div className={`bg-gradient-to-r px-4 py-4 border-b border-gray-200 dark:border-gray-600 ${
        mainColor === 'blue' ? 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10' :
        mainColor === 'green' ? 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20' :
        mainColor === 'purple' ? 'from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20' :
        mainColor === 'orange' ? 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20' :
        'from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800'
      }`}>
        <div className="flex items-center w-full">
          <div className="w-6 flex-shrink-0 flex items-center justify-center">
            <input 
              type="checkbox"
              checked={selectedIds.size === history.length && history.length > 0}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:ring-2"
            />
          </div>
          <button
            onClick={() => onSort('customerName')}
            className="flex-1 min-w-0 truncate font-semibold pl-2 text-left hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center group whitespace-nowrap text-gray-900 dark:text-white"
          >
            客户名称
            <span className="ml-1 flex items-center">{renderSortIcon('customerName')}</span>
          </button>
          <button
            onClick={() => onSort('invoiceNo')}
            className="w-24 sm:w-40 flex-shrink-0 font-semibold text-gray-900 dark:text-white text-left hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center group whitespace-nowrap"
          >
            发票号
            <span className="ml-1 flex items-center">{renderSortIcon('invoiceNo')}</span>
          </button>
          <button
            onClick={() => onSort('totalAmount')}
            className="hidden md:flex w-36 flex-shrink-0 font-semibold text-gray-900 dark:text-white text-left hover:text-purple-600 dark:hover:text-purple-400 transition-colors items-center group whitespace-nowrap"
          >
            金额
            <span className="ml-1 flex items-center">{renderSortIcon('totalAmount')}</span>
          </button>
          <button
            onClick={() => onSort('createdAt')}
            className="hidden lg:flex w-40 flex-shrink-0 font-semibold text-gray-900 dark:text-white text-left hover:text-purple-600 dark:hover:text-purple-400 transition-colors items-center group whitespace-nowrap"
          >
            创建时间
            <span className="ml-1 flex items-center">{renderSortIcon('createdAt')}</span>
          </button>
          <button
            onClick={() => onSort('updatedAt')}
            className="hidden xl:flex w-40 flex-shrink-0 font-semibold text-gray-900 dark:text-white text-left hover:text-purple-600 dark:hover:text-purple-400 transition-colors items-center group whitespace-nowrap"
          >
            修改时间
            <span className="ml-1 flex items-center">{renderSortIcon('updatedAt')}</span>
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
              className={`px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 ${
                isSelected ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800' : ''
              }`}
            >
              <div className="flex items-center w-full">
                <div className="w-6 flex-shrink-0 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect(item.id, e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:ring-2"
                  />
                </div>
                <div className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white pl-2" title={item.customerName}>
                  {item.customerName}
                </div>
                <div className="w-24 sm:w-40 flex-shrink-0">
                  <div className="whitespace-nowrap text-sm font-bold text-purple-600 dark:text-purple-400 font-mono">
                    {item.invoiceNo}
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
                  <div className="flex items-center justify-end space-x-1">
                    <button
                      onClick={() => onPreview(item.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                      title="预览"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(item.id)}
                      className="hidden sm:inline-flex p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 rounded-lg transition-all duration-200"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onCopy(item.id)}
                      className="hidden sm:inline-flex p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:text-green-400 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                      title="复制"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="hidden sm:inline-flex p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
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
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-t border-purple-200 dark:border-purple-800 px-4 py-3">
          <div className="text-right text-sm text-gray-700 dark:text-gray-300 font-medium">
            {Object.entries(history.reduce((acc, item) => {
              if (!acc[item.currency]) acc[item.currency] = 0;
              acc[item.currency] += item.totalAmount;
              return acc;
            }, {} as Record<string, number>)).map(([currency, total]) => (
              <span key={currency} className="mr-4">
                {currency} 合计：
                <span className="font-bold text-purple-600 dark:text-purple-400">{total.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 