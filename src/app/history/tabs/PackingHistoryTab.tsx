import { useState, useEffect, useCallback } from 'react';
import { getPackingHistory, deletePackingHistory, exportPackingHistory, importPackingHistory } from '@/utils/packingHistory';
import { generatePackingListPDF } from '@/utils/packingPdfGenerator';
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
  type: 'proforma' | 'packing' | 'both' | 'all';
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
      
      // 文档类型过滤
      if (filters.type !== 'all' && item.documentType !== filters.type) {
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
      console.error('Error loading packing history:', error);
    } finally {
      setLoading(false);
    }
  }, [filterHistory, sortHistory]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  // 切换行展开状态
  const toggleRowExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // 获取文档类型显示名称
  const getDocumentTypeDisplay = (type: string) => {
    switch (type) {
      case 'proforma':
        return 'Proforma Invoice';
      case 'packing':
        return 'Packing List';
      case 'both':
        return 'Proforma & Packing';
      default:
        return type;
    }
  };

  // 获取文档类型颜色
  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'proforma':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'packing':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'both':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // 获取货币符号
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'CNY':
        return '¥';
      default:
        return currency;
    }
  };

  // 表头配置
  const columns = [
    { key: 'select', label: '', width: '40px', sortable: false },
    { key: 'documentType', label: '文档类型', width: '120px', sortable: true },
    { key: 'invoiceNo', label: '发票号', width: '120px', sortable: true },
    { key: 'orderNo', label: '订单号', width: '120px', sortable: true },
    { key: 'consigneeName', label: '收货人', width: '150px', sortable: true },
    { key: 'totalAmount', label: '总金额', width: '100px', sortable: true },
    { key: 'currency', label: '币种', width: '60px', sortable: true },
    { key: 'createdAt', label: '创建时间', width: '140px', sortable: true },
    { key: 'actions', label: '操作', width: '120px', sortable: false }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">加载中...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无装箱单记录
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {filters.search || filters.type !== 'all' || filters.dateRange !== 'all' || filters.amountRange !== 'all' 
            ? '没有符合筛选条件的记录' 
            : '还没有创建任何装箱单'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    column.width ? `w-[${column.width}]` : ''
                  }`}
                >
                  {column.key === 'select' ? (
                    <input
                      type="checkbox"
                      checked={history.length > 0 && history.every(item => selectedIds.has(item.id))}
                      onChange={(e) => onSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  ) : column.sortable ? (
                    <button
                      onClick={() => onSort(column.key)}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      <span>{column.label}</span>
                      {sortConfig.key === column.key && (
                        sortConfig.direction === 'asc' ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#1c1c1e] divide-y divide-gray-200 dark:divide-gray-700">
            {history.map((item) => (
              <tr
                key={item.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={(e) => onSelect(item.id, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDocumentTypeColor(item.documentType)}`}>
                    {getDocumentTypeDisplay(item.documentType)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {item.invoiceNo || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {item.orderNo || '-'}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                  <div className="max-w-[150px] truncate" title={item.consigneeName}>
                    {item.consigneeName || '-'}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {getCurrencySymbol(item.currency)}{item.totalAmount.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {item.currency}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onPreview(item.id)}
                      className="p-1 rounded text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      title="预览"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(item.id)}
                      className="p-1 rounded text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onCopy(item.id)}
                      className="p-1 rounded text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                      title="复制"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1 rounded text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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
    </div>
  );
} 