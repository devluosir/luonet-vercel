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
    description: '创建报价单', 
    path: '/quotation',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    hoverColor: 'hover:text-blue-500 dark:hover:text-blue-300',
    shortcut: 'Q'
  },
  { 
    id: 'confirmation', 
    name: '销售确认', 
    description: '创建销售确认单', 
    path: '/quotation',
    icon: FileText,
    color: 'from-green-500 to-green-600',
    bgColor: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
    textColor: 'text-green-600 dark:text-green-400',
    hoverColor: 'hover:text-green-500 dark:hover:text-green-300',
    shortcut: 'C'
  },
  { 
    id: 'packing', 
    name: '箱单发票', 
    description: '创建装箱单和发票', 
    path: '/packing',
    icon: Package,
    color: 'from-teal-500 to-teal-600',
    bgColor: 'from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20',
    textColor: 'text-teal-600 dark:text-teal-400',
    hoverColor: 'hover:text-teal-500 dark:hover:text-teal-300',
    shortcut: 'B'
  },
  { 
    id: 'invoice', 
    name: '财务发票', 
    description: '创建财务发票', 
    path: '/invoice',
    icon: Receipt,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    hoverColor: 'hover:text-purple-500 dark:hover:text-purple-300',
    shortcut: 'I'
  },
  { 
    id: 'purchase', 
    name: '采购订单', 
    description: '创建采购订单', 
    path: '/purchase',
    icon: ShoppingCart,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
    textColor: 'text-orange-600 dark:text-orange-400',
    hoverColor: 'hover:text-orange-500 dark:hover:text-orange-300',
    shortcut: 'P'
  }
];

// 工具模块
const TOOL_MODULES = [
  { 
    id: 'ai-email', 
    name: 'AI邮件助手', 
    description: '智能生成商务邮件', 
    path: '/mail',
    icon: Mail,
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    hoverColor: 'hover:text-indigo-500 dark:hover:text-indigo-300'
  },
  { 
    id: 'date-tools', 
    name: '日期计算', 
    description: '计算日期和天数', 
    path: '/date-tools',
    icon: Calendar,
    color: 'from-pink-500 to-pink-600',
    bgColor: 'from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20',
    textColor: 'text-pink-600 dark:text-pink-400',
    hoverColor: 'hover:text-pink-500 dark:hover:text-pink-300'
  }
];

// Tools功能模块
const TOOLS_MODULES = [
  { 
    id: 'history', 
    name: '单据管理', 
    description: '管理单据历史记录', 
    path: '/history',
    icon: Archive,
    color: 'from-gray-600 to-slate-700',
    bgColor: 'from-gray-50 to-slate-100 dark:from-gray-800/20 dark:to-slate-700/20',
    textColor: 'text-gray-700 dark:text-gray-300',
    hoverColor: 'hover:text-gray-600 dark:hover:text-gray-200'
  },
  { 
    id: 'customer', 
    name: '客户管理', 
    description: '客户信息管理系统', 
    path: '/customer',
    icon: Users,
    color: 'from-violet-500 to-violet-600',
    bgColor: 'from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20',
    textColor: 'text-violet-600 dark:text-violet-400',
    hoverColor: 'hover:text-violet-500 dark:hover:text-violet-300'
  },
  { 
    id: 'feature5', 
    name: '库存管理', 
    description: '产品库存跟踪', 
    path: '/tools/feature5',
    icon: Database,
    color: 'from-amber-500 to-amber-600',
    bgColor: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    hoverColor: 'hover:text-amber-500 dark:hover:text-amber-300'
  },
  { 
    id: 'feature3', 
    name: '数据分析', 
    description: '业务数据分析和报表', 
    path: '/tools/feature3',
    icon: BarChart3,
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    hoverColor: 'hover:text-cyan-500 dark:hover:text-cyan-300'
  },
  { 
    id: 'feature8', 
    name: '销售预测', 
    description: '销售趋势分析', 
    path: '/tools/feature8',
    icon: TrendingUp,
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    hoverColor: 'hover:text-emerald-500 dark:hover:text-emerald-300'
  },
  { 
    id: 'feature7', 
    name: '时间管理', 
    description: '项目时间跟踪', 
    path: '/tools/feature7',
    icon: Clock,
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    hoverColor: 'hover:text-indigo-500 dark:hover:text-indigo-300'
  },
  { 
    id: 'feature6', 
    name: '自动化工具', 
    description: '工作流程自动化', 
    path: '/tools/feature6',
    icon: Zap,
    color: 'from-red-500 to-red-600',
    bgColor: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
    textColor: 'text-red-600 dark:text-red-400',
    hoverColor: 'hover:text-red-500 dark:hover:text-red-300'
  },
  { 
    id: 'feature9', 
    name: '系统设置', 
    description: '应用配置管理', 
    path: '/tools/feature9',
    icon: Settings,
    color: 'from-gray-500 to-gray-600',
    bgColor: 'from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20',
    textColor: 'text-gray-600 dark:text-gray-400',
    hoverColor: 'hover:text-gray-500 dark:hover:text-gray-300'
  }
];

// 统一的模块按钮组件
const ModuleButton = ({ module, onClick }: { 
  module: any; 
  onClick: (module: any) => void; 
}) => {
  const Icon = module.icon;
  return (
    <button
      key={module.id}
      className={`group relative bg-white dark:bg-[#1c1c1e] shadow-md hover:shadow-lg 
        rounded-xl overflow-hidden transition-all duration-300 ease-in-out
        hover:-translate-y-1 active:translate-y-0 cursor-pointer
        border border-gray-200/50 dark:border-gray-800/50
        hover:border-gray-300/70 dark:hover:border-gray-700/70
        active:shadow-sm
        p-4 h-20 flex items-center space-x-3 w-full
        hover:bg-gradient-to-br ${module.bgColor}`}
      onClick={() => onClick(module)}
    >
      <div className={`p-2 rounded-lg bg-gradient-to-br ${module.color} flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-1
          transition-colors duration-200 group-hover:text-gray-800 dark:group-hover:text-gray-200">
          {module.name}
        </h3>
      </div>
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
  const { user, isLoading } = usePermissionStore();
  const refreshing = isLoading;

  // 统一的权限映射和检查（优化版）
  const permissionMap = useMemo(() => {
    // 如果用户数据还没有加载完成，返回默认值
    if (!user || isLoading) {
      return {
        permissions: {
          quotation: false,
          packing: false,
          invoice: false,
          purchase: false
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

    // 使用统一的权限检查函数
    const permissions = {
      quotation: hasPermission('quotation'),
      packing: hasPermission('packing'),
      invoice: hasPermission('invoice'),
      purchase: hasPermission('purchase')
    };

    // 文档类型到权限的映射
    const documentTypePermissions = {
      quotation: permissions.quotation,
      confirmation: permissions.quotation, // 销售确认使用报价单权限
      packing: permissions.packing,
      invoice: permissions.invoice,
      purchase: permissions.purchase
    };

    // 可访问的文档类型
    const accessibleDocumentTypes = Object.entries(documentTypePermissions)
      .filter(([_, hasAccess]) => hasAccess)
      .map(([type]) => type);

    // 调试日志 - 只在开发环境显示
    if (process.env.NODE_ENV === 'development') {
      console.log('权限映射更新:', {
        user: user?.username,
        userPermissions: user?.permissions,
        permissions: permissions,
        documentTypePermissions: documentTypePermissions,
        accessibleDocumentTypes: accessibleDocumentTypes,
        // 添加权限数据样本
        samplePermissions: user?.permissions?.slice(0, 3) || [],
        // 添加详细的权限检查调试
        permissionChecks: {
          quotation: hasPermission('quotation'),
          packing: hasPermission('packing'),
          invoice: hasPermission('invoice'),
          purchase: hasPermission('purchase')
        },
        // 添加所有权限数据
        allPermissions: user?.permissions?.map(p => ({
          id: p.id,
          moduleId: p.moduleId,
          canAccess: p.canAccess,
          canAccessType: typeof p.canAccess
        })) || [],
        // 添加可访问文档类型的详细信息
        accessibleDocumentTypesDetails: accessibleDocumentTypes,
        accessibleDocumentTypesCount: accessibleDocumentTypes.length
      });
    }

    return {
      permissions,
      documentTypePermissions,
      accessibleDocumentTypes
    };
  }, [user, isLoading]); // 移除hasPermission依赖，避免无限重新渲染

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
      // 使用统一的权限映射
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
        console.log('已有刷新消息显示，跳过重复刷新');
        return;
      }

      console.log('检测到权限变化，准备更新页面:', e.detail?.message);
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
      // 预加载所有模块页面
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
      
      // 等待session加载完成后再获取权限
      if (status === 'loading') {
        return;
      }
      
      // 如果用户已登录，获取权限
      if (session?.user) {
        console.log('开始获取用户权限...');
        
        // 从API获取最新权限，而不是从session
        await usePermissionStore.getState().fetchPermissions();
        console.log('权限初始化完成');
      }
    };
    init();
  }, [session, status, router]); // 移除fetchUser和prefetchPages依赖

  // 优化的退出逻辑 - 避免重复退出
  const handleLogout = useCallback(async () => {
    // 清除权限store和当前用户的相关缓存
    usePermissionStore.getState().clearUser();
    localStorage.removeItem('username');
    
    // 只调用一次signOut，避免重复退出
    await signOut({ redirect: true, callbackUrl: '/' });
  }, []);

  // 使用统一的权限映射
  const availableQuickCreateModules = useMemo(() => {
    const modules = QUICK_CREATE_MODULES.filter(module => {
      if (module.id === 'confirmation') {
        return permissionMap.documentTypePermissions.confirmation;
      }
      return permissionMap.documentTypePermissions[module.id as keyof typeof permissionMap.documentTypePermissions];
    });
    

    
    return modules;
  }, [permissionMap.documentTypePermissions]);

  const availableToolModules = useMemo(() => {
    if (!user || isLoading) return [];
    const userPermissions = user.permissions || [];
    return TOOL_MODULES.filter(module => {
      const permission = userPermissions.find(p => p.moduleId === module.id);
      return permission?.canAccess || false;
    });
  }, [user, isLoading]);

  const availableToolsModules = useMemo(() => {
    if (!user || isLoading) return [];
    const userPermissions = user.permissions || [];
    return TOOLS_MODULES.filter(module => {
      const permission = userPermissions.find(p => p.moduleId === module.id);
      return permission?.canAccess || false;
    });
  }, [user, isLoading]);

  // 根据权限过滤可用的文档类型筛选器
  const availableTypeFilters = useMemo(() => {
    const filters = [];
    
    // 使用统一的权限映射
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
    
    // 如果有任何权限，添加ALL选项到PO的右边
    if (filters.length > 0) {
      filters.push({ type: 'all', label: 'ALL', color: 'gray' });
    }
    
    return filters;
  }, [permissionMap.documentTypePermissions]); // 移除refreshKey依赖，避免无限循环

  // 根据显示状态过滤按钮
  const visibleTypeFilters = useMemo(() => {
    if (showAllFilters) {
      // 显示所有按钮
      return availableTypeFilters;
    } else {
      // 只显示ALL按钮
      return availableTypeFilters.filter(filter => filter.type === 'all');
    }
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

  // 所有事件处理函数统一声明
  const handleRefreshPermissions = useCallback(async () => {
    try {
      setSuccessMessage('正在刷新权限信息...');
      setShowSuccessMessage(true);
      
      // 使用 fetchPermissions 从 API 获取最新权限
      await usePermissionStore.getState().fetchPermissions();
      
      setRefreshKey(prev => prev + 1);
      setSuccessMessage('权限信息已更新');
      setTimeout(() => setShowSuccessMessage(false), 2000);
    } catch (error) {
      console.error('刷新权限失败:', error);
      setSuccessMessage('权限刷新失败，请重试');
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  }, []);

  const handleNoPermissionRefresh = useCallback(async () => {
    try {
      setSuccessMessage('正在刷新权限信息...');
      setShowSuccessMessage(true);
      
      // 使用 fetchPermissions 从 API 获取最新权限
      await usePermissionStore.getState().fetchPermissions();
      
      setRefreshKey(prev => prev + 1);
      setSuccessMessage('权限信息已更新');
      setTimeout(() => setShowSuccessMessage(false), 2000);
    } catch (error) {
      console.error('刷新权限失败:', error);
      setSuccessMessage('权限刷新失败，请重试');
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  }, []);

  // 使用 useEffect 处理重定向，避免在渲染过程中调用 router.push
  useEffect(() => {
    if (!session && !user) {
      router.push('/');
    }
  }, [session, user, router]);

  // 所有 hooks 声明完毕后，再做提前 return
  if (!mounted) return null;
  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-lg text-gray-600 dark:text-gray-400">验证登录中...</div>
      </div>
    </div>
  );

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
            name: session?.user?.name || user?.username || '用户',
            isAdmin: user?.isAdmin || false
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
                      color: 'from-gray-500 to-gray-600',
                      bgColor: 'from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20'
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

          {/* 无权限提示 */}
          {availableQuickCreateModules.length === 0 && availableToolModules.length === 0 && availableToolsModules.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                暂无可用功能，请联系管理员分配权限
              </div>
              <div className="space-y-4">
                <button
                  onClick={handleNoPermissionRefresh}
                  disabled={refreshing}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2
                    dark:focus:ring-offset-gray-900 active:scale-95 ${
                    refreshing
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                  }`}
                >
                  {refreshing ? '刷新中...' : '刷新权限'}
                </button>
                
                {/* 调试信息 */}
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                  <p><strong>当前用户:</strong> {user?.username || '未获取'}</p>
                  <p><strong>Session用户:</strong> {session?.user?.username || session?.user?.name || '未获取'}</p>
                  <p><strong>权限数量:</strong> {user?.permissions?.length || 0}</p>
                  <p><strong>Session权限:</strong> {session?.user?.permissions?.length || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
} 