'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
import { usePermissionStore, hasPermission } from '@/lib/permissions';
import { Header } from '@/components/Header';

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
    bgColor: 'bg-blue-100 hover:bg-blue-200',
    iconBg: 'bg-blue-500',
    textColor: 'text-blue-700',
    shortcut: 'Q'
  },
  { 
    id: 'confirmation', 
    name: '销售确认', 
    path: '/quotation',
    icon: FileText,
    bgColor: 'bg-green-100 hover:bg-green-200',
    iconBg: 'bg-green-500',
    textColor: 'text-green-700',
    shortcut: 'C'
  },
  { 
    id: 'packing', 
    name: '箱单发票', 
    path: '/packing',
    icon: Package,
    bgColor: 'bg-teal-100 hover:bg-teal-200',
    iconBg: 'bg-teal-500',
    textColor: 'text-teal-700',
    shortcut: 'B'
  },
  { 
    id: 'invoice', 
    name: '财务发票', 
    path: '/invoice',
    icon: Receipt,
    bgColor: 'bg-purple-100 hover:bg-purple-200',
    iconBg: 'bg-purple-500',
    textColor: 'text-purple-700',
    shortcut: 'I'
  },
  { 
    id: 'purchase', 
    name: '采购订单', 
    path: '/purchase',
    icon: ShoppingCart,
    bgColor: 'bg-orange-100 hover:bg-orange-200',
    iconBg: 'bg-orange-500',
    textColor: 'text-orange-700',
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
    bgColor: 'bg-indigo-100 hover:bg-indigo-200',
    iconBg: 'bg-indigo-500',
    textColor: 'text-indigo-700'
  },
  { 
    id: 'date-tools', 
    name: '日期计算', 
    path: '/date-tools',
    icon: Calendar,
    bgColor: 'bg-pink-100 hover:bg-pink-200',
    iconBg: 'bg-pink-500',
    textColor: 'text-pink-700'
  }
];

// Tools功能模块
const TOOLS_MODULES = [
  { 
    id: 'history', 
    name: '单据管理', 
    path: '/history',
    icon: Archive,
    bgColor: 'bg-gray-100 hover:bg-gray-200',
    iconBg: 'bg-gray-600',
    textColor: 'text-gray-700'
  },
  { 
    id: 'customer', 
    name: '客户管理', 
    path: '/customer',
    icon: Users,
    bgColor: 'bg-violet-100 hover:bg-violet-200',
    iconBg: 'bg-violet-500',
    textColor: 'text-violet-700'
  },
  { 
    id: 'feature5', 
    name: '库存管理', 
    path: '/tools/feature5',
    icon: Database,
    bgColor: 'bg-amber-100 hover:bg-amber-200',
    iconBg: 'bg-amber-500',
    textColor: 'text-amber-700'
  },
  { 
    id: 'feature3', 
    name: '数据分析', 
    path: '/tools/feature3',
    icon: BarChart3,
    bgColor: 'bg-cyan-100 hover:bg-cyan-200',
    iconBg: 'bg-cyan-500',
    textColor: 'text-cyan-700'
  },
  { 
    id: 'feature8', 
    name: '销售预测', 
    path: '/tools/feature8',
    icon: TrendingUp,
    bgColor: 'bg-emerald-100 hover:bg-emerald-200',
    iconBg: 'bg-emerald-500',
    textColor: 'text-emerald-700'
  },
  { 
    id: 'feature7', 
    name: '时间管理', 
    path: '/tools/feature7',
    icon: Clock,
    bgColor: 'bg-indigo-100 hover:bg-indigo-200',
    iconBg: 'bg-indigo-500',
    textColor: 'text-indigo-700'
  },
  { 
    id: 'feature6', 
    name: '自动化工具', 
    path: '/tools/feature6',
    icon: Zap,
    bgColor: 'bg-red-100 hover:bg-red-200',
    iconBg: 'bg-red-500',
    textColor: 'text-red-700'
  },
  { 
    id: 'feature9', 
    name: '系统设置', 
    path: '/tools/feature9',
    icon: Settings,
    bgColor: 'bg-gray-100 hover:bg-gray-200',
    iconBg: 'bg-gray-500',
    textColor: 'text-gray-700'
  }
];

// 统一的模块按钮组件
const ModuleButton = ({ module, onClick }: { 
  module: any; 
  onClick: (module: any) => void; 
}) => {
  const Icon = module.icon;
  
  // 优先使用模块对象的颜色字段
  const bgColor = module.bgColor || 'bg-gray-100 hover:bg-gray-200';
  const iconBg = module.iconBg || 'bg-gray-500';
  const titleColor = module.titleColor || module.textColor || 'text-gray-800';
  const shortcutBg = module.shortcutBg || iconBg;
  
  // 将Tailwind类名转换为内联样式，确保不被覆盖
  const getBgStyle = (bgClass: string) => {
    const colorMap: { [key: string]: string } = {
      'bg-blue-100': '#dbeafe',
      'hover:bg-blue-200': '#bfdbfe',
      'bg-green-100': '#dcfce7',
      'hover:bg-green-200': '#bbf7d0',
      'bg-teal-100': '#ccfbf1',
      'hover:bg-teal-200': '#99f6e4',
      'bg-purple-100': '#f3e8ff',
      'hover:bg-purple-200': '#e9d5ff',
      'bg-orange-100': '#ffedd5',
      'hover:bg-orange-200': '#fed7aa',
      'bg-indigo-100': '#e0e7ff',
      'hover:bg-indigo-200': '#c7d2fe',
      'bg-pink-100': '#fce7f3',
      'hover:bg-pink-200': '#fbcfe8',
      'bg-gray-100': '#f3f4f6',
      'hover:bg-gray-200': '#e5e7eb',
      'bg-violet-100': '#ede9fe',
      'hover:bg-violet-200': '#ddd6fe',
      'bg-amber-100': '#fef3c7',
      'hover:bg-amber-200': '#fde68a',
      'bg-cyan-100': '#cffafe',
      'hover:bg-cyan-200': '#a5f3fc',
      'bg-emerald-100': '#d1fae5',
      'hover:bg-emerald-200': '#a7f3d0',
      'bg-red-100': '#fee2e2',
      'hover:bg-red-200': '#fecaca'
    };
    
    const baseColor = bgClass.split(' ')[0];
    return colorMap[baseColor] || '#f3f4f6';
  };
  
  const bgStyle = { backgroundColor: getBgStyle(bgColor) };
  
  return (
    <button
      key={module.id}
      className={`group relative shadow-md hover:shadow-lg 
        rounded-xl overflow-hidden transition-all duration-300 ease-in-out
        hover:-translate-y-1 active:translate-y-0 cursor-pointer
        border border-gray-200/50 dark:border-gray-800/50
        hover:border-gray-300/70 dark:hover:border-gray-700/70
        active:shadow-sm
        p-4 h-20 flex items-center space-x-3 w-full`}
      style={bgStyle}
      onClick={() => onClick(module)}
    >
      {/* 图标容器 */}
      <div className={`p-2 rounded-lg ${iconBg} flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {/* 文本内容 */}
      <div className="flex-1 min-w-0 text-left">
        <h3 className={`text-base font-bold ${titleColor} leading-tight line-clamp-1
          transition-colors duration-200 group-hover:${titleColor} dark:text-white`}>
          {module.name}
        </h3>
      </div>
      {/* 快捷键标识 */}
      {module.shortcut && (
        <div className={`absolute top-2 right-2 w-5 h-5 ${shortcutBg} rounded text-white 
          flex items-center justify-center text-xs font-bold shadow-sm`}>
          {module.shortcut}
        </div>
      )}
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<'today' | '3days' | 'week' | 'month'>('today');
  const [typeFilter, setTypeFilter] = useState<'all' | 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase'>('all');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // 不使用usePermissionStore，避免自动获取权限
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const refreshing = isLoading;
  // 添加最新权限数据状态
  const [latestPermissions, setLatestPermissions] = useState<any[]>([]);

  // 动态权限映射，根据session中的权限数据或最新权限数据
  const permissionMap = useMemo(() => {
    // 优先使用最新权限数据，如果没有则使用session中的权限数据
    const permissions = latestPermissions.length > 0 ? latestPermissions : (session?.user?.permissions || []);
    
    if (!permissions || permissions.length === 0) {
      // 如果没有权限数据，默认显示所有模块
      return {
        permissions: {
          quotation: true,
          packing: true,
          invoice: true,
          purchase: true
        },
        documentTypePermissions: {
          quotation: true,
          confirmation: true,
          packing: true,
          invoice: true,
          purchase: true
        },
        accessibleDocumentTypes: ['quotation', 'confirmation', 'packing', 'invoice', 'purchase']
      };
    }

    // 根据权限数据构建权限映射
    const permissionMap = {
      quotation: false,
      packing: false,
      invoice: false,
      purchase: false
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
        }
      }
    });

    // 构建可访问的文档类型列表
    const accessibleDocumentTypes = [];
    if (documentTypePermissions.quotation) accessibleDocumentTypes.push('quotation');
    if (documentTypePermissions.confirmation) accessibleDocumentTypes.push('confirmation');
    if (documentTypePermissions.packing) accessibleDocumentTypes.push('packing');
    if (documentTypePermissions.invoice) accessibleDocumentTypes.push('invoice');
    if (documentTypePermissions.purchase) accessibleDocumentTypes.push('purchase');

    return {
      permissions: permissionMap,
      documentTypePermissions,
      accessibleDocumentTypes
    };
  }, [session?.user?.permissions, latestPermissions]); // 依赖session中的权限数据和最新权限数据

  // 暂时禁用性能监控启动，避免无限重新渲染
  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     performanceMonitor.startTimer('dashboard_page_load');
  //     
  //     safeRequestIdleCallback(() => {
  //       if (process.env.NODE_ENV === 'production') {
  //         performanceMonitor.monitorResourceLoading();
  //       }
  //       performanceMonitor.monitorApiCalls();
  //       optimizePerformance.optimizeFontLoading();
  //       optimizePerformance.cleanupUnusedResources();
  //     }, { timeout: 2000 });
  //   }
  // }, []);

  // 加载指定时间范围内的文档函数
  const loadDocuments = useCallback(async (filter: 'today' | '3days' | 'week' | 'month' = 'today', typeFilter: 'all' | 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase' = 'all') => {
    try {
      // 使用动态权限映射
      const allDocuments = [];
      
      // 只加载用户有权限的文档类型
      if (permissionMap.documentTypePermissions.quotation) {
        const quotationHistory = JSON.parse(localStorage.getItem('quotation_history') || '[]');
        allDocuments.push(...quotationHistory.map((doc: any) => ({ ...doc, type: doc.type || 'quotation' })));
      }
      
      if (permissionMap.documentTypePermissions.packing) {
        const packingHistory = JSON.parse(localStorage.getItem('packing_history') || '[]');
        allDocuments.push(...packingHistory.map((doc: any) => ({ ...doc, type: 'packing' })));
      }
      
      if (permissionMap.documentTypePermissions.invoice) {
        const invoiceHistory = JSON.parse(localStorage.getItem('invoice_history') || '[]');
        allDocuments.push(...invoiceHistory.map((doc: any) => ({ ...doc, type: 'invoice' })));
      }
      
      if (permissionMap.documentTypePermissions.purchase) {
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

  // 切换展开/折叠状态（已移除，因为默认全部展开）
  const toggleSection = useCallback((section: string) => {
    // 已移除展开/折叠功能，默认全部展开
  }, []);

  // 监听localStorage变化，实时更新单据记录
  useEffect(() => {
    if (!mounted) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.includes('_history') || e.key.includes('History'))) {
        loadDocuments(timeFilter, typeFilter);
      }
    };

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail && (e.detail.key.includes('_history') || e.detail.key.includes('History'))) {
        loadDocuments(timeFilter, typeFilter);
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

  // 优化的预加载逻辑 - 只预加载核心模块页面
  const prefetchPages = useCallback(() => {
    if (typeof window !== 'undefined') {
      // 只预加载核心模块：报价、箱单、财务、采购、单据
      const coreModules = [
        { path: '/quotation' },      // 报价
        { path: '/packing' },        // 箱单
        { path: '/invoice' },        // 财务
        { path: '/purchase' },       // 采购
        { path: '/history' }         // 单据
      ];
      
      // 预加载核心模块页面
      coreModules.forEach(module => {
        router.prefetch(module.path);
      });
    }
  }, [router]);

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

  // 简化的初始化逻辑
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const init = async () => {
      // 只预加载页面，不重新加载权限
      if (typeof window !== 'undefined') {
        const coreModules = [
          { path: '/quotation' },
          { path: '/packing' },
          { path: '/invoice' },
          { path: '/purchase' },
          { path: '/history' }
        ];
        coreModules.forEach(module => {
          router.prefetch(module.path);
        });
      }
      
      // 移除权限重新加载逻辑，只依赖菜单中的权限刷新功能
    };
    init();
  }, [router]); // 只依赖router，移除session和user依赖

  // 优化的退出逻辑 - 避免重复退出
  const handleLogout = useCallback(async () => {
    // 清除权限store和当前用户的相关缓存
    usePermissionStore.getState().clearUser();
    localStorage.removeItem('username');
    
    // 只调用一次signOut，避免重复退出
    await signOut({ redirect: true, callbackUrl: '/' });
  }, []);

  // 动态模块过滤，根据权限显示模块
  const availableQuickCreateModules = useMemo(() => {
    return QUICK_CREATE_MODULES.filter(module => {
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
  }, [permissionMap.permissions]);

  const availableToolModules = useMemo(() => {
    return TOOL_MODULES.filter(module => {
      switch (module.id) {
        case 'quotation':
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
  }, [permissionMap.permissions]);

  const availableToolsModules = useMemo(() => {
    return TOOLS_MODULES.filter(module => {
      switch (module.id) {
        case 'quotation':
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
  }, [permissionMap.permissions]);

  // 根据权限过滤可用的文档类型筛选器
  const availableTypeFilters = useMemo(() => {
    const filters = [];
    
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

  // 根据权限过滤可见的类型筛选器
  const visibleTypeFilters = useMemo(() => {
    return availableTypeFilters.slice(0, showAllFilters ? availableTypeFilters.length : 3);
  }, [availableTypeFilters, showAllFilters]);

  // 检查当前选择的筛选器是否有效，如果无效则重置为第一个可用选项
  useEffect(() => {
    if (visibleTypeFilters.length > 0) {
      const currentFilterExists = visibleTypeFilters.some(filter => filter.type === typeFilter);
      if (!currentFilterExists) {
        setTypeFilter(visibleTypeFilters[0].type as any);
      }
    }
  }, [visibleTypeFilters]); // 移除 typeFilter 依赖，避免无限循环

  // 暂时禁用性能监控，避免无限重新渲染
  // useEffect(() => {
  //   if (mounted && !refreshing) {
  //     try {
  //       performanceMonitor.endTimer('dashboard_page_load');
  //       const metrics = performanceMonitor.getPageLoadMetrics();
  //       if (process.env.NODE_ENV === 'development') {
  //         console.log('📊 Dashboard页面加载性能:', metrics);
  //       }
  //     } catch (error) {
  //       if (process.env.NODE_ENV === 'development') {
  //         console.log('性能监控错误:', error);
  //       }
  //     }
  //   }
  // }, [mounted, refreshing]);

  // 权限刷新处理函数
  const handleRefreshPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setSuccessMessage('正在刷新权限信息...');
      setShowSuccessMessage(true);
      
      // 调用权限刷新API
      const response = await fetch('/api/auth/update-session-permissions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-ID': session?.user?.id || session?.user?.username || '',
          'X-User-Name': session?.user?.username || session?.user?.name || '',
          'X-User-Admin': session?.user?.isAdmin ? 'true' : 'false'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('权限刷新失败');
      }

      const data = await response.json();
      
      if (data.success) {
        // 更新最新权限数据
        setLatestPermissions(data.permissions);

        // 触发权限变化事件，通知其他组件
        window.dispatchEvent(new CustomEvent('permissionChanged', {
          detail: {
            message: '权限信息已更新',
            permissions: data.permissions
          }
        }));
        
        // 强制重新渲染页面
        setRefreshKey(prev => prev + 1);
        setSuccessMessage('权限信息已更新');
        setTimeout(() => setShowSuccessMessage(false), 2000);
        
        // 重新获取session以更新权限数据
        // 注意：这里我们通过触发页面重新渲染来更新权限显示
        // 因为NextAuth的session更新需要重新登录，我们通过动态权限映射来处理
      } else {
        throw new Error(data.error || '权限刷新失败');
      }
    } catch (error) {
      console.error('刷新权限失败:', error);
      setSuccessMessage('权限刷新失败，请重试');
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user]);

  // 使用 useEffect 处理重定向，避免在渲染过程中调用 router.push
  useEffect(() => {
    // 只有在session状态明确为unauthenticated时才重定向
    if (status === 'unauthenticated' && !user) {
      router.push('/');
    }
  }, [status, user, router]);

  // 所有 hooks 声明完毕后，再做提前 return
  if (!mounted) return null;
  
  // 移除页面刷新时的权限加载提示，只依赖菜单中的权限刷新
  // 如果未登录，返回空内容而不是直接重定向
  if (!session && !user) return null;

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

  // 页面正常 return
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-black">
      <div className="flex-1">
        <Header 
          user={{
            name: session?.user?.name || session?.user?.username || '用户',
            isAdmin: session?.user?.isAdmin || false
          }}
          onLogout={handleLogout}
          onProfile={() => setShowProfileModal(true)}
          onRefreshPermissions={handleRefreshPermissions}
          isRefreshing={refreshing}
          title="Dashboard"
          showWelcome={true}
        />

        {user && (
          <ProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            user={user}
          />
        )}

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
                    onClick={handleModuleClick}
                  />
                ))}
                
                {/* 管理中心按钮 */}
                {availableToolsModules.slice(0, 4).map((module) => (
                  <ModuleButton 
                      key={module.id}
                    module={module}
                    onClick={handleModuleClick}
                  />
                ))}
                
                {/* 实用工具按钮 */}
                {availableToolModules.map((module) => (
                  <ModuleButton 
                      key={module.id}
                    module={module}
                    onClick={handleModuleClick}
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
                      bgColor: 'bg-gray-100 hover:bg-gray-200',
                      iconBg: 'bg-gray-500',
                      textColor: 'text-gray-700'
                    }}
                    onClick={handleModuleClick}
                  />
                )}
              </div>
            </div>
          )}

          {/* 4. 今天创建或修改的单据 - 根据权限动态显示 */}
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
                          <Archive className="w-3 h-3" />
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
                            <Icon className={`w-3.5 h-3.5 ${textColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium text-gray-900 dark:text-white truncate
                              transition-colors duration-200 ${(() => {
                                // 根据文档类型匹配对应的文字颜色
                                switch (doc.type) {
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
                              })()}`}>
                              {getDocumentTypeName(doc.type)} - {getDocumentNumber(doc)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5
                              group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
                              {(() => {
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
                              })()}
                            </div>
                          </div>
                          {/* 添加一个微妙的箭头指示器 */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    {(() => {
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
                    })()}
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