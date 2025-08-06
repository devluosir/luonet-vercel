'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, getSession, signOut } from 'next-auth/react';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { 
  Mail, 
  FileText, 
  Receipt, 
  Calendar, 
  ShoppingCart, 
  Settings, 
  BarChart3, 
  Users, 
  Database, 
  Zap,
  Clock,
  TrendingUp,
  Archive,
  Plus,
  History,
  User,
  LogOut,
  RefreshCw,
  Bell,
  Search,
  Filter,
  Package,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { performanceMonitor, optimizePerformance, safeRequestIdleCallback } from '@/utils/performance';
import { usePermissionStore } from '@/lib/permissions';
import { usePermissionInit } from '@/hooks/usePermissionInit';
import { Header } from '@/components/Header';
import { preloadManager } from '@/utils/preloadUtils';

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

// 快速创建单据的模块
const QUICK_CREATE_MODULES = [
  { 
    id: 'quotation', 
    name: '新报价单', 
    path: '/quotation',
    icon: FileText,
    bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-900/20 dark:to-blue-800/30 dark:hover:from-blue-800/30 dark:hover:to-blue-700/40',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    textColor: 'text-blue-700 dark:text-blue-300',
    shortcut: 'Q'
  },
  { 
    id: 'confirmation', 
    name: '销售确认', 
    path: '/quotation',
    icon: FileText,
    bgColor: 'bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 dark:from-green-900/20 dark:to-green-800/30 dark:hover:from-green-800/30 dark:hover:to-green-700/40',
    iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
    textColor: 'text-green-700 dark:text-green-300',
    shortcut: 'C'
  },
  { 
    id: 'packing', 
    name: '箱单发票', 
    path: '/packing',
    icon: Package,
    bgColor: 'bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 dark:from-teal-900/20 dark:to-teal-800/30 dark:hover:from-teal-800/30 dark:hover:to-teal-700/40',
    iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600',
    textColor: 'text-teal-700 dark:text-teal-300',
    shortcut: 'B'
  },
  { 
    id: 'invoice', 
    name: '财务发票', 
    path: '/invoice',
    icon: Receipt,
    bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 dark:from-purple-900/20 dark:to-purple-800/30 dark:hover:from-purple-800/30 dark:hover:to-purple-700/40',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    textColor: 'text-purple-700 dark:text-purple-300',
    shortcut: 'I'
  },
  { 
    id: 'purchase', 
    name: '采购订单', 
    path: '/purchase',
    icon: ShoppingCart,
    bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 dark:from-orange-900/20 dark:to-orange-800/30 dark:hover:from-orange-800/30 dark:hover:to-orange-700/40',
    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    textColor: 'text-orange-700 dark:text-orange-300',
    shortcut: 'P'
  }
];

// 工具模块
const TOOL_MODULES = [
  { 
    id: 'ai-email', 
    name: 'AI邮件助手', 
    path: '/mail',
    icon: Mail,
    bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 dark:from-indigo-900/20 dark:to-indigo-800/30 dark:hover:from-indigo-800/30 dark:hover:to-indigo-700/40',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    textColor: 'text-indigo-700 dark:text-indigo-300'
  },

];

// Tools功能模块
const TOOLS_MODULES = [
  { 
    id: 'history', 
    name: '单据管理', 
    path: '/history',
    icon: Archive,
    bgColor: 'bg-gradient-to-br from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 dark:from-pink-900/20 dark:to-pink-800/30 dark:hover:from-pink-800/30 dark:hover:to-pink-700/40',
    iconBg: 'bg-gradient-to-br from-pink-500 to-pink-600',
    textColor: 'text-pink-700 dark:text-pink-300'
  },
  { 
    id: 'customer', 
    name: '客户管理', 
    path: '/customer',
    icon: Users,
    bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100 hover:from-violet-100 hover:to-violet-200 dark:from-violet-900/20 dark:to-violet-800/30 dark:hover:from-violet-800/30 dark:hover:to-violet-700/40',
    iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
    textColor: 'text-violet-700 dark:text-violet-300'
  }
];

// 获取各类单据数量 - 使用已有的历史记录函数（不应用过滤条件）
const getQuotationCount = () => {
  try {
    const { getQuotationHistory } = require('@/utils/quotationHistory');
    // 只获取type为'quotation'的记录
    return getQuotationHistory().filter((item: any) => 
      'type' in item && item.type === 'quotation'
    ).length;
  } catch (error) {
    return 0;
  }
};

const getConfirmationCount = () => {
  try {
    const { getQuotationHistory } = require('@/utils/quotationHistory');
    // 只获取type为'confirmation'的记录
    return getQuotationHistory().filter((item: any) => 
      'type' in item && item.type === 'confirmation'
    ).length;
  } catch (error) {
    return 0;
  }
};

const getInvoiceCount = () => {
  try {
    const { getInvoiceHistory } = require('@/utils/invoiceHistory');
    return getInvoiceHistory().length;
  } catch (error) {
    return 0;
  }
};

const getPackingCount = () => {
  try {
    const { getPackingHistory } = require('@/utils/packingHistory');
    return getPackingHistory().length;
  } catch (error) {
    return 0;
  }
};

const getPurchaseCount = () => {
  try {
    const { getPurchaseHistory } = require('@/utils/purchaseHistory');
    return getPurchaseHistory().length;
  } catch (error) {
    return 0;
  }
};

// 统一的模块按钮组件
const ModuleButton = ({ module, onClick, onHover, quotationCount, confirmationCount, invoiceCount, packingCount, purchaseCount }: { 
  module: any; 
  onClick: (module: any) => void; 
  onHover?: (module: any) => void;
  quotationCount?: number;
  confirmationCount?: number;
  invoiceCount?: number;
  packingCount?: number;
  purchaseCount?: number;
}) => {
  const Icon = module.icon;
  
  // 优先使用模块对象的颜色字段
  const bgColor = module.bgColor || 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 dark:from-gray-800/50 dark:to-gray-700/40 dark:hover:from-gray-700/40 dark:hover:to-gray-600/50';
  const iconBg = module.iconBg || 'bg-gradient-to-br from-gray-500 to-gray-600';
  const titleColor = module.titleColor || module.textColor || 'text-gray-800 dark:text-gray-200';
  const shortcutBg = module.shortcutBg || iconBg;
  
  return (
    <button
      key={module.id}
      className={`group relative shadow-lg hover:shadow-xl 
        rounded-xl overflow-hidden transition-all duration-300 ease-in-out
        hover:-translate-y-1 active:translate-y-0 cursor-pointer
        border border-gray-200/50 dark:border-gray-800/50
        hover:border-gray-300/70 dark:hover:border-gray-700/70
        active:shadow-md
        p-4 h-20 flex items-center space-x-3 w-full
        backdrop-blur-sm ${bgColor}`}
      onClick={() => onClick(module)}
      onMouseEnter={() => onHover?.(module)}
    >
      {/* 图标容器 - 增强彩色效果 */}
      <div className={`p-2.5 rounded-xl ${iconBg} flex-shrink-0 shadow-xl group-hover:shadow-2xl 
        transition-all duration-300 group-hover:scale-110
        relative overflow-hidden`}>
        {/* 图标背景渐变效果 */}
        <div className={`absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent 
          group-hover:from-white/40 group-hover:via-white/20 transition-all duration-300`}></div>
        {/* 图标本身 */}
        <Icon className="w-5 h-5 text-white relative z-10 transition-all duration-300 
          group-hover:scale-110 group-hover:drop-shadow-lg" />
        {/* 图标光晕效果 */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent 
          opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      
      {/* 文本内容 */}
      <div className="flex-1 min-w-0 text-left">
        <h3 className={`text-base font-bold ${titleColor} leading-tight line-clamp-1
          transition-all duration-200 group-hover:scale-105 transform group-hover:drop-shadow-sm`}>
          {module.name}
        </h3>
      </div>
      
      {/* 各模块的数量徽章 */}
      {(() => {
        let count = 0;
        let showBadge = false;
        
        // 根据模块ID获取对应的数量
        switch (module.id) {
          case 'quotation':
            count = quotationCount || 0;
            showBadge = count > 0;
            break;
          case 'confirmation':
            count = confirmationCount || 0;
            showBadge = count > 0;
            break;
          case 'invoice':
            count = invoiceCount || 0;
            showBadge = count > 0;
            break;
          case 'packing':
            count = packingCount || 0;
            showBadge = count > 0;
            break;
          case 'purchase':
            count = purchaseCount || 0;
            showBadge = count > 0;
            break;
          default:
            // 其他模块显示快捷键
            if (module.shortcut) {
              return (
                <div className={`absolute top-2 right-2 w-6 h-6 ${shortcutBg} rounded-lg text-white 
                  flex items-center justify-center text-xs font-bold shadow-lg
                  group-hover:scale-110 group-hover:shadow-xl transition-all duration-300
                  group-hover:rotate-6 group-hover:animate-pulse`}>
                  {module.shortcut}
                </div>
              );
            }
            return null;
        }
        
        // 显示数量徽章
        return showBadge ? (
          <div className={`absolute top-2 right-2 min-w-[20px] h-5 px-1.5 ${iconBg} rounded-full text-white 
            flex items-center justify-center text-xs font-bold shadow-lg
            group-hover:scale-110 group-hover:shadow-xl transition-all duration-300
            group-hover:rotate-6 group-hover:animate-pulse`}>
            {count > 9999 ? '9999+' : count}
          </div>
        ) : null;
      })()}
      
      {/* 悬停时的光晕效果 */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent 
        opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      {/* 边框光晕效果 */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent 
        group-hover:border-white/20 transition-all duration-300 pointer-events-none"></div>
    </button>
  );
};

// 移除DynamicHeader的dynamic导入
// const DynamicHeader = dynamic(() => import('@/components/Header').then(mod => mod.Header), {
//   ssr: true,
//   loading: () => (
//     <div className="bg-white dark:bg-[#1c1c1e] shadow-sm dark:shadow-gray-800/30">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
//         <div className="flex items-center space-x-4">
//           <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
//           <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
//         </div>
//         <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
//       </div>
//     </div>
//   )
// });

// 权限管理已移至 @/lib/permissions

export default function DashboardPage() {
  // 所有 hooks 统一声明
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<'today' | '3days' | 'week' | 'month'>('today');
  const [typeFilter, setTypeFilter] = useState<'all' | 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase'>('all');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [quotationCount, setQuotationCount] = useState(0);
  const [confirmationCount, setConfirmationCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [packingCount, setPackingCount] = useState(0);
  const [purchaseCount, setPurchaseCount] = useState(0);
  
  // ✅ 使用优化的权限初始化Hook
  usePermissionInit();
  
  // 使用全局权限store
  const { user, isLoading: permissionLoading } = usePermissionStore();
  
  // 更新各类单据数量
  const updateDocumentCounts = useCallback(() => {
    const quotation = getQuotationCount();
    const confirmation = getConfirmationCount();
    const invoice = getInvoiceCount();
    const packing = getPackingCount();
    const purchase = getPurchaseCount();
    
    setQuotationCount(quotation);
    setConfirmationCount(confirmation);
    setInvoiceCount(invoice);
    setPackingCount(packing);
    setPurchaseCount(purchase);
  }, []);
  
  // 初始化单据数量
  useEffect(() => {
    if (mounted) {
      updateDocumentCounts();
    }
  }, [mounted, updateDocumentCounts]);
  
  const [isLoading, setIsLoading] = useState(false);
  const refreshing = isLoading;

  // ✅ 优化的权限映射 - 优先使用Store中的用户信息
  const permissionMap = useMemo(() => {
    // 优先级1: 全局权限store（最新）
    let permissions = user?.permissions || [];
    
    // 优先级2: Session权限数据（备用）
    if (permissions.length === 0) {
      permissions = session?.user?.permissions || [];
    }
    
    // 优先级3: 本地缓存权限（快速）
    if (permissions.length === 0 && typeof window !== 'undefined') {
      try {
        const userCache = localStorage.getItem('userCache');
        if (userCache) {
          const cacheData = JSON.parse(userCache);
          const isRecent = cacheData.timestamp && (Date.now() - cacheData.timestamp) < 24 * 60 * 60 * 1000;
          
          if (isRecent) {
            permissions = cacheData.permissions || [];
          }
        }
      } catch (error) {
        console.error('恢复权限数据失败:', error);
      }
    }
    
    // 添加调试日志，帮助排查权限刷新问题
    console.log('权限映射更新:', {
      storePermissions: user?.permissions?.length || 0,
      sessionPermissions: session?.user?.permissions?.length || 0,
      finalPermissions: permissions.length,
      refreshKey,
      userExists: !!user,
      sessionExists: !!session?.user
    });

    // 如果没有权限数据，不显示任何模块（等待权限加载完成）
    if (!permissions || permissions.length === 0) {
      return {
        permissions: {
          quotation: false,
          packing: false,
          invoice: false,
          purchase: false,
          history: false,
          customer: false,
          'ai-email': false
        },
        documentTypePermissions: {
          quotation: false,
          confirmation: false,
          packing: false,
          invoice: false,
          purchase: false
        },
        accessibleDocumentTypes: []
      };
    }

    // 根据权限数据构建权限映射
    const permissionMap = {
      quotation: false,
      packing: false,
      invoice: false,
      purchase: false,
      history: false,
      customer: false,
      'ai-email': false
    };

    const documentTypePermissions = {
      quotation: false,
      confirmation: false,
      packing: false,
      invoice: false,
      purchase: false
    };

    // 遍历权限数据，设置对应的权限
    permissions.forEach((perm: any) => {
      if (perm.canAccess) {
        switch (perm.moduleId) {
          case 'quotation':
            permissionMap.quotation = true;
            documentTypePermissions.quotation = true;
            documentTypePermissions.confirmation = true; // 销售确认也属于报价模块
            break;
          case 'packing':
            permissionMap.packing = true;
            documentTypePermissions.packing = true;
            break;
          case 'invoice':
            permissionMap.invoice = true;
            documentTypePermissions.invoice = true;
            break;
          case 'purchase':
            permissionMap.purchase = true;
            documentTypePermissions.purchase = true;
            break;
          case 'history':
            permissionMap.history = true;
            break;
          case 'customer':
            permissionMap.customer = true;
            break;
          case 'ai-email':
            permissionMap['ai-email'] = true;
            break;
          default:
            break;
        }
      }
    });

    // 构建可访问的文档类型列表
    const accessibleDocumentTypes = Object.entries(documentTypePermissions)
      .filter(([_, hasAccess]) => hasAccess)
      .map(([type, _]) => type);

    return {
      permissions: permissionMap,
      documentTypePermissions,
      accessibleDocumentTypes
    };
  }, [user?.permissions, user?.isAdmin, session?.user?.permissions, session?.user?.isAdmin, refreshKey]);

  // ✅ 优化的初始化逻辑 - 立即显示内容，异步加载权限
  useEffect(() => {
    setMounted(true);
    
    // 延迟预加载，避免阻塞初始渲染
    setTimeout(() => {
      if (!preloadManager.isPreloaded()) {
        preloadManager.preloadAllResources().catch(error => {
          console.error('自动预加载失败:', error);
        });
      }
    }, 1000);
  }, []); // 移除session和status依赖，实现真正的本地化

  // 加载指定时间范围内的文档函数
  const loadDocuments = useCallback(async (filter: 'today' | '3days' | 'week' | 'month' = 'today', typeFilter: 'all' | 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase' = 'all') => {
    try {
      // 使用动态权限映射
      const allDocuments = [];
      
      // 只加载用户有权限的文档类型
      if (permissionMap.documentTypePermissions.quotation && typeof window !== 'undefined') {
        const quotationHistory = JSON.parse(localStorage.getItem('quotation_history') || '[]');
        allDocuments.push(...quotationHistory.map((doc: any) => ({ ...doc, type: doc.type || 'quotation' })));
      }
      
      if (permissionMap.documentTypePermissions.packing && typeof window !== 'undefined') {
        const packingHistory = JSON.parse(localStorage.getItem('packing_history') || '[]');
        allDocuments.push(...packingHistory.map((doc: any) => ({ ...doc, type: 'packing' })));
      }
      
      if (permissionMap.documentTypePermissions.invoice && typeof window !== 'undefined') {
        const invoiceHistory = JSON.parse(localStorage.getItem('invoice_history') || '[]');
        allDocuments.push(...invoiceHistory.map((doc: any) => ({ ...doc, type: 'invoice' })));
      }
      
      if (permissionMap.documentTypePermissions.purchase && typeof window !== 'undefined') {
        const purchaseHistory = JSON.parse(localStorage.getItem('purchase_history') || '[]');
        allDocuments.push(...purchaseHistory.map((doc: any) => ({ ...doc, type: 'purchase' })));
      }

      // 获取当前日期
      const now = new Date();
      const startDate = new Date();

      // 根据筛选条件设置开始日期
      switch (filter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '3days':
          startDate.setDate(startDate.getDate() - 3);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // 筛选指定时间范围内的文档
      let filteredDocuments = allDocuments.filter((doc: any) => {
        // 优先使用date字段，如果没有则使用updatedAt或createdAt
        const docDate = new Date(doc.date || doc.updatedAt || doc.createdAt);
        return docDate >= startDate && docDate <= now;
      });

      // 根据类型筛选
      if (typeFilter !== 'all') {
        filteredDocuments = filteredDocuments.filter((doc: any) => {
          return doc.type === typeFilter;
        });
      }

      // 按日期排序（最新的在前）
      const sorted = filteredDocuments
        .sort((a, b) => {
          const dateA = new Date(a.date || a.updatedAt || a.createdAt);
          const dateB = new Date(b.date || b.updatedAt || b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });

      setRecentDocuments(sorted);
    } catch (error) {
      console.error('加载文档失败:', error);
    }
  }, [permissionMap.documentTypePermissions]);

  // 加载指定时间范围内的文档
  useEffect(() => {
    if (mounted) {
      loadDocuments(timeFilter, typeFilter);
    }
  }, [mounted, loadDocuments, timeFilter, typeFilter]);

  // 监听localStorage变化，实时更新单据记录
  useEffect(() => {
    if (!mounted) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.includes('_history') || e.key.includes('History'))) {
        loadDocuments(timeFilter, typeFilter);
        updateDocumentCounts(); // 更新单据数量
      }
    };

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail && (e.detail.key.includes('_history') || e.detail.key.includes('History'))) {
        loadDocuments(timeFilter, typeFilter);
        updateDocumentCounts(); // 更新单据数量
      }
    };

    // 监听storage事件（跨标签页）
    window.addEventListener('storage', handleStorageChange);

    // 创建自定义事件监听器（同标签页内）
    window.addEventListener('customStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [mounted, loadDocuments, timeFilter, typeFilter]);

  // 监听权限变化事件，自动刷新页面
  useEffect(() => {
    if (!mounted) return;

    const handlePermissionChange = (e: CustomEvent) => {
      // 检查是否已经显示刷新消息，避免重复刷新
      if (showSuccessMessage) {
        return;
      }

      // 显示权限变化提示
      setSuccessMessage(e.detail?.message || '权限信息已更新');
      setShowSuccessMessage(true);
      
      // 强制重新渲染而不是刷新页面
      setRefreshKey(prev => prev + 1);
      
      setTimeout(() => setShowSuccessMessage(false), 3000);
    };

    window.addEventListener('permissionChanged', handlePermissionChange as EventListener);

    return () => {
      window.removeEventListener('permissionChanged', handlePermissionChange as EventListener);
    };
  }, [mounted, showSuccessMessage]);
  
  // 监听权限Store变化，确保UI及时更新
  useEffect(() => {
    const unsubscribe = usePermissionStore.subscribe((state) => {
      if (state.user && state.user.permissions) {
        console.log('权限Store更新，触发重新渲染');
        setRefreshKey(prev => prev + 1);
      }
    });
    
    return unsubscribe;
  }, []);

  // 优化的模块点击处理 - 即点即开
  const handleModuleClick = useCallback((module: any) => {
    // 特殊处理销售确认
    if (module.id === 'confirmation') {
      if (typeof window !== 'undefined') {
        (window as any).__QUOTATION_TYPE__ = 'confirmation';
      }
    }
    
    // 立即导航，不等待任何异步操作
    router.push(module.path);
  }, [router]);

  // 智能预加载 - 用户悬停时预加载
  const handleModuleHover = useCallback((module: any) => {
    // 预加载模块页面
    router.prefetch(module.path);
  }, [router]);

  // 模块点击处理 - 添加加载状态
  const handleModuleClickWithLoading = useCallback((module: any) => {
    // 特殊处理销售确认
    if (module.id === 'confirmation') {
      if (typeof window !== 'undefined') {
        (window as any).__QUOTATION_TYPE__ = 'confirmation';
      }
    }
    
    // 预加载目标页面，减少loading时间
    if (typeof window !== 'undefined') {
      // 预加载页面组件
      router.prefetch(module.path);
    }
    
    // 立即导航
    router.push(module.path);
  }, [router]);

  // 动态模块过滤，根据权限显示模块
  const availableQuickCreateModules = useMemo(() => {
    const filtered = QUICK_CREATE_MODULES.filter(module => {
      switch (module.id) {
        case 'quotation':
        case 'confirmation':
          return permissionMap.permissions.quotation;
        case 'packing':
          return permissionMap.permissions.packing;
        case 'invoice':
          return permissionMap.permissions.invoice;
        case 'purchase':
          return permissionMap.permissions.purchase;
        default:
          return true;
      }
    });
    
    return filtered;
  }, [permissionMap.permissions]);

  const availableToolModules = useMemo(() => {
    const filtered = TOOL_MODULES.filter(module => {
      switch (module.id) {
        case 'ai-email':
          return permissionMap.permissions['ai-email'];
        default:
          return true;
      }
    });
    
    return filtered;
  }, [permissionMap.permissions]);

  const availableToolsModules = useMemo(() => {
    const filtered = TOOLS_MODULES.filter(module => {
      switch (module.id) {
        case 'history':
          return permissionMap.permissions.history;
        case 'customer':
          return permissionMap.permissions.customer;
        default:
          return true;
      }
    });
    
    return filtered;
  }, [permissionMap.permissions]);

  // 根据权限过滤可用的文档类型筛选器
  const availableTypeFilters = useMemo(() => {
    const filters = [];
    
    // 添加ALL按钮
    filters.push({ type: 'all', label: 'ALL', color: 'gray' });
    
    // 使用动态权限映射
    if (permissionMap.documentTypePermissions.quotation) {
      filters.push({ type: 'quotation', label: 'QTN', color: 'blue' });
    }
    if (permissionMap.documentTypePermissions.confirmation) {
      filters.push({ type: 'confirmation', label: 'SC', color: 'green' });
    }
    if (permissionMap.documentTypePermissions.packing) {
      filters.push({ type: 'packing', label: 'PL', color: 'teal' });
    }
    if (permissionMap.documentTypePermissions.invoice) {
      filters.push({ type: 'invoice', label: 'INV', color: 'purple' });
    }
    if (permissionMap.documentTypePermissions.purchase) {
      filters.push({ type: 'purchase', label: 'PO', color: 'orange' });
    }
    
    return filters;
  }, [permissionMap.documentTypePermissions]);

  // 根据权限过滤可见的类型筛选器 - 显示所有筛选按钮
  const visibleTypeFilters = useMemo(() => {
    return availableTypeFilters;
  }, [availableTypeFilters]);

  // 检查当前选择的筛选器是否有效，如果无效则重置为第一个可用选项
  useEffect(() => {
    if (visibleTypeFilters.length > 0) {
      const currentFilterExists = visibleTypeFilters.some(filter => filter.type === typeFilter);
      if (!currentFilterExists) {
        setTypeFilter(visibleTypeFilters[0].type as any);
      }
    }
  }, [visibleTypeFilters]); // 移除 typeFilter 依赖，避免无限循环

  // 权限刷新处理函数 - 优化版本
  const handleRefreshPermissions = useCallback(async () => {
    setIsLoading(true);
    setSuccessMessage('');
    
    try {
      console.log('开始刷新权限...');
      
      // 使用权限Store的刷新方法
      await usePermissionStore.getState().fetchPermissions(true);
      
      // 获取最新的用户信息
      const updatedUser = usePermissionStore.getState().user;
      console.log('权限刷新完成，最新权限:', updatedUser?.permissions);
      
      // ✅ 强制更新Store状态，确保UI重新渲染
      if (updatedUser) {
        usePermissionStore.getState().setUser(updatedUser);
        console.log('强制更新Store用户状态:', updatedUser);
      }
      
      // ✅ 确保权限数据立即保存到本地存储
      if (updatedUser && typeof window !== 'undefined') {
        try {
          const cacheData = {
            ...updatedUser,
            timestamp: Date.now()
          };
          localStorage.setItem('userCache', JSON.stringify(cacheData));
          console.log('权限数据已立即保存到本地存储:', cacheData);
        } catch (error) {
          console.error('保存权限数据到本地存储失败:', error);
        }
      }
      
      // 触发权限变化事件，通知其他组件
      window.dispatchEvent(new CustomEvent('permissionChanged', {
        detail: {
          message: '权限信息已更新',
          permissions: updatedUser?.permissions
        }
      }));
      
      // 强制重新渲染页面
      setRefreshKey(prev => prev + 1);
      setSuccessMessage('权限信息已更新');
      setTimeout(() => setShowSuccessMessage(false), 2000);
    } catch (error) {
      console.error('刷新权限失败:', error);
      setSuccessMessage('权限刷新失败，请重试');
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 优化的退出逻辑 - 避免重复退出
  const handleLogout = useCallback(async () => {
    // 清除权限store和当前用户的相关缓存
    usePermissionStore.getState().clearUser();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userCache');
    }
    
    // 只调用一次signOut，避免重复退出
    await signOut();
  }, []);

  // 使用 useEffect 处理重定向，避免在渲染过程中调用 router.push
  useEffect(() => {
    // 只有在mounted后且session状态为unauthenticated时才重定向
    if (mounted && status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router, mounted]);

  // 权限加载状态检查
  const isPermissionLoading = !user && status === 'loading';
  
  // 所有 hooks 声明完毕后，再做提前 return
  if (!mounted) return null;
  
  // 如果未认证，返回空内容而不是直接重定向
  if (status === 'unauthenticated') return null;
  
  // 如果权限正在加载，显示加载状态
  if (isPermissionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">加载权限信息中...</div>
        </div>
      </div>
    );
  }

  const getDocumentTypeName = (type: string) => {
    switch (type) {
      case 'quotation': return 'QTN';
      case 'confirmation': return 'SC';
      case 'invoice': return 'INV';
      case 'purchase': return 'PO';
      case 'packing': return 'PL';
      default: return 'DOC';
    }
  };

  const getDocumentNumber = (doc: any) => {
    switch (doc.type) {
      case 'quotation': return doc.quotationNo;
      case 'confirmation': return doc.data?.contractNo || doc.quotationNo; // 销售确认显示合同号
      case 'invoice': return doc.invoiceNo;
      case 'purchase': return doc.orderNo;
      case 'packing': return doc.invoiceNo;
      default: return doc.id;
    }
  };

  const getColorClasses = (docType: string) => {
    switch (docType) {
      case 'quotation':
        return 'group-hover:text-blue-600 dark:group-hover:text-blue-400';
      case 'confirmation':
        return 'group-hover:text-green-600 dark:group-hover:text-green-400';
      case 'packing':
        return 'group-hover:text-teal-600 dark:group-hover:text-teal-400';
      case 'invoice':
        return 'group-hover:text-purple-600 dark:group-hover:text-purple-400';
      case 'purchase':
        return 'group-hover:text-orange-600 dark:group-hover:text-orange-400';
      default:
        return 'group-hover:text-gray-600 dark:group-hover:text-gray-400';
    }
  };

  const getDocumentName = (doc: any) => {
    let name = '';
    if (doc.type === 'purchase') {
      name = doc.supplierName || '未命名供应商';
    } else if (doc.type === 'packing') {
      name = doc.consigneeName || '未命名收货人';
    } else {
      name = doc.customerName || '未命名客户';
    }
    // 只取第一行
    return name.split('\n')[0]?.trim() || name;
  };

  const getEmptyStateText = () => {
    const timeText = {
      'today': '今天',
      '3days': '最近三天',
      'week': '最近一周',
      'month': '最近一个月'
    }[timeFilter];
    
    const typeText = {
      'all': '所有类型',
      'quotation': '报价单',
      'confirmation': '销售确认',
      'packing': '装箱单',
      'invoice': '财务发票',
      'purchase': '采购订单'
    }[typeFilter];
    
    return `${timeText}还没有创建或修改的${typeText}`;
  };

  // 页面正常 return
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-black">
      <div className="flex-1">
        <Header 
          user={{
            name: user?.username || session?.user?.username || session?.user?.name || '用户',
            isAdmin: user?.isAdmin ?? session?.user?.isAdmin ?? false
          }}
          onLogout={handleLogout}
          onProfile={() => setShowProfileModal(true)}
          onRefreshPermissions={handleRefreshPermissions}
          isRefreshing={refreshing}
          title="Dashboard"
          showWelcome={true}
        />

        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={{
            username: user?.username || session?.user?.username || session?.user?.name || '',
            email: user?.email || session?.user?.email || null,
            permissions: user?.permissions || session?.user?.permissions || []
          }}
        />

        <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 xl:px-8 2xl:px-12 py-6">
          {/* 成功消息 */}
          {showSuccessMessage && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                  {successMessage}
                </span>
              </div>
            </div>
          )}

          {/* 功能按钮区域 */}
          {(availableQuickCreateModules.length > 0 || availableToolModules.length > 0 || availableToolsModules.length > 0) && (
            <div className="mb-8">
              <div className="dashboard-grid gap-3">
                {/* 新建单据按钮 */}
                {availableQuickCreateModules.map((module) => (
                  <ModuleButton 
                    key={module.id}
                    module={module}
                    onClick={handleModuleClickWithLoading}
                    onHover={handleModuleHover}
                    quotationCount={quotationCount}
                    confirmationCount={confirmationCount}
                    invoiceCount={invoiceCount}
                    packingCount={packingCount}
                    purchaseCount={purchaseCount}
                  />
                ))}
                
                {/* 管理中心按钮 */}
                {availableToolsModules.slice(0, 4).map((module) => (
                  <ModuleButton 
                    key={module.id}
                    module={module}
                    onClick={handleModuleClickWithLoading}
                    onHover={handleModuleHover}
                    quotationCount={quotationCount}
                    confirmationCount={confirmationCount}
                    invoiceCount={invoiceCount}
                    packingCount={packingCount}
                    purchaseCount={purchaseCount}
                  />
                ))}
                
                {/* 实用工具按钮 */}
                {availableToolModules.map((module) => (
                  <ModuleButton 
                    key={module.id}
                    module={module}
                    onClick={handleModuleClickWithLoading}
                    onHover={handleModuleHover}
                    quotationCount={quotationCount}
                    confirmationCount={confirmationCount}
                    invoiceCount={invoiceCount}
                    packingCount={packingCount}
                    purchaseCount={purchaseCount}
                  />
                ))}
                
                {/* 更多功能按钮 */}
                {availableToolsModules.length > 4 && (
                  <ModuleButton 
                    key="more-tools"
                    module={{
                      id: 'more-tools',
                      name: '更多功能',
                      path: '/tools',
                      icon: Settings,
                      bgColor: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/50 dark:hover:bg-gray-700/60',
                      iconBg: 'bg-gray-500',
                      textColor: 'text-gray-700 dark:text-gray-300'
                    }}
                    onClick={handleModuleClickWithLoading}
                    onHover={handleModuleHover}
                    quotationCount={quotationCount}
                    confirmationCount={confirmationCount}
                    invoiceCount={invoiceCount}
                    packingCount={packingCount}
                    purchaseCount={purchaseCount}
                  />
                )}
              </div>
            </div>
          )}

          {/* 今天创建或修改的单据 - 根据权限动态显示 */}
          {visibleTypeFilters.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-center sm:justify-end mb-4">
                <div className="flex items-center space-x-0.5 sm:space-x-2">
                  {/* 单据类型筛选器 - 根据权限动态显示 */}
                  {visibleTypeFilters.length > 0 && (
                    <div className="flex items-center space-x-0.5 bg-white dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
                      {visibleTypeFilters.map((filter) => {
                        const getColorClasses = (color: string, isActive: boolean) => {
                          const colorMap = {
                            blue: isActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                            green: isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                            teal: isActive ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                            purple: isActive ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                            orange: isActive ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                            gray: isActive ? 'bg-gray-100 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          };
                          return colorMap[color as keyof typeof colorMap] || colorMap.gray;
                        };

                        return (
                          <button
                            key={filter.type}
                            onClick={() => {
                              if (filter.type === 'all') {
                                // ALL按钮特殊处理：切换显示状态
                                setShowAllFilters(!showAllFilters);
                                // 如果当前不是ALL状态，切换到ALL
                                if (typeFilter !== 'all') {
                                  setTypeFilter('all');
                                }
                              } else {
                                setTypeFilter(filter.type as any);
                              }
                            }}
                            className={`px-1.5 sm:px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                              active:scale-95 ${getColorClasses(filter.color, typeFilter === filter.type)}
                              ${filter.type === 'all' && !showAllFilters ? 'font-bold' : ''}`}
                          >
                            {filter.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* 时间筛选器 - 根据权限动态显示 */}
                  {visibleTypeFilters.length > 0 && (
                    <div className="flex items-center space-x-0.5 bg-white dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
                      <button
                        onClick={() => setTimeFilter('today')}
                        className={`px-1.5 sm:px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                          active:scale-95 ${
                          timeFilter === 'today'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        1D
                      </button>
                      <button
                        onClick={() => setTimeFilter('3days')}
                        className={`px-1.5 sm:px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                          active:scale-95 ${
                          timeFilter === '3days'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        3D
                      </button>
                      <button
                        onClick={() => setTimeFilter('week')}
                        className={`px-1.5 sm:px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                          active:scale-95 ${
                          timeFilter === 'week'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        1W
                      </button>
                      <button
                        onClick={() => setTimeFilter('month')}
                        className={`px-1.5 sm:px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                          active:scale-95 ${
                          timeFilter === 'month'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        1M
                      </button>
                    </div>
                  )}
                  {/* 查看全部按钮 - 根据权限动态显示 */}
                  {visibleTypeFilters.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <div className="flex items-center space-x-0.5 bg-white dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
                        <button
                          onClick={() => router.push('/history')}
                          className="px-2 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                            active:scale-95 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 
                            hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center space-x-1"
                          title="单据管理"
                        >
                          <Archive className="w-3 h-3 transition-colors" />
                          <span className="hidden sm:inline">管理</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {recentDocuments.length > 0 ? (
                <div className="dashboard-grid gap-4">
                  {recentDocuments.map((doc, index) => {
                    // 根据文档类型设置图标和颜色
                    let Icon = FileText;
                    let bgColor = 'bg-blue-100 dark:bg-blue-900/30';
                    let textColor = 'text-blue-600 dark:text-blue-400';
                    
                    switch (doc.type) {
                      case 'quotation':
                        Icon = FileText;
                        bgColor = 'bg-blue-100 dark:bg-blue-900/30';
                        textColor = 'text-blue-600 dark:text-blue-400';
                        break;
                      case 'confirmation':
                        Icon = FileText;
                        bgColor = 'bg-green-100 dark:bg-green-900/30';
                        textColor = 'text-green-600 dark:text-green-400';
                        break;
                      case 'packing':
                        Icon = Package;
                        bgColor = 'bg-teal-100 dark:bg-teal-900/30';
                        textColor = 'text-teal-600 dark:text-teal-400';
                        break;
                      case 'invoice':
                        Icon = Receipt;
                        bgColor = 'bg-purple-100 dark:bg-purple-900/30';
                        textColor = 'text-purple-600 dark:text-purple-400';
                        break;
                      case 'purchase':
                        Icon = ShoppingCart;
                        bgColor = 'bg-orange-100 dark:bg-orange-900/30';
                        textColor = 'text-orange-600 dark:text-orange-400';
                        break;
                      default:
                        Icon = FileText;
                        bgColor = 'bg-gray-100 dark:bg-gray-900/30';
                        textColor = 'text-gray-600 dark:text-gray-400';
                    }
                    
                    return (
                      <div
                        key={doc.id}
                        className={`group bg-white dark:bg-[#1c1c1e] rounded-xl shadow-md border border-gray-200/50 dark:border-gray-800/50 
                          p-3 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer
                          active:shadow-sm hover:border-gray-300/70 dark:hover:border-gray-700/70 w-full
                          ${(() => {
                            // 根据文档类型匹配对应的模块颜色
                            switch (doc.type) {
                              case 'quotation':
                                return 'hover:bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20';
                              case 'confirmation':
                                return 'hover:bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20';
                              case 'packing':
                                return 'hover:bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20';
                              case 'invoice':
                                return 'hover:bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20';
                              case 'purchase':
                                return 'hover:bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20';
                              default:
                                return 'hover:bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20';
                            }
                          })()}`}
                        onClick={() => {
                          // 根据文档类型跳转到编辑页面
                          const editPath = `/${doc.type}/edit/${doc.id}`;
                          router.push(editPath);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            const editPath = `/${doc.type}/edit/${doc.id}`;
                            router.push(editPath);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`编辑${getDocumentTypeName(doc.type)}单据 ${getDocumentNumber(doc)}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-7 h-7 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0
                            group-hover:scale-110 transition-transform duration-200`}>
                            <Icon className={`w-3.5 h-3.5 ${textColor} transition-colors`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium text-gray-900 dark:text-white truncate
                              transition-colors duration-200 ${getColorClasses(doc.type)}`}>
                              {getDocumentTypeName(doc.type)} - {getDocumentNumber(doc)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5
                              group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
                              {getDocumentName(doc)}
                            </div>
                          </div>
                          {/* 添加一个微妙的箭头指示器 */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-md border border-gray-200/50 dark:border-gray-800/50 p-5 text-center">
                  <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                    {getEmptyStateText()}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    开始创建第一个单据吧！
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      <Footer />
    </div>
  );
} 