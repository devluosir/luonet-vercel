'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  Receipt, 
  ShoppingCart, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  Copy, 
  Eye,
  Calendar,
  DollarSign,
  User,
  Building,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
  Archive,
  Star,
  ArrowLeft,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Footer } from '@/components/Footer';
import { generateQuotationPDF } from '@/utils/quotationPdfGenerator';
import { generateOrderConfirmationPDF } from '@/utils/orderConfirmationPdfGenerator';
import { generateInvoicePDF } from '@/utils/invoicePdfGenerator';
import { generatePurchaseOrderPDF } from '@/utils/purchasePdfGenerator';

// 导入历史记录工具函数
import { 
  getQuotationHistory, 
  deleteQuotationHistory, 
  exportQuotationHistory,
  importQuotationHistory 
} from '@/utils/quotationHistory';
import { 
  getPurchaseHistory, 
  deletePurchaseHistory, 
  exportPurchaseHistory,
  importPurchaseHistory 
} from '@/utils/purchaseHistory';
import { 
  getInvoiceHistory, 
  deleteInvoiceHistory, 
  exportInvoiceHistory,
  importInvoiceHistory 
} from '@/utils/invoiceHistory';

// 类型定义
interface QuotationHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: 'quotation' | 'confirmation';
  customerName: string;
  quotationNo: string;
  totalAmount: number;
  currency: string;
  data: any;
}

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

interface InvoiceHistory {
  id: string;
  createdAt: string;
  customerName: string;
  invoiceNo: string;
  totalAmount: number;
  currency: string;
  data: any;
}

type HistoryType = 'quotation' | 'confirmation' | 'invoice' | 'purchase';
type HistoryItem = QuotationHistory | PurchaseHistory | InvoiceHistory;

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface Filters {
  search: string;
  type: HistoryType | 'all';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  amountRange: 'all' | 'low' | 'medium' | 'high';
}

export default function HistoryManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HistoryType>('quotation');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: 'all',
    dateRange: 'all',
    amountRange: 'all'
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'createdAt',
    direction: 'desc'
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取过滤后的历史记录
  const getFilteredHistory = useCallback((items: HistoryItem[]) => {
    return items.filter(item => {
      // 搜索过滤
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableText = [
          'customerName' in item ? item.customerName : '',
          'supplierName' in item ? item.supplierName : '',
          'quotationNo' in item ? item.quotationNo : '',
          'orderNo' in item ? item.orderNo : '',
          'invoiceNo' in item ? item.invoiceNo : ''
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchLower)) {
          return false;
        }
      }

      // 类型过滤
      if (filters.type !== 'all') {
        if (filters.type === 'quotation' && !('quotationNo' in item)) return false;
        if (filters.type === 'invoice' && !('invoiceNo' in item)) return false;
        if (filters.type === 'purchase' && !('orderNo' in item)) return false;
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
            if (amount >= 10000) return false;
            break;
          case 'medium':
            if (amount < 10000 || amount >= 100000) return false;
            break;
          case 'high':
            if (amount < 100000) return false;
            break;
        }
      }

      return true;
    });
  }, [filters]);

  // 获取排序后的数据
  const getSortedHistory = useCallback((items: HistoryItem[]) => {
    if (!sortConfig.key) return items;

    return [...items].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof HistoryItem];
      const bValue = b[sortConfig.key as keyof HistoryItem];

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
      let results: HistoryItem[] = [];
      
      switch (activeTab) {
        case 'quotation':
          results = getQuotationHistory().filter(item => item.type === 'quotation');
          break;
        case 'confirmation':
          results = getQuotationHistory().filter(item => item.type === 'confirmation');
          break;
        case 'invoice':
          results = getInvoiceHistory().map(item => ({
            ...item,
            updatedAt: item.createdAt // 使用createdAt作为updatedAt
          }));
          break;
        case 'purchase':
          results = getPurchaseHistory();
          break;
      }

      const filteredResults = getFilteredHistory(results);
      const sortedResults = getSortedHistory(filteredResults);
      setHistory(sortedResults);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, getFilteredHistory, getSortedHistory]);

  useEffect(() => {
    if (mounted) {
      loadHistory();
    }
  }, [mounted, loadHistory]);

  // 渲染排序图标
  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="w-4 h-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />;
  };

  // 处理排序
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 处理删除
  const handleDelete = (id: string) => {
    let success = false;
    
    switch (activeTab) {
      case 'quotation':
      case 'confirmation':
        success = deleteQuotationHistory(id);
        break;
      case 'invoice':
        success = deleteInvoiceHistory(id);
        break;
      case 'purchase':
        success = deletePurchaseHistory([id]);
        break;
    }

    if (success) {
      setHistory(prev => prev.filter(item => item.id !== id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setShowDeleteConfirm(null);
    }
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    let success = false;
    
    switch (activeTab) {
      case 'quotation':
      case 'confirmation':
        success = ids.every(id => deleteQuotationHistory(id));
        break;
      case 'invoice':
        success = ids.every(id => deleteInvoiceHistory(id));
        break;
      case 'purchase':
        success = deletePurchaseHistory(ids);
        break;
    }

    if (success) {
      setHistory(prev => prev.filter(item => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      setShowDeleteConfirm(null);
    }
  };

  // 处理编辑
  const handleEdit = (id: string) => {
    switch (activeTab) {
      case 'quotation':
      case 'confirmation':
        router.push(`/quotation/edit/${id}`);
        break;
      case 'invoice':
        router.push(`/invoice/edit/${id}`);
        break;
      case 'purchase':
        router.push(`/purchase?edit=${id}`);
        break;
    }
  };

  // 处理复制
  const handleCopy = (id: string) => {
    switch (activeTab) {
      case 'quotation':
      case 'confirmation':
        router.push(`/quotation/copy/${id}`);
        break;
      case 'invoice':
        router.push(`/invoice/copy/${id}`);
        break;
      case 'purchase':
        router.push(`/purchase?copy=${id}`);
        break;
    }
  };

  // 处理导出
  const handleExport = () => {
    try {
      let jsonData = '';
      let fileName = '';
      
      switch (activeTab) {
        case 'quotation':
          jsonData = JSON.stringify(getQuotationHistory().filter(item => item.type === 'quotation'), null, 2);
          fileName = `quotation_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
          break;
        case 'confirmation':
          jsonData = JSON.stringify(getQuotationHistory().filter(item => item.type === 'confirmation'), null, 2);
          fileName = `confirmation_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
          break;
        case 'invoice':
          jsonData = exportInvoiceHistory();
          fileName = `invoice_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
          break;
        case 'purchase':
          jsonData = exportPurchaseHistory();
          fileName = `purchase_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
          break;
      }

      if (jsonData) {
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting history:', error);
      alert('导出失败，请重试');
    }
  };

  // 处理导入
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
            let success = false;
            
            switch (activeTab) {
              case 'quotation':
              case 'confirmation':
                success = importQuotationHistory(content);
                break;
              case 'invoice':
                success = importInvoiceHistory(content);
                break;
              case 'purchase':
                success = importPurchaseHistory(content);
                break;
            }

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

  // 获取记录类型图标
  const getRecordIcon = (item: HistoryItem) => {
    if ('quotationNo' in item) {
      return item.type === 'quotation' ? FileText : Receipt;
    }
    if ('invoiceNo' in item) {
      return Receipt;
    }
    if ('orderNo' in item) {
      return ShoppingCart;
    }
    return FileText;
  };

  // 获取记录类型名称
  const getRecordTypeName = (item: HistoryItem) => {
    if ('quotationNo' in item) {
      return item.type === 'quotation' ? '报价单' : '确认书';
    }
    if ('invoiceNo' in item) {
      return '发票';
    }
    if ('orderNo' in item) {
      return '采购单';
    }
    return '文档';
  };

  // 获取记录编号
  const getRecordNumber = (item: HistoryItem) => {
    if ('quotationNo' in item) return item.quotationNo;
    if ('invoiceNo' in item) return item.invoiceNo;
    if ('orderNo' in item) return item.orderNo;
    return '';
  };

  // 获取客户/供应商名称
  const getCustomerName = (item: HistoryItem) => {
    if ('customerName' in item) return item.customerName;
    if ('supplierName' in item) return item.supplierName;
    return '';
  };

  // 处理预览
  const handlePreview = (id: string) => {
    setShowPreview(id);
    generatePdfPreview(id);
  };

  // 生成PDF预览
  const generatePdfPreview = async (id: string) => {
    setIsGeneratingPdf(true);
    setPdfPreviewUrl(null);
    
    try {
      const item = history.find(h => h.id === id);
      if (!item) return;

      let pdfUrl: string | null = null;

      // 根据记录类型生成对应的PDF
      if ('quotationNo' in item) {
        if (item.type === 'quotation') {
          const pdfBlob = await generateQuotationPDF(item.data, true);
          pdfUrl = URL.createObjectURL(pdfBlob);
        } else {
          const pdfBlob = await generateOrderConfirmationPDF(item.data, true);
          pdfUrl = URL.createObjectURL(pdfBlob);
        }
      } else if ('invoiceNo' in item) {
        pdfUrl = await generateInvoicePDF(item.data, true);
      } else if ('orderNo' in item) {
        const pdfBlob = await generatePurchaseOrderPDF(item.data, true);
        pdfUrl = URL.createObjectURL(pdfBlob);
      }

      if (pdfUrl) {
        setPdfPreviewUrl(pdfUrl);
      }
    } catch (error) {
      console.error('Error generating PDF preview:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 清理PDF预览URL
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  // 避免闪烁，在客户端渲染前返回空内容
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link href="/tools" className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          {/* 页面标题 */}
          <div className="mt-4 sm:mt-6 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              历史记录管理中心
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              统一管理报价单、发票、采购订单的历史记录
            </p>
          </div>

          {/* 标签页 */}
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'quotation', name: '报价单', icon: FileText, count: getQuotationHistory().filter(item => item.type === 'quotation').length },
                  { id: 'confirmation', name: '销售确认', icon: Receipt, count: getQuotationHistory().filter(item => item.type === 'confirmation').length },
                  { id: 'invoice', name: '发票', icon: Receipt, count: getInvoiceHistory().length },
                  { id: 'purchase', name: '采购单', icon: ShoppingCart, count: getPurchaseHistory().length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as HistoryType)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* 工具栏 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              {/* 搜索和过滤 */}
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="搜索客户、单号..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white w-full sm:w-64"
                  />
                </div>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                >
                  <Filter className="w-4 h-4" />
                  <span>过滤</span>
                </button>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={loadHistory}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>刷新</span>
                </button>
                
                <button
                  onClick={handleImport}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Upload className="w-4 h-4" />
                  <span>导入</span>
                </button>
                
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Download className="w-4 h-4" />
                  <span>导出</span>
                </button>

                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm('batch')}
                    className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>删除 ({selectedIds.size})</span>
                  </button>
                )}
              </div>
            </div>

            {/* 过滤选项 */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      日期范围
                    </label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="all">全部时间</option>
                      <option value="today">今天</option>
                      <option value="week">最近7天</option>
                      <option value="month">最近30天</option>
                      <option value="year">最近一年</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      金额范围
                    </label>
                    <select
                      value={filters.amountRange}
                      onChange={(e) => setFilters(prev => ({ ...prev, amountRange: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="all">全部金额</option>
                      <option value="low">小于1万</option>
                      <option value="medium">1万-10万</option>
                      <option value="high">大于10万</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 历史记录列表 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500 dark:text-gray-400">加载中...</div>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Archive className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无历史记录
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  当前没有找到符合条件的记录
                </p>
              </div>
            ) : (
              <>
                {/* 表头 */}
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === history.length && history.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(history.map(item => item.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div className="col-span-3">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center space-x-1 text-left font-medium text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <span>创建时间</span>
                        {renderSortIcon('createdAt')}
                      </button>
                    </div>
                    <div className="col-span-2">
                      <button
                        onClick={() => handleSort('totalAmount')}
                        className="flex items-center space-x-1 text-left font-medium text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <span>金额</span>
                        {renderSortIcon('totalAmount')}
                      </button>
                    </div>
                    <div className="col-span-3">
                      <span className="font-medium text-gray-900 dark:text-white">客户/供应商</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-900 dark:text-white">单号</span>
                    </div>
                    <div className="col-span-1">
                      <span className="font-medium text-gray-900 dark:text-white">操作</span>
                    </div>
                  </div>
                </div>

                {/* 记录列表 */}
                <div className="divide-y divide-gray-200 dark:divide-gray-600">
                  {history.map((item) => {
                    const Icon = getRecordIcon(item);
                    const isSelected = selectedIds.has(item.id);
                    
                    return (
                      <div
                        key={item.id}
                        className={`px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const newSelectedIds = new Set(selectedIds);
                                if (e.target.checked) {
                                  newSelectedIds.add(item.id);
                                } else {
                                  newSelectedIds.delete(item.id);
                                }
                                setSelectedIds(newSelectedIds);
                              }}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                          </div>
                          
                          <div className="col-span-3">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {getRecordTypeName(item)}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-span-2">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.currency} {item.totalAmount.toLocaleString()}
                            </div>
                          </div>
                          
                          <div className="col-span-3">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {getCustomerName(item)}
                            </div>
                          </div>
                          
                          <div className="col-span-2">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {getRecordNumber(item)}
                            </div>
                          </div>
                          
                          <div className="col-span-1">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handlePreview(item.id)}
                                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                title="预览"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(item.id)}
                                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                title="编辑"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCopy(item.id)}
                                className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                                title="复制"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(item.id)}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
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
              </>
            )}
          </div>
        </div>
      </main>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              确认删除
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {showDeleteConfirm === 'batch' 
                ? `确定要删除选中的 ${selectedIds.size} 条记录吗？此操作不可撤销。`
                : '确定要删除这条记录吗？此操作不可撤销。'
              }
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (showDeleteConfirm === 'batch') {
                    handleBatchDelete();
                  } else {
                    handleDelete(showDeleteConfirm);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 预览弹窗 */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                记录预览
              </h3>
              <button
                onClick={() => {
                  setShowPreview(null);
                  if (pdfPreviewUrl) {
                    URL.revokeObjectURL(pdfPreviewUrl);
                    setPdfPreviewUrl(null);
                  }
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {(() => {
                const item = history.find(h => h.id === showPreview);
                if (!item) return <div>记录不存在</div>;

                return (
                  <div className="space-y-6">
                    {/* 基本信息 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">基本信息</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">记录类型:</span>
                            <span className="text-gray-900 dark:text-white">{getRecordTypeName(item)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">单号:</span>
                            <span className="text-gray-900 dark:text-white">{getRecordNumber(item)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">客户/供应商:</span>
                            <span className="text-gray-900 dark:text-white">{getCustomerName(item)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">总金额:</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {item.currency} {item.totalAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">创建时间:</span>
                            <span className="text-gray-900 dark:text-white">
                              {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                            </span>
                          </div>
                          {'updatedAt' in item && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">更新时间:</span>
                              <span className="text-gray-900 dark:text-white">
                                {format(new Date(item.updatedAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">操作</h4>
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              setShowPreview(null);
                              handleEdit(item.id);
                            }}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            编辑记录
                          </button>
                          <button
                            onClick={() => {
                              setShowPreview(null);
                              handleCopy(item.id);
                            }}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                          >
                            复制记录
                          </button>
                          <button
                            onClick={() => {
                              setShowPreview(null);
                              setShowDeleteConfirm(item.id);
                            }}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                          >
                            删除记录
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* PDF预览 */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">PDF预览</h4>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                        {isGeneratingPdf ? (
                          <div className="flex flex-col items-center space-y-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">正在生成PDF预览...</span>
                          </div>
                        ) : pdfPreviewUrl ? (
                          <iframe
                            src={pdfPreviewUrl}
                            className="w-full h-[500px] border border-gray-200 dark:border-gray-600 rounded-lg"
                            title="PDF预览"
                          />
                        ) : (
                          <div className="text-center text-gray-500 dark:text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>无法生成PDF预览</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 详细数据（折叠显示） */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <details className="group">
                        <summary className="font-medium text-gray-900 dark:text-white mb-3 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
                          详细数据 (点击展开)
                        </summary>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 overflow-x-auto mt-3">
                          <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {JSON.stringify(item.data, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
} 