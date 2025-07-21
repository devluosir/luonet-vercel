'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FileText, 
  Receipt, 
  ShoppingCart, 
  Package,
  Search, 
  Filter, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw,
  ArrowLeft,
  X
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { usePermissionStore } from '@/lib/permissions';

// 导入历史记录工具函数
import { 
  getQuotationHistory, 
  deleteQuotationHistory
} from '@/utils/quotationHistory';
import { 
  getPurchaseHistory, 
  deletePurchaseHistory
} from '@/utils/purchaseHistory';
import { 
  getInvoiceHistory, 
  deleteInvoiceHistory
} from '@/utils/invoiceHistory';
import { 
  getPackingHistory, 
  deletePackingHistory
} from '@/utils/packingHistory';

// 类型定义
interface Permission {
  id: string;
  moduleId: string;
  canAccess: boolean;
}

interface User {
  id: string;
  username: string;
  email: string | null;
  status: boolean;
  isAdmin: boolean;
  permissions: Permission[];
}

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

type HistoryType = 'quotation' | 'confirmation' | 'invoice' | 'purchase' | 'packing';
type HistoryItem = QuotationHistory | PurchaseHistory | InvoiceHistory | PackingHistory;

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

const PackingHistoryTab = dynamic(() => import('./tabs/PackingHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载装箱单历史...</div>,
  ssr: false
});

const ExportModal = dynamic(() => import('./ExportModal'), { ssr: false });
const ImportModal = dynamic(() => import('./ImportModal'), { ssr: false });
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { ssr: false });

export default function HistoryManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 使用权限store
  const { user, isLoading: userLoading, hasPermission } = usePermissionStore();
  const [activeTab, setActiveTab] = useState<HistoryType>(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && ['quotation', 'confirmation', 'invoice', 'purchase', 'packing'].includes(tabParam)) {
      return tabParam as HistoryType;
    }
    return 'quotation';
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);
  const [previewType, setPreviewType] = useState<'quotation'|'confirmation'|'invoice'|'purchase'|'packing'>('quotation');
  const [isDeleting, setIsDeleting] = useState(false);

  // 用户信息获取已移至权限store

  useEffect(() => {
    setMounted(true);
    
    // 组件卸载时的清理函数
    return () => {
      setHistory([]);
      setSelectedIds(new Set());
      setShowDeleteConfirm(null);
      setShowExportOptions(false);
      setShowImportModal(false);
      setShowPreview(null);
    };
  }, []);

  // 根据用户权限获取可用的tab
  const getAvailableTabs = useCallback(() => {
    const tabPermissions = {
      quotation: 'quotation',
      confirmation: 'quotation', // 确认书也使用quotation权限
      invoice: 'invoice',
      purchase: 'purchase',
      packing: 'packing'
    };
    
    const availableTabs: { id: HistoryType; name: string; shortName: string; icon: any }[] = [];
    
    // 定义tab的顺序：报价单、合同确认、装箱单、发票、采购单
    const tabOrder = ['quotation', 'confirmation', 'packing', 'invoice', 'purchase'];
    
    // 按照指定顺序检查每个tab的权限
    tabOrder.forEach(tabId => {
      const moduleId = tabPermissions[tabId as keyof typeof tabPermissions];
      if (hasPermission(moduleId)) {
        switch (tabId) {
          case 'quotation':
            availableTabs.push({ id: 'quotation', name: '报价单', shortName: '报价', icon: FileText });
            break;
          case 'confirmation':
            availableTabs.push({ id: 'confirmation', name: '合同确认', shortName: '合同', icon: FileText });
            break;
          case 'packing':
            availableTabs.push({ id: 'packing', name: '装箱单', shortName: '装箱', icon: Package });
            break;
          case 'invoice':
            availableTabs.push({ id: 'invoice', name: '发票', shortName: '发票', icon: Receipt });
            break;
          case 'purchase':
            availableTabs.push({ id: 'purchase', name: '采购单', shortName: '采购', icon: ShoppingCart });
            break;
        }
      }
    });
    
    return availableTabs;
  }, [hasPermission]);

  // 检查当前activeTab是否有权限
  const isActiveTabAvailable = useCallback(() => {
    const availableTabs = getAvailableTabs();
    return availableTabs.some(tab => tab.id === activeTab);
  }, [activeTab, getAvailableTabs]);

  // 如果当前activeTab没有权限，自动切换到第一个有权限的tab
  useEffect(() => {
    if (!userLoading && user) {
      const availableTabs = getAvailableTabs();
      if (availableTabs.length > 0 && !isActiveTabAvailable()) {
        setActiveTab(availableTabs[0].id);
      }
    }
  }, [user, userLoading, getAvailableTabs, isActiveTabAvailable]);

  // 处理返回按钮点击
  const handleBack = () => {
    // 清理状态和资源
    setHistory([]);
    setSelectedIds(new Set());
    setShowDeleteConfirm(null);
    setShowExportOptions(false);
    setShowImportModal(false);
    setShowPreview(null);
    
    // 预加载dashboard页面
    router.prefetch('/dashboard');
    
    // 延迟跳转，给清理操作一些时间
    setTimeout(() => {
      router.push('/dashboard');
    }, 100);
  };

  // 获取过滤后的历史记录
  const getFilteredHistory = useCallback((items: HistoryItem[]) => {
    try {
      return items.filter(item => {
        // 搜索过滤
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const customerName = getCustomerName(item).toLowerCase();
          const recordNumber = getRecordNumber(item, activeTab).toLowerCase();
          
          return customerName.includes(searchLower) || 
                 recordNumber.includes(searchLower);
        }
        
        // 类型过滤
        if (filters.type !== 'all') {
          if (activeTab === 'quotation' || activeTab === 'confirmation') {
            return (item as QuotationHistory).type === filters.type;
          }
          // 对于发票和采购单，类型过滤不适用
          return true;
        }
        
        // 日期范围过滤
        if (filters.dateRange !== 'all') {
          const itemDate = new Date(item.createdAt);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - itemDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          switch (filters.dateRange) {
            case 'today':
              return diffDays <= 1;
            case 'week':
              return diffDays <= 7;
            case 'month':
              return diffDays <= 30;
            case 'year':
              return diffDays <= 365;
            default:
              return true;
          }
        }
        
        // 金额范围过滤
        if (filters.amountRange !== 'all') {
          const amount = item.totalAmount;
          switch (filters.amountRange) {
            case 'low':
              return amount < 1000;
            case 'medium':
              return amount >= 1000 && amount < 10000;
            case 'high':
              return amount >= 10000;
            default:
              return true;
          }
        }
        
        return true;
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error filtering history:', error);
      }
      return items; // 返回原始数据，避免页面崩溃
    }
  }, [filters, activeTab]);

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
    try {
      // 检查用户是否有权限访问当前activeTab
      const availableTabs = getAvailableTabs();
      if (!availableTabs.some(tab => tab.id === activeTab)) {
        setHistory([]);
        return;
      }
      
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
        case 'packing':
          results = getPackingHistory().map(item => ({
            ...item,
            updatedAt: item.createdAt // 使用createdAt作为updatedAt
          }));
          break;
      }

      const filteredResults = getFilteredHistory(results);
      const sortedResults = getSortedHistory(filteredResults);
      setHistory(sortedResults);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }, [activeTab, getFilteredHistory, getSortedHistory, getAvailableTabs]);

  useEffect(() => {
    if (mounted) {
      loadHistory();
    }
  }, [mounted, loadHistory]);

  // 处理排序
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 处理删除
  const handleDelete = async (id: string) => {
    try {
      // 检查用户是否有权限访问当前activeTab
      const availableTabs = getAvailableTabs();
      if (!availableTabs.some(tab => tab.id === activeTab)) {
        console.error('No permission to delete this type of document');
        return;
      }
      
      setIsDeleting(true);
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
          success = deletePurchaseHistory(id);
          break;
        case 'packing':
          success = deletePackingHistory(id);
          break;
      }

      if (success) {
        setHistory(prev => prev.filter(item => item.id !== id));
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        // 强制刷新数据
        setRefreshKey(prev => prev + 1);
        loadHistory();
        console.log('删除成功');
      } else {
        console.error('删除失败，请重试');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    try {
      // 检查用户是否有权限访问当前activeTab
      const availableTabs = getAvailableTabs();
      if (!availableTabs.some(tab => tab.id === activeTab)) {
        console.error('No permission to delete this type of document');
        return;
      }
      
      setIsDeleting(true);
      let successCount = 0;
      const idsToDelete = Array.from(selectedIds);

      idsToDelete.forEach(id => {
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
            success = deletePurchaseHistory(id);
            break;
          case 'packing':
            success = deletePackingHistory(id);
            break;
        }

        if (success) {
          successCount++;
        }
      });

      if (successCount > 0) {
        setHistory(prev => prev.filter(item => !selectedIds.has(item.id)));
        setSelectedIds(new Set());
        // 强制刷新数据
        setRefreshKey(prev => prev + 1);
        loadHistory();
        console.log(`成功删除 ${successCount} 条记录`);
      } else {
        console.error('删除失败，请重试');
      }
    } catch (error) {
      console.error('Error batch deleting items:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // 处理编辑
  const handleEdit = (id: string) => {
    try {
      // 检查用户是否有权限访问当前activeTab
      const availableTabs = getAvailableTabs();
      if (!availableTabs.some(tab => tab.id === activeTab)) {
        console.error('No permission to edit this type of document');
        return;
      }
      
      let item;
      
      switch (activeTab) {
        case 'quotation':
        case 'confirmation':
          item = getQuotationHistory().find(item => item.id === id);
          if (item) {
            router.push(`/quotation/edit/${id}`);
          }
          break;
        case 'invoice':
          item = getInvoiceHistory().find(item => item.id === id);
          if (item) {
            router.push(`/invoice/edit/${id}`);
          }
          break;
        case 'purchase':
          item = getPurchaseHistory().find(item => item.id === id);
          if (item) {
            router.push(`/purchase/edit/${id}`);
          }
          break;
        case 'packing':
          item = getPackingHistory().find(item => item.id === id);
          if (item) {
            router.push(`/packing/edit/${id}`);
          }
          break;
      }
    } catch (error) {
      console.error('Error navigating to edit page:', error);
    }
  };

  // 处理复制
  const handleCopy = (id: string) => {
    try {
      // 检查用户是否有权限访问当前activeTab
      const availableTabs = getAvailableTabs();
      if (!availableTabs.some(tab => tab.id === activeTab)) {
        console.error('No permission to copy this type of document');
        return;
      }
      
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
        case 'packing':
          router.push(`/packing/copy/${id}`);
          break;
      }
    } catch (error) {
      console.error('Error navigating to copy page:', error);
    }
  };

  // 处理转换（从订单确认转到装箱单）
  const handleConvert = (id: string) => {
    try {
      // 检查用户是否有权限访问装箱单功能
      const availableTabs = getAvailableTabs();
      if (!availableTabs.some(tab => tab.id === 'packing')) {
        console.error('No permission to convert to packing document');
        return;
      }
      
      if (activeTab === 'confirmation') {
        // 查找订单确认记录
        const confirmationItem = getQuotationHistory().find(item => item.id === id && item.type === 'confirmation');
        if (confirmationItem && confirmationItem.data) {
          // 转换数据格式
          const packingData = convertConfirmationToPacking(confirmationItem.data);
          
          // 将数据存储到全局变量供packing页面使用
          (window as any).__PACKING_DATA__ = packingData;
          (window as any).__EDIT_MODE__ = false;
          
          // 跳转到装箱单页面
          router.push('/packing');
        }
      }
    } catch (error) {
      console.error('Error converting to packing:', error);
    }
  };

  // 转换订单确认数据到装箱单数据
  const convertConfirmationToPacking = (confirmationData: any) => {
    // 默认单位列表（需要单复数变化的单位）
    const defaultUnits = ['pc', 'set', 'length'];
    
    // 处理单位的单复数
    const getUnitDisplay = (baseUnit: string, quantity: number) => {
      if (defaultUnits.includes(baseUnit)) {
        return quantity > 1 ? `${baseUnit}s` : baseUnit;
      }
      return baseUnit; // 自定义单位不变化单复数
    };

    const packingItems = confirmationData.items.map((item: any, index: number) => {
      const quantity = item.quantity || 0;
      const originalUnit = item.unit || 'pc';
      // 去掉原单位可能的复数后缀，然后根据数量重新处理
      const baseUnit = originalUnit.replace(/s$/, '');
      const correctedUnit = getUnitDisplay(baseUnit, quantity);

      return {
        id: index + 1,
        serialNo: (index + 1).toString(),
        // 合并 partName 和 description
        description: [item.partName, item.description].filter(Boolean).join(' - '),
        hsCode: '',
        quantity,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.amount || 0,
        netWeight: 0,
        grossWeight: 0,
        packageQty: 0,
        dimensions: '',
        unit: correctedUnit
      };
    });

    return {
      orderNo: confirmationData.inquiryNo || '',
      invoiceNo: confirmationData.contractNo || '', // contractNo -> invoiceNo
      date: confirmationData.date || new Date().toISOString().split('T')[0],
      
      consignee: {
        name: confirmationData.to || ''
      },
      
      markingNo: '',
      
      items: packingItems,
      currency: confirmationData.currency || 'USD',
      remarks: '',
      remarkOptions: {
        shipsSpares: true,
        customsPurpose: true,
      },
      showHsCode: false,
      showDimensions: false,
      showWeightAndPackage: true,
      showPrice: true,
      dimensionUnit: 'cm',
      documentType: 'both' as const,
      templateConfig: {
        headerType: 'bilingual' as const
      },
      customUnits: confirmationData.customUnits || []
    };
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

  // 全选/取消全选
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

  // 处理导入
  const handleImport = () => {
    setShowImportModal(true);
  };

  // 获取记录编号
  const getRecordNumber = (item: HistoryItem, activeTab: HistoryType) => {
    switch (activeTab) {
      case 'quotation':
      case 'confirmation':
        return (item as QuotationHistory).quotationNo;
      case 'invoice':
        return (item as InvoiceHistory).invoiceNo;
      case 'purchase':
        return (item as PurchaseHistory).orderNo;
      case 'packing':
        return (item as PackingHistory).invoiceNo;
      default:
        return '';
    }
  };

  // 获取客户名称
  const getCustomerName = (item: HistoryItem) => {
    if ('customerName' in item) {
      return item.customerName;
    }
    if ('supplierName' in item) {
      return item.supplierName;
    }
    if ('consigneeName' in item) {
      return item.consigneeName;
    }
    return '';
  };

  // 处理预览
  const handlePreview = (id: string) => {
    try {
      // 检查用户是否有权限访问当前activeTab
      const availableTabs = getAvailableTabs();
      if (!availableTabs.some(tab => tab.id === activeTab)) {
        console.error('No permission to preview this type of document');
        return;
      }
      
      let item;
      
      switch (activeTab) {
        case 'quotation':
        case 'confirmation':
          item = getQuotationHistory().find(item => item.id === id);
          break;
        case 'invoice':
          item = getInvoiceHistory().find(item => item.id === id);
          break;
        case 'purchase':
          item = getPurchaseHistory().find(item => item.id === id);
          break;
        case 'packing':
          item = getPackingHistory().find(item => item.id === id);
          break;
      }

      if (item) {
        setPreviewItem(item);
        setPreviewType(activeTab);
        setShowPreview(id);
      }
    } catch (error) {
      console.error('Error previewing item:', error);
    }
  };

  // 获取选项卡数量
  const getTabCount = useCallback((tabType: HistoryType) => {
    try {
      // 检查用户是否有权限访问此tab
      const availableTabs = getAvailableTabs();
      if (!availableTabs.some(tab => tab.id === tabType)) {
        return 0;
      }
      
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
        case 'packing':
          results = getPackingHistory().map(item => ({
            ...item,
            updatedAt: item.createdAt // 使用createdAt作为updatedAt
          }));
          break;
      }

      // 应用所有过滤条件
      results = results.filter(item => {
        // 搜索过滤
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const customerName = getCustomerName(item).toLowerCase();
          const recordNumber = getRecordNumber(item, tabType).toLowerCase();
          
          if (!customerName.includes(searchLower) && !recordNumber.includes(searchLower)) {
            return false;
          }
        }
        
        // 类型过滤（对于报价单和确认书）
        if (filters.type !== 'all') {
          if (tabType === 'quotation' || tabType === 'confirmation') {
            if ((item as QuotationHistory).type !== filters.type) {
              return false;
            }
          }
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

      return results.length;
    } catch (error) {
      console.error('Error getting tab count:', error);
      return 0;
    }
  }, [filters, getAvailableTabs]);

  // 获取搜索结果的徽章样式
  const getSearchResultBadge = useCallback((tabType: HistoryType) => {
    // 检查用户是否有权限访问此tab
    const availableTabs = getAvailableTabs();
    if (!availableTabs.some(tab => tab.id === tabType)) {
      return 'text-gray-400 border-gray-300 bg-gray-50 dark:text-gray-500 dark:border-gray-600 dark:bg-gray-800/50';
    }
    
    // 检查是否有任何过滤条件被应用
    const hasFilters = filters.search || 
                      filters.type !== 'all' || 
                      filters.dateRange !== 'all' || 
                      filters.amountRange !== 'all';
    
    if (!hasFilters) {
      // 没有过滤时，返回默认的tab颜色徽章 - 按照新的顺序：报价单、合同确认、装箱单、发票、采购单
      switch (tabType) {
        case 'quotation':
          return 'text-blue-700 border-blue-400 bg-blue-50 dark:text-blue-300 dark:border-blue-500 dark:bg-blue-900/50';
        case 'confirmation':
          return 'text-green-700 border-green-400 bg-green-50 dark:text-green-300 dark:border-green-500 dark:bg-green-900/50';
        case 'packing':
          return 'text-teal-700 border-teal-400 bg-teal-50 dark:text-teal-300 dark:border-teal-500 dark:bg-teal-900/50';
        case 'invoice':
          return 'text-purple-700 border-purple-400 bg-purple-50 dark:text-purple-300 dark:border-purple-500 dark:bg-purple-900/50';
        case 'purchase':
          return 'text-orange-700 border-orange-400 bg-orange-50 dark:text-orange-300 dark:border-orange-500 dark:bg-orange-900/50';
        default:
          return 'text-blue-700 border-blue-400 bg-blue-50 dark:text-blue-300 dark:border-blue-500 dark:bg-blue-900/50';
      }
    } else {
      // 有过滤时，返回红色徽章
      return 'text-red-700 border-red-400 bg-red-50 dark:text-red-300 dark:border-red-500 dark:bg-red-900/50';
    }
  }, [filters, getAvailableTabs]);

  // 主色调映射 - 按照新的tab顺序：报价单、合同确认、装箱单、发票、采购单
  const tabColorMap = {
    quotation: 'blue',      // 报价单 - 蓝色
    confirmation: 'green',   // 合同确认 - 绿色
    packing: 'teal',        // 装箱单 - 青色
    invoice: 'purple',      // 发票 - 紫色
    purchase: 'orange'      // 采购单 - 橙色
  };
  const activeColor = tabColorMap[activeTab] || 'blue';

  // 处理删除确认
  const handleDeleteConfirm = async () => {
    if (showDeleteConfirm === 'batch') {
      await handleBatchDelete();
    } else if (showDeleteConfirm) {
      await handleDelete(showDeleteConfirm);
    }
    setShowDeleteConfirm(null);
  };

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showDeleteConfirm && !isDeleting) {
        if (event.key === 'Escape') {
          setShowDeleteConfirm(null);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          handleDeleteConfirm();
        }
      }
    };

    if (showDeleteConfirm) {
      document.addEventListener('keydown', handleKeyDown);
      // 禁用背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showDeleteConfirm, isDeleting]);

  // 避免闪烁，在客户端渲染前或activeTab未设置时返回空内容
  if (!mounted || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-black">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-900 dark:text-white">加载中...</div>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              正在获取用户权限信息...
            </div>
          )}
        </div>
      </div>
    );
  }

  // 如果没有可用权限，显示提示信息
  if (!userLoading && user && getAvailableTabs().length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-black">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              暂无可用权限
            </div>
            <div className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              您没有访问任何单据管理功能的权限，请联系管理员分配权限
            </div>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
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
                  <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">单据管理中心</h1>
              </div>
              <div className="flex items-center justify-center sm:justify-end space-x-2">
                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="搜索..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-8 sm:pl-10 pr-8 sm:pr-10 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent w-32 sm:w-40 lg:w-64 placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base"
                  />
                  {filters.search && (
                    <button
                      type="button"
                      className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                      tabIndex={-1}
                      aria-label="清空搜索"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>
                
                {/* 高级过滤按钮 */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg border transition-all duration-200 ${
                    showFilters 
                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title="高级过滤"
                >
                  <Filter className="w-4 h-4" />
                </button>

                {/* 导入按钮（蓝色，Upload） */}
                <button
                  onClick={handleImport}
                  className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200"
                  title="导入"
                >
                  <Upload className="w-5 h-5" />
                </button>
                {/* 导出按钮（绿色，Download） */}
                <button
                  onClick={handleExport}
                  className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all duration-200"
                  title="导出"
                >
                  <Download className="w-5 h-5" />
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm('batch')}
                    className="px-3 py-2 flex items-center bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
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
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm"
                >重置</button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-[#1c1c1e] border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
            {/* 小屏时使用可滚动的flex，大屏时使用正常间距，所有屏幕都居中 */}
            <div className="flex justify-center space-x-0.5 sm:space-x-4 lg:space-x-8 overflow-x-auto scrollbar-hide">
              {getAvailableTabs().map((tab) => {
                const Icon = tab.icon;
                const count = getTabCount(tab.id as HistoryType);
                const isActive = activeTab === tab.id;
                const badgeStyle = getSearchResultBadge(tab.id as HistoryType);
                
                // 根据tab类型设置对应的颜色 - 按照新的顺序：报价单、合同确认、装箱单、发票、采购单
                let activeClasses = '';
                if (isActive) {
                  switch (tab.id) {
                    case 'quotation':
                      activeClasses = 'border-blue-500 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30';
                      break;
                    case 'confirmation':
                      activeClasses = 'border-green-500 text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/30';
                      break;
                    case 'packing':
                      activeClasses = 'border-teal-500 text-teal-600 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30';
                      break;
                    case 'invoice':
                      activeClasses = 'border-purple-500 text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30';
                      break;
                    case 'purchase':
                      activeClasses = 'border-orange-500 text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30';
                      break;
                    default:
                      activeClasses = 'border-blue-500 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30';
                  }
                }
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as HistoryType)}
                    className={`flex items-center space-x-1 sm:space-x-2 py-1.5 sm:py-2 px-2 sm:px-4 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap flex-shrink-0 rounded-t-lg border-2 border-transparent
                      ${isActive ? activeClasses : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    <span className="relative inline-block">
                      <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className={`absolute -top-0.5 sm:-top-1 -right-1 sm:-right-2 min-w-[14px] sm:min-w-[18px] h-3 sm:h-4 px-0.5 sm:px-1 ${badgeStyle} text-[9px] sm:text-xs rounded-full flex items-center justify-center font-bold border border-white dark:border-gray-900 shadow-sm`}> 
                        {count}
                      </span>
                    </span>
                    {/* 小屏显示简化字，大屏显示完整名称 */}
                    <span className="inline sm:hidden">{tab.shortName}</span>
                    <span className="hidden sm:inline">{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Tab Content - 按照新的顺序：报价单、合同确认、装箱单、发票、采购单 */}
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
                  onConvert={handleConvert}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onSelectAll={handleSelectAll}
                  mainColor={activeColor}
                  refreshKey={refreshKey}
                />
              )}
              {activeTab === 'packing' && (
                <PackingHistoryTab 
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
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setShowDeleteConfirm(null);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100 animate-in fade-in-0 zoom-in-95 relative">
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowDeleteConfirm(null)}
              disabled={isDeleting}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="关闭对话框"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 头部 */}
            <div className="flex items-center p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-300" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  确认删除
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {showDeleteConfirm === 'batch' ? '批量删除操作' : '单条记录删除'}
                </p>
              </div>
            </div>

            {/* 内容 */}
            <div className="p-6 pt-4">
              <div className="mb-6">
                {showDeleteConfirm === 'batch' ? (
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 dark:text-orange-300 text-sm font-bold">
                          {selectedIds.size}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          即将删除 {selectedIds.size} 条记录
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-300">
                          此操作将永久删除选中的记录
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      <p>• 删除后数据将无法恢复</p>
                      <p>• 请确认所有选中的记录都是需要删除的</p>
                      <p>• 建议在删除前先导出备份</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-300" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          即将删除此条记录
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-300">
                          此操作将永久删除该记录
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      <p>• 删除后数据将无法恢复</p>
                      <p>• 请确认此记录确实需要删除</p>
                      <p>• 如需保留数据，请先导出备份</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 focus:bg-red-700 dark:focus:bg-red-600 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isDeleting && (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  )}
                  <span>
                    {isDeleting 
                      ? '删除中...' 
                      : (showDeleteConfirm === 'batch' ? `删除 ${selectedIds.size} 条` : '确认删除')
                    }
                  </span>
                </button>
              </div>
              
              {/* 开发环境测试按钮 */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">开发环境测试：</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedIds(new Set(['test1', 'test2', 'test3']));
                        setShowDeleteConfirm('batch');
                      }}
                      className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/70"
                    >
                      测试批量删除
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm('test-single')}
                      className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded border border-green-200 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/70"
                    >
                      测试单条删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 导入导出弹窗 */}
      <ExportModal
        isOpen={showExportOptions}
        onClose={() => setShowExportOptions(false)}
        activeTab={activeTab}
        filteredData={history}
      />

      {/* 导入弹窗 */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        activeTab={activeTab}
        onImportSuccess={() => { 
          setRefreshKey(prev => prev + 1); 
          loadHistory(); 
        }}
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