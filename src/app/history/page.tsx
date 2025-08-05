'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import '../pdf-fonts.css'; // 使用相对路径导入
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

  // 基础状态
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<HistoryType>('quotation');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 数据状态
  const [quotationHistory, setQuotationHistory] = useState<QuotationHistory[]>([]);
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceHistory[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [packingHistory, setPackingHistory] = useState<PackingHistory[]>([]);

  // 筛选和排序状态
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: 'all',
    dateRange: 'all',
    amountRange: 'all'
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'updatedAt',
    direction: 'desc'
  });

  // 选择状态
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // 预览状态
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // 刷新键
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // 过滤器显示状态
  const [showFilters, setShowFilters] = useState(false);

  // 标记是否是从其他页面跳转过来的（不进行权限验证）
  const [isFromOtherPage, setIsFromOtherPage] = useState(false);

  // 用户信息获取已移至权限store

  // 处理URL参数中的tab参数
  useEffect(() => {
    if (mounted && searchParams) {
      const tabParam = searchParams.get('tab');
      if (tabParam && ['quotation', 'confirmation', 'invoice', 'purchase', 'packing'].includes(tabParam)) {
        setActiveTab(tabParam as HistoryType);
        setIsFromOtherPage(true); // 标记为从其他页面跳转过来
      }
    }
  }, [mounted, searchParams]);

  useEffect(() => {
    setMounted(true);
    
    // 组件卸载时的清理函数
    return () => {
      setQuotationHistory([]);
      setInvoiceHistory([]);
      setPurchaseHistory([]);
      setPackingHistory([]);
      setSelectedItems(new Set());
      setShowDeleteConfirm(false);
      setDeleteConfirmId(null);
      setShowExportModal(false);
      setShowImportModal(false);
      setShowPreview(false);
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
    
    // 如果是从其他页面跳转过来的，跳过权限验证
    if (isFromOtherPage) {
      tabOrder.forEach(tabId => {
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
      });
      return availableTabs;
    }
    
    // 按照指定顺序检查每个tab的权限
    tabOrder.forEach(tabId => {
      const moduleId = tabPermissions[tabId as keyof typeof tabPermissions];
      // 移除权限检查，所有tab都可用
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
    });
    
    return availableTabs;
  }, [isFromOtherPage]);

  // 检查当前activeTab是否有权限
  const isActiveTabAvailable = useCallback(() => {
    // 如果是从其他页面跳转过来的，跳过权限验证
    if (isFromOtherPage) {
      return true;
    }
    const availableTabs = getAvailableTabs();
    return availableTabs.some(tab => tab.id === activeTab);
  }, [activeTab, getAvailableTabs, isFromOtherPage]);

  // 如果当前activeTab没有权限，自动切换到第一个有权限的tab
  useEffect(() => {
    // 移除权限检查，所有tab都可用
    const availableTabs = getAvailableTabs();
    if (availableTabs.length > 0 && !isActiveTabAvailable()) {
      setActiveTab(availableTabs[0].id);
    }
  }, [getAvailableTabs, isActiveTabAvailable, isFromOtherPage]);

  // 处理返回按钮点击
  const handleBack = () => {
    // 清理状态和资源
    setQuotationHistory([]);
    setInvoiceHistory([]);
    setPurchaseHistory([]);
    setPackingHistory([]);
    setSelectedItems(new Set());
    setShowDeleteConfirm(false);
    setDeleteConfirmId(null);
    setShowExportModal(false);
    setShowImportModal(false);
    setShowPreview(false);
    
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
      // 如果是从其他页面跳转过来的，跳过权限验证
      if (!isFromOtherPage) {
        // 检查用户是否有权限访问当前activeTab
        const availableTabs = getAvailableTabs();
        if (!availableTabs.some(tab => tab.id === activeTab)) {
          // setHistory([]); // This line is removed
          return;
        }
      }
      
      let results: HistoryItem[] = [];
      
      switch (activeTab) {
        case 'quotation':
          results = getQuotationHistory();
          break;
        case 'confirmation':
          results = getQuotationHistory();
          break;
        case 'invoice':
          results = getInvoiceHistory();
          break;
        case 'purchase':
          results = getPurchaseHistory();
          break;
        case 'packing':
          results = getPackingHistory();
          break;
      }

      const filteredResults = getFilteredHistory(results);
      const sortedResults = getSortedHistory(filteredResults);
      // setHistory(sortedResults); // This line is removed
    } catch (error) {
      // 静默处理错误
    }
  }, [activeTab, getFilteredHistory, getSortedHistory, getAvailableTabs, isFromOtherPage]);

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
      // 如果是从其他页面跳转过来的，跳过权限验证
      if (!isFromOtherPage) {
        // 检查用户是否有权限访问当前activeTab
        const availableTabs = getAvailableTabs();
        if (!availableTabs.some(tab => tab.id === activeTab)) {
          return;
        }
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
        // setHistory(prev => prev.filter(item => item.id !== id)); // This line is removed
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        // 强制刷新数据
        setRefreshKey(prev => prev + 1);
        loadHistory();
      }
    } catch (error) {
      // 静默处理错误
    } finally {
      setIsDeleting(false);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    try {
      // 如果是从其他页面跳转过来的，跳过权限验证
      if (!isFromOtherPage) {
        // 检查用户是否有权限访问当前activeTab
        const availableTabs = getAvailableTabs();
        if (!availableTabs.some(tab => tab.id === activeTab)) {
          return;
        }
      }
      
      setIsDeleting(true);
      let successCount = 0;
      const idsToDelete = Array.from(selectedItems);

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
        // setHistory(prev => prev.filter(item => !selectedItems.has(item.id))); // This line is removed
        setSelectedItems(new Set());
        // 强制刷新数据
        setRefreshKey(prev => prev + 1);
        loadHistory();
      }
    } catch (error) {
      // 静默处理错误
    } finally {
      setIsDeleting(false);
    }
  };

  // 处理编辑
  const handleEdit = (id: string) => {
    try {
      // 如果是从其他页面跳转过来的，跳过权限验证
      if (!isFromOtherPage) {
        // 检查用户是否有权限访问当前activeTab
        const availableTabs = getAvailableTabs();
        if (!availableTabs.some(tab => tab.id === activeTab)) {
          return;
        }
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
      // 静默处理错误
    }
  };

  // 处理复制
  const handleCopy = (id: string) => {
    try {
      // 如果是从其他页面跳转过来的，跳过权限验证
      if (!isFromOtherPage) {
        // 检查用户是否有权限访问当前activeTab
        const availableTabs = getAvailableTabs();
        if (!availableTabs.some(tab => tab.id === activeTab)) {
          return;
        }
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
      // 静默处理错误
    }
  };

  // 处理转换（从订单确认转到装箱单）
  const handleConvert = (id: string) => {
    try {
      // 如果是从其他页面跳转过来的，跳过权限验证
      if (!isFromOtherPage) {
        // 检查用户是否有权限访问装箱单功能
        const availableTabs = getAvailableTabs();
        if (!availableTabs.some(tab => tab.id === 'packing')) {
          return;
        }
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
      // 静默处理错误
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
    setSelectedItems(prev => {
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
      // 根据当前activeTab获取对应的历史数据，并应用过滤条件
      let currentHistory: HistoryItem[] = [];
      switch (activeTab) {
        case 'quotation':
          // 报价单Tab只显示type为'quotation'的记录
          currentHistory = getQuotationHistory().filter(item => 
            'type' in item && (item as QuotationHistory).type === 'quotation'
          );
          break;
        case 'confirmation':
          // 确认书Tab只显示type为'confirmation'的记录
          currentHistory = getQuotationHistory().filter(item => 
            'type' in item && (item as QuotationHistory).type === 'confirmation'
          );
          break;
        case 'invoice':
          currentHistory = getInvoiceHistory();
          break;
        case 'purchase':
          currentHistory = getPurchaseHistory();
          break;
        case 'packing':
          currentHistory = getPackingHistory();
          // 应用文档类型过滤（如果filters.type不是'all'且不是'packing'）
          if (filters.type !== 'all' && filters.type !== 'packing') {
            if (['proforma', 'packing', 'both'].includes(filters.type)) {
              currentHistory = currentHistory.filter(item => 
                (item as PackingHistory).documentType === filters.type
              );
            }
          }
          break;
      }

      // 应用搜索过滤 - 根据不同Tab使用不同的搜索逻辑
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        currentHistory = currentHistory.filter(item => {
          switch (activeTab) {
            case 'quotation':
              return (item as QuotationHistory).customerName.toLowerCase().includes(searchLower) ||
                     (item as QuotationHistory).quotationNo.toLowerCase().includes(searchLower);
            case 'confirmation':
              const confirmationItem = item as QuotationHistory;
              return confirmationItem.customerName.toLowerCase().includes(searchLower) ||
                     confirmationItem.quotationNo.toLowerCase().includes(searchLower) ||
                     (confirmationItem.data?.contractNo && confirmationItem.data.contractNo.toLowerCase().includes(searchLower));
            case 'invoice':
              return (item as InvoiceHistory).customerName.toLowerCase().includes(searchLower) ||
                     (item as InvoiceHistory).invoiceNo.toLowerCase().includes(searchLower) ||
                     ((item as InvoiceHistory).data?.customerPO && (item as InvoiceHistory).data.customerPO.toLowerCase().includes(searchLower));
            case 'purchase':
              return (item as PurchaseHistory).supplierName.toLowerCase().includes(searchLower) ||
                     (item as PurchaseHistory).orderNo.toLowerCase().includes(searchLower);
            case 'packing':
              return (item as PackingHistory).consigneeName.toLowerCase().includes(searchLower) ||
                     (item as PackingHistory).invoiceNo.toLowerCase().includes(searchLower) ||
                     (item as PackingHistory).orderNo.toLowerCase().includes(searchLower);
            default:
              return true;
          }
        });
      }

      // 应用日期范围过滤
      if (filters.dateRange !== 'all') {
        const now = new Date();
        currentHistory = currentHistory.filter(item => {
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

      // 应用金额范围过滤 - 根据不同Tab使用不同的阈值
      if (filters.amountRange !== 'all') {
        currentHistory = currentHistory.filter(item => {
          const amount = item.totalAmount;
          switch (filters.amountRange) {
            case 'low': 
              // PackingHistoryTab使用不同的阈值
              if (activeTab === 'packing') {
                return amount < 1000;
              }
              return amount < 10000;
            case 'medium': 
              if (activeTab === 'packing') {
                return amount >= 1000 && amount < 10000;
              }
              return amount >= 10000 && amount < 100000;
            case 'high': 
              if (activeTab === 'packing') {
                return amount >= 10000;
              }
              return amount >= 100000;
            default: 
              return true;
          }
        });
      }

      setSelectedItems(new Set(currentHistory.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  // 处理导出
  const handleExport = () => {
    setShowExportModal(true);
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
      // 如果是从其他页面跳转过来的，跳过权限验证
      if (!isFromOtherPage) {
        // 检查用户是否有权限访问当前activeTab
        const availableTabs = getAvailableTabs();
        if (!availableTabs.some(tab => tab.id === activeTab)) {
          return;
        }
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
        setShowPreview(true);
      }
    } catch (error) {
      // 静默处理错误
    }
  };

  // 获取选项卡数量
  const getTabCount = useCallback((tabType: HistoryType) => {
    try {
      // 如果是从其他页面跳转过来的，跳过权限验证
      if (!isFromOtherPage) {
        // 检查用户是否有权限访问此tab
        const availableTabs = getAvailableTabs();
        if (!availableTabs.some(tab => tab.id === tabType)) {
          return 0;
        }
      }
      
      let results: HistoryItem[] = [];
      
      switch (tabType) {
        case 'quotation':
          // 报价单Tab只显示type为'quotation'的记录
          results = getQuotationHistory().filter(item => 
            'type' in item && (item as QuotationHistory).type === 'quotation'
          );
          break;
        case 'confirmation':
          // 确认书Tab只显示type为'confirmation'的记录
          results = getQuotationHistory().filter(item => 
            'type' in item && (item as QuotationHistory).type === 'confirmation'
          );
          break;
        case 'invoice':
          results = getInvoiceHistory();
          break;
        case 'purchase':
          results = getPurchaseHistory();
          break;
        case 'packing':
          results = getPackingHistory();
          break;
      }

      // 应用所有过滤条件
      results = results.filter(item => {
        // 搜索过滤 - 根据不同Tab使用不同的搜索逻辑
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          let matches = false;
          
          switch (tabType) {
            case 'quotation':
              matches = (item as QuotationHistory).customerName.toLowerCase().includes(searchLower) ||
                       (item as QuotationHistory).quotationNo.toLowerCase().includes(searchLower);
              break;
            case 'confirmation':
              const confirmationItem = item as QuotationHistory;
              matches = confirmationItem.customerName.toLowerCase().includes(searchLower) ||
                       confirmationItem.quotationNo.toLowerCase().includes(searchLower) ||
                       (confirmationItem.data?.contractNo && confirmationItem.data.contractNo.toLowerCase().includes(searchLower));
              break;
            case 'invoice':
              matches = (item as InvoiceHistory).customerName.toLowerCase().includes(searchLower) ||
                       (item as InvoiceHistory).invoiceNo.toLowerCase().includes(searchLower) ||
                       ((item as InvoiceHistory).data?.customerPO && (item as InvoiceHistory).data.customerPO.toLowerCase().includes(searchLower));
              break;
            case 'purchase':
              matches = (item as PurchaseHistory).supplierName.toLowerCase().includes(searchLower) ||
                       (item as PurchaseHistory).orderNo.toLowerCase().includes(searchLower);
              break;
            case 'packing':
              matches = (item as PackingHistory).consigneeName.toLowerCase().includes(searchLower) ||
                       (item as PackingHistory).invoiceNo.toLowerCase().includes(searchLower) ||
                       (item as PackingHistory).orderNo.toLowerCase().includes(searchLower);
              break;
          }
          
          if (!matches) {
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
          // 装箱单的文档类型过滤
          if (tabType === 'packing') {
            if (['proforma', 'packing', 'both'].includes(filters.type)) {
              if ((item as PackingHistory).documentType !== filters.type) {
                return false;
              }
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
        
        // 金额范围过滤 - 根据不同Tab使用不同的阈值
        if (filters.amountRange !== 'all') {
          const amount = item.totalAmount;
          switch (filters.amountRange) {
            case 'low': 
              // PackingHistoryTab使用不同的阈值
              if (tabType === 'packing') {
                if (amount >= 1000) return false;
              } else {
                if (amount >= 10000) return false;
              }
              break;
            case 'medium': 
              if (tabType === 'packing') {
                if (amount < 1000 || amount >= 10000) return false;
              } else {
                if (amount < 10000 || amount >= 100000) return false;
              }
              break;
            case 'high': 
              if (tabType === 'packing') {
                if (amount < 10000) return false;
              } else {
                if (amount < 100000) return false;
              }
              break;
          }
        }
        
        return true;
      });

      return results.length;
    } catch (error) {
      return 0;
    }
  }, [filters, getAvailableTabs, isFromOtherPage]);

  // 获取搜索结果的徽章样式
  const getSearchResultBadge = useCallback((tabType: HistoryType) => {
    // 如果是从其他页面跳转过来的，跳过权限验证
    if (!isFromOtherPage) {
      // 检查用户是否有权限访问此tab
      const availableTabs = getAvailableTabs();
      if (!availableTabs.some(tab => tab.id === tabType)) {
        return 'text-gray-400 border-gray-300 bg-gray-50 dark:text-gray-500 dark:border-gray-600 dark:bg-gray-800/50';
      }
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
  }, [filters, getAvailableTabs, isFromOtherPage]);

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
    if (deleteConfirmId === 'batch') {
      await handleBatchDelete();
    } else if (deleteConfirmId) {
      await handleDelete(deleteConfirmId);
    }
    setShowDeleteConfirm(false);
    setDeleteConfirmId(null);
  };

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showDeleteConfirm && !isDeleting) {
        if (event.key === 'Escape') {
          setShowDeleteConfirm(false);
          setDeleteConfirmId(null);
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
  }, [showDeleteConfirm, isDeleting, deleteConfirmId]);

  // 避免闪烁，在客户端渲染前或activeTab未设置时返回空内容
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-black">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-900 dark:text-white">加载中...</div>
        </div>
      </div>
    );
  }

  // 如果没有可用权限，显示提示信息
  if (getAvailableTabs().length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-black">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              暂无可用功能，请联系管理员分配权限
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-black">
      <div className="flex-1">
        {/* Header */}
        <div className="bg-white dark:bg-[#1c1c1e] shadow-sm dark:shadow-gray-800/30">
          <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-2">
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
                
                {/* 中屏和大屏时的高级过滤器 */}
                {showFilters && (
                  <div className="hidden md:flex items-center space-x-3">
                    {/* 日期范围过滤 */}
                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
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
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                    >
                      <option value="all">全部金额</option>
                      <option value="low">小于 10,000</option>
                      <option value="medium">10,000 - 100,000</option>
                      <option value="high">大于 100,000</option>
                    </select>
                    {/* 重置按钮 */}
                    <button
                      onClick={() => setFilters({ ...filters, dateRange: 'all', amountRange: 'all' })}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                    >重置</button>
                  </div>
                )}
                
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
                {selectedItems.size > 0 && (
                  <button
                    onClick={() => {
                      setDeleteConfirmId('batch');
                      setShowDeleteConfirm(true);
                    }}
                    className="px-3 py-2 flex items-center bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    title="批量删除"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="ml-1 bg-white bg-opacity-20 rounded px-1.5 py-0.5 text-xs font-bold">{selectedItems.size}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 高级过滤器 - 小屏时显示 */}
        {showFilters && (
          <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative z-10 -mt-2">
            <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-2">
              <div className="flex items-center justify-center space-x-2">
                {/* 日期范围过滤 */}
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="flex-1 max-w-[140px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[10px]"
                  style={{ fontSize: '10px' }}
                >
                  <option value="all" style={{ fontSize: '10px' }}>时间</option>
                  <option value="today" style={{ fontSize: '10px' }}>今天</option>
                  <option value="week" style={{ fontSize: '10px' }}>7天</option>
                  <option value="month" style={{ fontSize: '10px' }}>30天</option>
                  <option value="year" style={{ fontSize: '10px' }}>一年</option>
                </select>
                {/* 金额范围过滤 */}
                <select
                  value={filters.amountRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, amountRange: e.target.value as any }))}
                  className="flex-1 max-w-[140px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[10px]"
                  style={{ fontSize: '10px' }}
                >
                  <option value="all" style={{ fontSize: '10px' }}>金额</option>
                  <option value="low" style={{ fontSize: '10px' }}>&lt;10K</option>
                  <option value="medium" style={{ fontSize: '10px' }}>10K-100K</option>
                  <option value="high" style={{ fontSize: '10px' }}>&gt;100K</option>
                </select>
                {/* 重置按钮 */}
                <button
                  onClick={() => setFilters({ ...filters, dateRange: 'all', amountRange: 'all' })}
                  className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-[10px] whitespace-nowrap"
                >重置</button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-[#1c1c1e] border-b border-gray-200 dark:border-gray-800">
          <div className="w-full max-w-none px-2 sm:px-4 lg:px-6">
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
          <div className="w-full max-w-none">
            {/* Tab Content - 按照新的顺序：报价单、合同确认、装箱单、发票、采购单 */}
            <div className="bg-white dark:bg-[#1c1c1e] rounded-lg">
              {activeTab === 'quotation' && (
                <QuotationHistoryTab 
                  filters={filters} 
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onEdit={handleEdit}
                  onCopy={handleCopy}
                  onDelete={(id) => {
                    setDeleteConfirmId(id);
                    setShowDeleteConfirm(true);
                  }}
                  onPreview={handlePreview}
                  selectedIds={selectedItems}
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
                  onDelete={(id) => {
                    setDeleteConfirmId(id);
                    setShowDeleteConfirm(true);
                  }}
                  onPreview={handlePreview}
                  onConvert={handleConvert}
                  selectedIds={selectedItems}
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
                  onDelete={(id) => {
                    setDeleteConfirmId(id);
                    setShowDeleteConfirm(true);
                  }}
                  onPreview={handlePreview}
                  selectedIds={selectedItems}
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
                  onDelete={(id) => {
                    setDeleteConfirmId(id);
                    setShowDeleteConfirm(true);
                  }}
                  onPreview={handlePreview}
                  selectedIds={selectedItems}
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
                  onDelete={(id) => {
                    setDeleteConfirmId(id);
                    setShowDeleteConfirm(true);
                  }}
                  onPreview={handlePreview}
                  selectedIds={selectedItems}
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
              setShowDeleteConfirm(false);
              setDeleteConfirmId(null);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100 animate-in fade-in-0 zoom-in-95 relative">
            {/* 关闭按钮 */}
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmId(null);
              }}
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
                  {deleteConfirmId === 'batch' ? '批量删除操作' : '单条记录删除'}
                </p>
              </div>
            </div>

            {/* 内容 */}
            <div className="p-6 pt-4">
              <div className="mb-6">
                {deleteConfirmId === 'batch' ? (
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 dark:text-orange-300 text-sm font-bold">
                          {selectedItems.size}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          即将删除 {selectedItems.size} 条记录
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
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmId(null);
                  }}
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
                      : (deleteConfirmId === 'batch' ? `删除 ${selectedItems.size} 条` : '确认删除')
                    }
                  </span>
                </button>
              </div>
              

            </div>
          </div>
        </div>
      )}

      {/* 导入导出弹窗 */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        activeTab={activeTab}
        filteredData={[]} // 暂时使用空数组，后续可以根据需要获取当前tab的数据
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
        onClose={() => setShowPreview(false)}
        item={previewItem}
        itemType={activeTab}
      />

      <Footer />
    </div>
  );
} 