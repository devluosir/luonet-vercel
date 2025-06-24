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
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const validTabs: HistoryType[] = ['quotation', 'confirmation', 'invoice', 'purchase'];
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
  const [showExportOptions, setShowExportOptions] = useState(false);
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
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          try {
            // 智能识别文件类型并导入
            const importResult = smartImport(content);
            
            if (importResult.success) {
              loadHistory();
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
              alert(`导入失败：${importResult.error}`);
            }
          } catch (error) {
            console.error('Error importing:', error);
            alert('导入失败：文件格式错误');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // 智能导入函数
  const smartImport = (content: string) => {
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(content);
      } catch (parseError) {
        // 尝试修复常见的JSON格式问题
        const fixedContent = content
          .replace(/\n/g, '')
          .replace(/\r/g, '')
          .replace(/\t/g, '')
          .trim();
        parsedData = JSON.parse(fixedContent);
      }

      // 检查是否是综合数据格式（包含metadata字段）
      if (parsedData && typeof parsedData === 'object' && 'metadata' in parsedData) {
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
          const quotationJson = JSON.stringify(allData.quotation);
          if (importQuotationHistory(quotationJson)) {
            results.details.push(`报价单：${allData.quotation.length} 条`);
            totalImported += allData.quotation.length;
            if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
              results.otherTabs.push('报价单');
            }
          }
        }

        // 处理销售确认数据
        if (allData.confirmation && Array.isArray(allData.confirmation) && allData.confirmation.length > 0) {
          const confirmationJson = JSON.stringify(allData.confirmation);
          if (importQuotationHistory(confirmationJson)) {
            results.details.push(`销售确认：${allData.confirmation.length} 条`);
            totalImported += allData.confirmation.length;
            if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
              results.otherTabs.push('销售确认');
            }
          }
        }

        // 处理发票数据
        if (allData.invoice && Array.isArray(allData.invoice) && allData.invoice.length > 0) {
          const invoiceJson = JSON.stringify(allData.invoice);
          if (importInvoiceHistory(invoiceJson)) {
            results.details.push(`发票：${allData.invoice.length} 条`);
            totalImported += allData.invoice.length;
            if (activeTab !== 'invoice') {
              results.otherTabs.push('发票');
            }
          }
        }

        // 处理采购单数据
        if (allData.purchase && Array.isArray(allData.purchase) && allData.purchase.length > 0) {
          const purchaseJson = JSON.stringify(allData.purchase);
          if (importPurchaseHistory(purchaseJson)) {
            results.details.push(`采购单：${allData.purchase.length} 条`);
            totalImported += allData.purchase.length;
            if (activeTab !== 'purchase') {
              results.otherTabs.push('采购单');
            }
          }
        }

        if (totalImported === 0) {
          return { success: false, error: '综合数据中未找到有效的历史记录数据' };
        }

        results.details.unshift(`总计导入：${totalImported} 条记录`);
        return results;
      }

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

      // 执行导入
      let totalImported = 0;

      if (quotationData.length > 0) {
        const quotationJson = JSON.stringify(quotationData);
        if (importQuotationHistory(quotationJson)) {
          results.details.push(`报价单：${quotationData.length} 条`);
          totalImported += quotationData.length;
          if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
            results.otherTabs.push('报价单');
          }
        }
      }

      if (confirmationData.length > 0) {
        const confirmationJson = JSON.stringify(confirmationData);
        if (importQuotationHistory(confirmationJson)) {
          results.details.push(`销售确认：${confirmationData.length} 条`);
          totalImported += confirmationData.length;
          if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
            results.otherTabs.push('销售确认');
          }
        }
      }

      if (invoiceData.length > 0) {
        const invoiceJson = JSON.stringify(invoiceData);
        if (importInvoiceHistory(invoiceJson)) {
          results.details.push(`发票：${invoiceData.length} 条`);
          totalImported += invoiceData.length;
          if (activeTab !== 'invoice') {
            results.otherTabs.push('发票');
          }
        }
      }

      if (purchaseData.length > 0) {
        const purchaseJson = JSON.stringify(purchaseData);
        if (importPurchaseHistory(purchaseJson)) {
          results.details.push(`采购单：${purchaseData.length} 条`);
          totalImported += purchaseData.length;
          if (activeTab !== 'purchase') {
            results.otherTabs.push('采购单');
          }
        }
      }

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

  // 避免闪烁，在客户端渲染前或activeTab未设置时返回空内容
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-[#1C1C1E] dark:via-[#1A1A1C] dark:to-[#1E1E20] flex flex-col">
      <main className="flex-1">
        <div className="max-w-full mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8">
          {/* 页面头部 */}
          <div className="mb-8">
            {/* 返回按钮 */}
            <Link 
              href="/tools" 
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">返回工具中心</span>
            </Link>

            {/* 页面标题+操作区 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Archive className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
                  单据管理中心
                </h1>
              </div>
              <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="搜索客户、单号..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white w-full sm:w-80 transition-all duration-200"
                  />
                </div>
                <button
                  onClick={handleImport}
                  className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-white hover:bg-gradient-to-br hover:from-green-400 hover:to-emerald-400 dark:hover:from-green-600 dark:hover:to-emerald-600 transition-all duration-200"
                  title="导入"
                >
                  <Upload className="w-5 h-5" />
                </button>
                <button
                  onClick={handleExport}
                  className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-white hover:bg-gradient-to-br hover:from-purple-400 hover:to-violet-400 dark:hover:from-purple-600 dark:hover:to-violet-600 transition-all duration-200"
                  title="导出"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {(() => {
              // 统计每个类型的匹配数量
              const searchLower = filters.search?.toLowerCase() || '';
              const getMatchCount = (type: HistoryType) => {
                let items: HistoryItem[] = [];
                if (type === 'quotation') items = getQuotationHistory().filter(item => item.type === 'quotation');
                if (type === 'confirmation') items = getQuotationHistory().filter(item => item.type === 'confirmation');
                if (type === 'invoice') items = getInvoiceHistory();
                if (type === 'purchase') items = getPurchaseHistory();
                if (!searchLower) return 0;
                return items.filter(item => {
                  const searchableText = [
                    'customerName' in item ? item.customerName : '',
                    'supplierName' in item ? item.supplierName : '',
                    'quotationNo' in item ? item.quotationNo : '',
                    'orderNo' in item ? item.orderNo : '',
                    'invoiceNo' in item ? item.invoiceNo : ''
                  ].join(' ').toLowerCase();
                  return searchableText.includes(searchLower);
                }).length;
              };
              const statList = [
                {
                  id: 'quotation',
                  name: '报价单',
                  icon: FileText,
                  iconClass: 'text-blue-600',
                  bgClass: 'bg-blue-100',
                  count: getQuotationHistory().filter(item => item.type === 'quotation').length
                },
                {
                  id: 'confirmation',
                  name: '销售确认',
                  icon: Receipt,
                  iconClass: 'text-green-600',
                  bgClass: 'bg-green-100',
                  count: getQuotationHistory().filter(item => item.type === 'confirmation').length
                },
                {
                  id: 'invoice',
                  name: '发票',
                  icon: Receipt,
                  iconClass: 'text-purple-600',
                  bgClass: 'bg-purple-100',
                  count: getInvoiceHistory().length
                },
                {
                  id: 'purchase',
                  name: '采购单',
                  icon: ShoppingCart,
                  iconClass: 'text-orange-600',
                  bgClass: 'bg-orange-100',
                  count: getPurchaseHistory().length
                }
              ];
              return statList.map((stat) => {
                const matchCount = getMatchCount(stat.id as HistoryType);
                return (
                  <div
                    key={stat.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer ${
                      activeTab === stat.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                    }`}
                    onClick={() => setActiveTab(stat.id as HistoryType)}
                  >
                    <div className="flex items-center justify-between relative">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {stat.name}
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                          {stat.count.toLocaleString()}
                        </p>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-lg ${stat.bgClass} relative`}>
                        <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.iconClass}`} />
                        {/* 搜索匹配徽标 */}
                        {filters.search && matchCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 shadow">
                            {matchCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* 历史记录列表 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                <div className="text-gray-600 dark:text-gray-400 font-medium">正在加载数据...</div>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <Archive className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  暂无历史记录
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                  当前没有找到符合条件的记录，请尝试调整筛选条件或导入数据
                </p>
              </div>
            ) : (
              <>
                {/* 表头 */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-2 sm:px-4 py-4 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center w-full">
                    <div className="w-6 flex-shrink-0 flex items-center justify-center">
                      <input type="checkbox"
                        checked={selectedIds.size === history.length && history.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(history.map(item => item.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:ring-2"
                      />
                    </div>
                    <div className="flex-1 min-w-0 truncate font-semibold text-gray-900 dark:text-white pl-2">
                      客户/供应商
                    </div>
                    <div className="w-40 flex-shrink-0 px-2 font-semibold text-gray-900 dark:text-white">
                      {activeTab === 'confirmation'
                        ? '订单号'
                        : activeTab === 'quotation'
                          ? '询价号'
                          : '单号'}
                    </div>
                    <div className="hidden md:block w-36 flex-shrink-0 font-semibold text-gray-900 dark:text-white">
                      金额
                    </div>
                    <div className="hidden lg:block w-40 flex-shrink-0 font-semibold text-gray-900 dark:text-white">
                      创建时间
                    </div>
                    <div className="w-32 flex-shrink-0 flex items-center justify-center font-semibold text-gray-900 dark:text-white">
                      操作
                    </div>
                  </div>
                </div>

                {/* 记录列表 */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {history.map((item) => {
                    const Icon = getRecordIcon(item);
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`px-2 sm:px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800' : ''
                        }`}
                      >
                        <div className="flex items-center w-full">
                          <div className="w-6 flex-shrink-0 flex items-center justify-center">
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
                              className="rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:ring-2"
                            />
                          </div>
                          <div className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white pl-2" title={getCustomerName(item)}>
                            {getCustomerName(item)}
                          </div>
                          <div className="w-40 flex-shrink-0 px-2">
                            <div className="whitespace-nowrap text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                              {getRecordNumber(item, activeTab)}
                            </div>
                          </div>
                          <div className="hidden md:block w-36 flex-shrink-0">
                            <span className="whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {item.currency} {item.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="hidden lg:block w-40 flex-shrink-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                            </div>
                          </div>
                          <div className="w-32 flex-shrink-0 flex items-center justify-center">
                            {/* 小屏只显示查看按钮，其余sm及以上显示 */}
                            <div className="flex items-center justify-end space-x-1 sm:hidden">
                              <button
                                onClick={() => handlePreview(item.id)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                                title="预览"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="hidden sm:flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handlePreview(item.id)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                                title="预览"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(item.id)}
                                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 rounded-lg transition-all duration-200"
                                title="编辑"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCopy(item.id)}
                                className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:text-green-400 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                                title="复制"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setShowPreview(null);
                                  if (pdfPreviewUrl) {
                                    URL.revokeObjectURL(pdfPreviewUrl);
                                    setPdfPreviewUrl(null);
                                  }
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="关闭"
                              >
                                <X className="w-6 h-6" />
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
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-t border-green-200 dark:border-green-800 px-4 py-3">
                    <div className="text-right text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {Object.entries(history.reduce((acc, item) => {
                        if (!acc[item.currency]) acc[item.currency] = 0;
                        acc[item.currency] += item.totalAmount;
                        return acc;
                      }, {} as Record<string, number>)).map(([currency, total]) => (
                        <span key={currency} className="mr-4">
                          {currency} 合计：
                          <span className="font-bold text-green-600 dark:text-green-400">{total.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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

      {/* 导出选择框 */}
      {showExportOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  选择导出方式
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  请选择要导出的数据类型
                </p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => executeExport('current')}
                className="w-full p-4 text-left bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      导出当前选项卡数据
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      仅导出当前查看的 {activeTab === 'quotation' ? '报价单' : activeTab === 'confirmation' ? '销售确认' : activeTab === 'invoice' ? '发票' : '采购单'} 数据
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => executeExport('all')}
                className="w-full p-4 text-left bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-green-200 dark:border-green-800 hover:from-green-100 hover:to-emerald-100 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Archive className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      导出所有历史记录
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      导出所有类型的历史记录，包含完整备份
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => executeExport('filtered')}
                className="w-full p-4 text-left bg-gradient-to-r from-purple-50 to-violet-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-violet-100 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      导出筛选后的数据
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      导出当前筛选条件下的数据 ({history.length} 条)
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowExportOptions(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 预览弹窗 */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
            {/* 弹窗头部 */}
            {(() => {
              const item = history.find(h => h.id === showPreview);
              if (!item) return (
                <div className="p-8 text-center">
                  <div className="text-gray-500 dark:text-gray-400">记录不存在</div>
                </div>
              );
              return (
                <>
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        {(() => {
                          const Icon = getRecordIcon(item);
                          return <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
                        })()}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {getRecordTypeName(item)}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(item.id)}
                        className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 rounded-lg transition-all duration-200"
                        title="编辑"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleCopy(item.id)}
                        className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:text-green-400 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                        title="复制"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setShowPreview(null);
                          if (pdfPreviewUrl) {
                            URL.revokeObjectURL(pdfPreviewUrl);
                            setPdfPreviewUrl(null);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="关闭"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  {/* 基本信息内容 */}
                  <div className="p-6 pb-2">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-center items-center py-2 px-3 bg-white dark:bg-gray-800 rounded-lg">
                            <span className="text-sm font-bold text-red-600 dark:text-blue-400">{getRecordNumber(item, activeTab)}</span>
                          </div>
                          <div className="flex justify-center items-center py-2 px-3 bg-white dark:bg-gray-800 rounded-lg">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{getCustomerName(item)}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-800 rounded-lg">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">总金额</span>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                              {item.currency} {item.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-800 rounded-lg">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">创建时间</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                            </span>
                          </div>
                          {'updatedAt' in item && (
                            <div className="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-800 rounded-lg">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">更新时间</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {format(new Date(item.updatedAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* PDF预览 */}
                  <div className="m-6 mt-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-2 min-h-[600px] flex items-center justify-center border border-gray-200 dark:border-gray-600">
                      {isGeneratingPdf ? (
                        <div className="flex flex-col items-center space-y-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">正在生成PDF预览...</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">请稍候</p>
                          </div>
                        </div>
                      ) : pdfPreviewUrl ? (
                        <div className="w-full h-full">
                          <iframe
                            src={pdfPreviewUrl}
                            className="w-full h-[700px] border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg"
                            title="PDF预览"
                          />
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 dark:text-gray-400">
                          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">无法生成PDF预览</p>
                          <p className="text-sm">请检查记录数据是否完整</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
} 