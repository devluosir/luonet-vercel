import { useState, useEffect, useCallback } from 'react';
import { getPurchaseHistory, deletePurchaseHistory, exportPurchaseHistory, importPurchaseHistory } from '@/utils/purchaseHistory';
import { generatePurchaseOrderPDF } from '@/utils/purchasePdfGenerator';

interface PurchaseHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  supplierName: string;
  orderNo: string;
  totalAmount: number;
  currency: string;
  data: any;
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
}

export default function PurchaseHistoryTab({ 
  filters, 
  sortConfig, 
  onSort, 
  onEdit, 
  onCopy, 
  onDelete, 
  onPreview,
  selectedIds,
  onSelect,
  onSelectAll
}: Props) {
  const [history, setHistory] = useState<PurchaseHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载采购单历史
  const loadHistory = useCallback(() => {
    setLoading(true);
    try {
      let results = getPurchaseHistory();
      // 搜索过滤
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(item =>
          item.supplierName.toLowerCase().includes(searchLower) ||
          item.orderNo.toLowerCase().includes(searchLower)
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
          const aValue = a[sortConfig.key as keyof PurchaseHistory];
          const bValue = b[sortConfig.key as keyof PurchaseHistory];
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
  }, [loadHistory]);

  if (loading) {
    return <div className="py-8 text-center text-gray-500">加载中...</div>;
  }

  if (history.length === 0) {
    return <div className="py-8 text-center text-gray-400">暂无采购单历史记录</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr>
            <th className="px-4 py-2">供应商名称</th>
            <th className="px-4 py-2">采购单号</th>
            <th className="px-4 py-2">金额</th>
            <th className="px-4 py-2">币种</th>
            <th className="px-4 py-2">创建时间</th>
          </tr>
        </thead>
        <tbody>
          {history.map(item => (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="px-4 py-2">{item.supplierName}</td>
              <td className="px-4 py-2">{item.orderNo}</td>
              <td className="px-4 py-2">{item.totalAmount}</td>
              <td className="px-4 py-2">{item.currency}</td>
              <td className="px-4 py-2">{item.createdAt.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 