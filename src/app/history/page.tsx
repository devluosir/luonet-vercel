'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  updatedAt: string;
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

import dynamic from 'next/dynamic';

const QuotationHistoryTab = dynamic(() => import('./tabs/QuotationHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载报价单历史...</div>,
  ssr: false
});

const ConfirmationHistoryTab = dynamic(() => import('./tabs/ConfirmationHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载订单确认书历史...</div>,
  ssr: false
});

const InvoiceHistoryTab = dynamic(() => import('./tabs/InvoiceHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载发票历史...</div>,
  ssr: false
});

const PurchaseHistoryTab = dynamic(() => import('./tabs/PurchaseHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载采购单历史...</div>,
  ssr: false
});

const ImportExportModal = dynamic(() => import('./ImportExportModal'), { ssr: false });
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { ssr: false });

export default function HistoryManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const validTabs: HistoryType[] = ['quotation', 'confirmation', 'invoice', 'purchase'];
  const [activeTab, setActiveTab] = useState<HistoryType>('quotation');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
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
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [previewType, setPreviewType] = useState<'quotation'|'confirmation'|'invoice'|'purchase'>('quotation');

  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理返回按钮点击
  const handleBack = () => {
    // 单据中心统一返回到工具页面
    router.push('/tools');
  };

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
      loadHistory(); // 重新加载数据，而不是本地过滤
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setShowDeleteConfirm(null);
      setRefreshKey(prev => prev + 1);
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
      loadHistory(); // 重新加载数据，而不是本地过滤
      setSelectedIds(new Set());
      setShowDeleteConfirm(null);
      setRefreshKey(prev => prev + 1);
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
        router.push(`/purchase/edit/${id}`);
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
        router.push(`/purchase/copy/${id}`);
        break;
    }
  };

  // 处理选择
  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  // 处理全选
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(history.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // 处理导出
  const handleExport = () => {
    setShowExportOptions(true);
  };

  // 执行导出
  const executeExport = (exportType: 'current' | 'all' | 'filtered') => {
    setShowExportOptions(false);
    
    try {
      let jsonData = '';
      let fileName = '';
      let exportStats = '';

      switch (exportType) {
        case 'current':
          // 导出当前选项卡数据
          switch (activeTab) {
            case 'quotation':
              const quotationData = getQuotationHistory().filter(item => item.type === 'quotation');
              jsonData = JSON.stringify(quotationData, null, 2);
              fileName = `quotation_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
              exportStats = `报价单：${quotationData.length} 条`;
              break;
            case 'confirmation':
              const confirmationData = getQuotationHistory().filter(item => item.type === 'confirmation');
              jsonData = JSON.stringify(confirmationData, null, 2);
              fileName = `confirmation_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
              exportStats = `销售确认：${confirmationData.length} 条`;
              break;
            case 'invoice':
              jsonData = exportInvoiceHistory();
              const invoiceData = getInvoiceHistory();
              fileName = `invoice_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
              exportStats = `发票：${invoiceData.length} 条`;
              break;
            case 'purchase':
              jsonData = exportPurchaseHistory();
              const purchaseData = getPurchaseHistory();
              fileName = `purchase_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
              exportStats = `采购单：${purchaseData.length} 条`;
              break;
          }
          break;

        case 'all':
          // 导出所有历史记录
          const allData = {
            metadata: {
              exportDate: new Date().toISOString(),
              totalRecords: 0,
              breakdown: {
                quotation: 0,
                confirmation: 0,
                invoice: 0,
                purchase: 0
              }
            },
            quotation: getQuotationHistory().filter(item => item.type === 'quotation'),
            confirmation: getQuotationHistory().filter(item => item.type === 'confirmation'),
            invoice: getInvoiceHistory(),
            purchase: getPurchaseHistory()
          };

          // 计算统计信息
          allData.metadata.breakdown.quotation = allData.quotation.length;
          allData.metadata.breakdown.confirmation = allData.confirmation.length;
          allData.metadata.breakdown.invoice = allData.invoice.length;
          allData.metadata.breakdown.purchase = allData.purchase.length;
          allData.metadata.totalRecords = Object.values(allData.metadata.breakdown).reduce((sum, count) => sum + count, 0);

          jsonData = JSON.stringify(allData, null, 2);
          fileName = `all_history_records_${format(new Date(), 'yyyy-MM-dd')}.json`;
          exportStats = `总计：${allData.metadata.totalRecords} 条\n` +
            `报价单：${allData.metadata.breakdown.quotation} 条\n` +
            `销售确认：${allData.metadata.breakdown.confirmation} 条\n` +
            `发票：${allData.metadata.breakdown.invoice} 条\n` +
            `采购单：${allData.metadata.breakdown.purchase} 条`;
          break;

        case 'filtered':
          // 导出筛选后的数据
          const filteredData = {
            metadata: {
              exportDate: new Date().toISOString(),
              filters: filters,
              totalRecords: history.length
            },
            records: history
          };

          jsonData = JSON.stringify(filteredData, null, 2);
          fileName = `filtered_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
          exportStats = `筛选结果：${history.length} 条`;
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

        // 显示导出成功信息
        alert(`导出成功！\n文件名：${fileName}\n${exportStats}`);
      } else {
        alert('没有数据可导出');
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
        console.log('开始导入文件:', file.name, '大小:', file.size);
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          console.log('文件内容长度:', content.length);
          console.log('文件内容前100字符:', content.substring(0, 100));
          
          try {
            // 智能导入函数
            const importResult = smartImport(content);
            console.log('导入结果:', importResult);
            
            if (importResult.success) {
              loadHistory();
              setRefreshKey(prev => prev + 1);
              // 显示导入结果
              const resultMessage = `导入成功！\n${('details' in importResult ? importResult.details : []).join('\n')}`;
              alert(resultMessage);
              
              // 如果有数据导入到其他选项卡，提示用户
              if ('otherTabs' in importResult && importResult.otherTabs.length > 0) {
                const switchMessage = `部分数据已导入到其他选项卡：${importResult.otherTabs.join('、')}\n是否要切换到对应选项卡查看？`;
                if (confirm(switchMessage)) {
                  // 切换到第一个有数据的选项卡
                  setActiveTab(importResult.otherTabs[0] as HistoryType);
                }
              }
            } else {
              console.error('导入失败:', importResult.error);
              alert(`导入失败：${importResult.error}`);
            }
          } catch (error) {
            console.error('Error importing:', error);
            alert('导入失败：文件格式错误');
          }
        };
        reader.onerror = (error) => {
          console.error('文件读取失败:', error);
          alert('文件读取失败，请重试');
        };
        reader.readAsText(file);
      } else {
        console.log('没有选择文件');
      }
    };
    input.click();
  };

  // 智能导入函数
  const smartImport = (content: string) => {
    try {
      console.log('开始智能导入，内容长度:', content.length);
      let parsedData;
      try {
        parsedData = JSON.parse(content);
        console.log('JSON解析成功，数据类型:', typeof parsedData);
        if (Array.isArray(parsedData)) {
          console.log('数据是数组，长度:', parsedData.length);
        } else if (typeof parsedData === 'object') {
          console.log('数据是对象，键:', Object.keys(parsedData));
        }
      } catch (parseError) {
        console.log('JSON解析失败，尝试修复格式问题');
        // 尝试修复常见的JSON格式问题
        const fixedContent = content
          .replace(/\n/g, '')
          .replace(/\r/g, '')
          .replace(/\t/g, '')
          .trim();
        parsedData = JSON.parse(fixedContent);
        console.log('修复后JSON解析成功');
      }

      // 检查是否是综合数据格式（包含metadata字段）
      if (parsedData && typeof parsedData === 'object' && 'metadata' in parsedData) {
        console.log('检测到综合数据格式');
        // 综合数据格式
        const allData = parsedData;
        const results = {
          success: true,
          details: [] as string[],
          otherTabs: [] as string[],
          error: ''
        };

        let totalImported = 0;

        // 处理报价单数据
        if (allData.quotation && Array.isArray(allData.quotation) && allData.quotation.length > 0) {
          console.log('处理报价单数据，数量:', allData.quotation.length);
          const quotationJson = JSON.stringify(allData.quotation);
          const importSuccess = importQuotationHistory(quotationJson);
          console.log('报价单导入结果:', importSuccess);
          if (importSuccess) {
            results.details.push(`报价单：${allData.quotation.length} 条`);
            totalImported += allData.quotation.length;
            if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
              results.otherTabs.push('报价单');
            }
          }
        }

        // 处理销售确认数据
        if (allData.confirmation && Array.isArray(allData.confirmation) && allData.confirmation.length > 0) {
          console.log('处理销售确认数据，数量:', allData.confirmation.length);
          const confirmationJson = JSON.stringify(allData.confirmation);
          const importSuccess = importQuotationHistory(confirmationJson);
          console.log('销售确认导入结果:', importSuccess);
          if (importSuccess) {
            results.details.push(`销售确认：${allData.confirmation.length} 条`);
            totalImported += allData.confirmation.length;
            if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
              results.otherTabs.push('销售确认');
            }
          }
        }

        // 处理发票数据
        if (allData.invoice && Array.isArray(allData.invoice) && allData.invoice.length > 0) {
          console.log('处理发票数据，数量:', allData.invoice.length);
          const invoiceJson = JSON.stringify(allData.invoice);
          const importSuccess = importInvoiceHistory(invoiceJson);
          console.log('发票导入结果:', importSuccess);
          if (importSuccess) {
            results.details.push(`发票：${allData.invoice.length} 条`);
            totalImported += allData.invoice.length;
            if (activeTab !== 'invoice') {
              results.otherTabs.push('发票');
            }
          }
        }

        // 处理采购单数据
        if (allData.purchase && Array.isArray(allData.purchase) && allData.purchase.length > 0) {
          console.log('处理采购单数据，数量:', allData.purchase.length);
          const purchaseJson = JSON.stringify(allData.purchase);
          const importSuccess = importPurchaseHistory(purchaseJson);
          console.log('采购单导入结果:', importSuccess);
          if (importSuccess) {
            results.details.push(`采购单：${allData.purchase.length} 条`);
            totalImported += allData.purchase.length;
            if (activeTab !== 'purchase') {
              results.otherTabs.push('采购单');
            }
          }
        }

        console.log('综合数据导入完成，总计:', totalImported);
        if (totalImported === 0) {
          return { success: false, error: '综合数据中未找到有效的历史记录数据' };
        }

        results.details.unshift(`总计导入：${totalImported} 条记录`);
        return results;
      }

      console.log('检测到数组格式数据');
      // 原有的数组格式处理逻辑
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        return { success: false, error: '文件格式错误：需要包含数据的JSON数组或综合数据格式' };
      }

      const results = {
        success: true,
        details: [] as string[],
        otherTabs: [] as string[],
        error: ''
      };

      // 按类型分组数据
      const quotationData = [];
      const confirmationData = [];
      const invoiceData = [];
      const purchaseData = [];

      for (const item of parsedData) {
        if (!item || typeof item !== 'object') continue;

        // 识别数据类型
        if ('quotationNo' in item && 'type' in item) {
          // 报价单或确认书数据
          if (item.type === 'quotation') {
            quotationData.push(item);
          } else if (item.type === 'confirmation') {
            confirmationData.push(item);
          }
        } else if ('invoiceNo' in item && !('quotationNo' in item)) {
          // 发票数据
          invoiceData.push(item);
        } else if ('orderNo' in item && 'supplierName' in item) {
          // 采购单数据
          purchaseData.push(item);
        } else if ('data' in item && item.data) {
          // 通过data字段判断类型
          if (item.data.quotationNo && item.data.customerPO === undefined) {
            // 报价单数据
            quotationData.push({
              ...item,
              type: item.data.type || 'quotation'
            });
          } else if (item.data.invoiceNo || item.data.customerPO !== undefined) {
            // 发票数据
            invoiceData.push(item);
          } else if (item.data.orderNo && item.data.supplierName) {
            // 采购单数据
            purchaseData.push(item);
          }
        }
      }

      console.log('数据分组结果:', {
        quotation: quotationData.length,
        confirmation: confirmationData.length,
        invoice: invoiceData.length,
        purchase: purchaseData.length
      });

      // 执行导入
      let totalImported = 0;

      if (quotationData.length > 0) {
        const quotationJson = JSON.stringify(quotationData);
        const importSuccess = importQuotationHistory(quotationJson);
        console.log('报价单导入结果:', importSuccess);
        if (importSuccess) {
          results.details.push(`报价单：${quotationData.length} 条`);
          totalImported += quotationData.length;
          if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
            results.otherTabs.push('报价单');
          }
        }
      }

      if (confirmationData.length > 0) {
        const confirmationJson = JSON.stringify(confirmationData);
        const importSuccess = importQuotationHistory(confirmationJson);
        console.log('销售确认导入结果:', importSuccess);
        if (importSuccess) {
          results.details.push(`销售确认：${confirmationData.length} 条`);
          totalImported += confirmationData.length;
          if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
            results.otherTabs.push('销售确认');
          }
        }
      }

      if (invoiceData.length > 0) {
        const invoiceJson = JSON.stringify(invoiceData);
        const importSuccess = importInvoiceHistory(invoiceJson);
        console.log('发票导入结果:', importSuccess);
        if (importSuccess) {
          results.details.push(`发票：${invoiceData.length} 条`);
          totalImported += invoiceData.length;
          if (activeTab !== 'invoice') {
            results.otherTabs.push('发票');
          }
        }
      }

      if (purchaseData.length > 0) {
        const purchaseJson = JSON.stringify(purchaseData);
        const importSuccess = importPurchaseHistory(purchaseJson);
        console.log('采购单导入结果:', importSuccess);
        if (importSuccess) {
          results.details.push(`采购单：${purchaseData.length} 条`);
          totalImported += purchaseData.length;
          if (activeTab !== 'purchase') {
            results.otherTabs.push('采购单');
          }
        }
      }

      console.log('数组格式导入完成，总计:', totalImported);
      if (totalImported === 0) {
        return { success: false, error: '未能识别任何有效的历史记录数据' };
      }

      results.details.unshift(`总计导入：${totalImported} 条记录`);
      return results;

    } catch (error) {
      console.error('Smart import error:', error);
      return { success: false, error: '文件解析失败' };
    }
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
  const getRecordNumber = (item: HistoryItem, activeTab: HistoryType) => {
    if (activeTab === 'confirmation' && 'quotationNo' in item) {
      return item.data?.contractNo || item.quotationNo;
    }
    if (activeTab === 'quotation' && 'quotationNo' in item) {
      return item.quotationNo;
    }
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
    const item = history.find(h => h.id === id);
    setPreviewItem(item);
    if (item) {
      if ('quotationNo' in item) {
        setPreviewType(item.type === 'quotation' ? 'quotation' : 'confirmation');
      } else if ('invoiceNo' in item) {
        setPreviewType('invoice');
      } else if ('orderNo' in item) {
        setPreviewType('purchase');
      }
    }
  };

  // 获取每个tab的搜索结果数量
  const getTabCount = (tabType: HistoryType) => {
    try {
      let results: HistoryItem[] = [];
      
      switch (tabType) {
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

      // 应用过滤条件
      const filteredResults = getFilteredHistory(results);
      return filteredResults.length;
    } catch (error) {
      console.error('Error getting tab count:', error);
      return 0;
    }
  };

  // 主色调映射
  const tabColorMap = {
    quotation: 'blue',
    confirmation: 'green',
    invoice: 'purple',
    purchase: 'orange'
  };
  const activeColor = tabColorMap[activeTab] || 'blue';

  // 避免闪烁，在客户端渲染前或activeTab未设置时返回空内容
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-black">
      <div className="flex-1">
        {/* Header */}
        <div className="bg-white dark:bg-[#1c1c1e] shadow-sm dark:shadow-gray-800/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBack}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">单据管理中心</h1>
              </div>
              <div className="flex items-center space-x-2">
                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 sm:w-64"
                  />
                  {filters.search && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                      tabIndex={-1}
                      aria-label="清空搜索"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* 高级过滤按钮 */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg border transition-all duration-200 ${
                    showFilters 
                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title="高级过滤"
                >
                  <Filter className="w-4 h-4" />
                </button>

                {/* 导出按钮（蓝色，Download） */}
                <button
                  onClick={handleExport}
                  className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                  title="导出"
                >
                  <Download className="w-5 h-5" />
                </button>
                {/* 导入按钮（绿色，Upload） */}
                <button
                  onClick={handleImport}
                  className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
                  title="导入"
                >
                  <Upload className="w-5 h-5" />
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm('batch')}
                    className="px-3 py-2 flex items-center bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    title="批量删除"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="ml-1 bg-white bg-opacity-20 rounded px-1.5 py-0.5 text-xs font-bold">{selectedIds.size}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 高级过滤器 */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center space-x-3">
                {/* 日期范围过滤 */}
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部时间</option>
                  <option value="today">今天</option>
                  <option value="week">最近7天</option>
                  <option value="month">最近30天</option>
                  <option value="year">最近一年</option>
                </select>
                {/* 金额范围过滤 */}
                <select
                  value={filters.amountRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, amountRange: e.target.value as any }))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部金额</option>
                  <option value="low">小于 10,000</option>
                  <option value="medium">10,000 - 100,000</option>
                  <option value="high">大于 100,000</option>
                </select>
                {/* 重置按钮 */}
                <button
                  onClick={() => setFilters({ ...filters, dateRange: 'all', amountRange: 'all' })}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm"
                >重置</button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-[#1c1c1e] border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {[
                { id: 'quotation', name: '报价单', icon: FileText, badge: 'text-blue-700 border-blue-400 bg-blue-50 dark:bg-blue-900/30' },
                { id: 'confirmation', name: '订单确认', icon: FileText, badge: 'text-green-700 border-green-400 bg-green-50 dark:bg-green-900/30' },
                { id: 'invoice', name: '发票', icon: Receipt, badge: 'text-purple-700 border-purple-400 bg-purple-50 dark:bg-purple-900/30' },
                { id: 'purchase', name: '采购单', icon: ShoppingCart, badge: 'text-orange-700 border-orange-400 bg-orange-50 dark:bg-orange-900/30' }
              ].map((tab) => {
                const Icon = tab.icon;
                const count = getTabCount(tab.id as HistoryType);
                const isActive = activeTab === tab.id;
                
                // 根据tab类型设置对应的颜色
                let activeClasses = '';
                if (isActive) {
                  switch (tab.id) {
                    case 'quotation':
                      activeClasses = 'border-blue-500 text-blue-600 dark:text-blue-400';
                      break;
                    case 'confirmation':
                      activeClasses = 'border-green-500 text-green-600 dark:text-green-400';
                      break;
                    case 'invoice':
                      activeClasses = 'border-purple-500 text-purple-600 dark:text-purple-400';
                      break;
                    case 'purchase':
                      activeClasses = 'border-orange-500 text-orange-600 dark:text-orange-400';
                      break;
                    default:
                      activeClasses = 'border-blue-500 text-blue-600 dark:text-blue-400';
                  }
                }
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as HistoryType)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                      ${isActive ? activeClasses : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                  >
                    <span className="relative inline-block">
                      <Icon className="h-4 w-4" />
                      <span className={`absolute -top-1 -right-2 min-w-[18px] h-4 px-1 ${tab.badge} text-xs rounded-full flex items-center justify-center font-bold border-2 shadow-sm`}> 
                        {count}
                      </span>
                    </span>
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Tab Content */}
            <div className="bg-white dark:bg-[#1c1c1e] rounded-lg">
              {activeTab === 'quotation' && (
                <QuotationHistoryTab 
                  filters={filters} 
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onEdit={handleEdit}
                  onCopy={handleCopy}
                  onDelete={(id) => setShowDeleteConfirm(id)}
                  onPreview={handlePreview}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onSelectAll={handleSelectAll}
                  mainColor={activeColor}
                  refreshKey={refreshKey}
                />
              )}
              {activeTab === 'confirmation' && (
                <ConfirmationHistoryTab 
                  filters={filters} 
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onEdit={handleEdit}
                  onCopy={handleCopy}
                  onDelete={(id) => setShowDeleteConfirm(id)}
                  onPreview={handlePreview}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onSelectAll={handleSelectAll}
                  mainColor={activeColor}
                  refreshKey={refreshKey}
                />
              )}
              {activeTab === 'invoice' && (
                <InvoiceHistoryTab 
                  filters={filters} 
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onEdit={handleEdit}
                  onCopy={handleCopy}
                  onDelete={(id) => setShowDeleteConfirm(id)}
                  onPreview={handlePreview}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onSelectAll={handleSelectAll}
                  mainColor={activeColor}
                  refreshKey={refreshKey}
                />
              )}
              {activeTab === 'purchase' && (
                <PurchaseHistoryTab 
                  filters={filters} 
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onEdit={handleEdit}
                  onCopy={handleCopy}
                  onDelete={(id) => setShowDeleteConfirm(id)}
                  onPreview={handlePreview}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onSelectAll={handleSelectAll}
                  mainColor={activeColor}
                  refreshKey={refreshKey}
                />
              )}
            </div>
          </div>
        </div>
      </div>

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

      {/* 导入导出弹窗 */}
      <ImportExportModal
        isOpen={showExportOptions}
        onClose={() => setShowExportOptions(false)}
        activeTab={activeTab}
        filteredData={history}
        onImportSuccess={() => { setRefreshKey(prev => prev + 1); loadHistory(); }}
      />

      {/* PDF预览弹窗 */}
      <PDFPreviewModal
        isOpen={!!showPreview}
        onClose={() => setShowPreview(null)}
        item={previewItem}
        itemType={previewType}
      />

      <Footer />
    </div>
  );
} 