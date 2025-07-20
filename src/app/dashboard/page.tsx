'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
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
import dynamic from 'next/dynamic';
import { Footer } from '@/components/Footer';
import { performanceMonitor, optimizePerformance } from '@/utils/performance';
import { usePermissionStore } from '@/lib/permissions';

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

// 使用dynamic导入避免hydration问题
const DynamicHeader = dynamic(() => import('@/components/Header').then(mod => mod.Header), {
  ssr: true,
  loading: () => (
    <div className="bg-white dark:bg-[#1c1c1e] shadow-sm dark:shadow-gray-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
      </div>
    </div>
  )
});

// 权限管理已移至 @/lib/permissions

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showDocumentsRefreshMessage, setShowDocumentsRefreshMessage] = useState(false);
  const [refreshingDocuments, setRefreshingDocuments] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<'today' | '3days' | 'week' | 'month'>('today');
  
  // 使用权限store
  const { user, hasPermission, fetchUser, isLoading } = usePermissionStore();
  
  // 使用loading作为refreshing状态
  const refreshing = isLoading;

  // 性能监控
  useEffect(() => {
    if (typeof window !== 'undefined') {
      performanceMonitor.startTimer('dashboard_page_load');
      performanceMonitor.monitorResourceLoading();
      performanceMonitor.monitorApiCalls();
      
      optimizePerformance.optimizeFontLoading();
      optimizePerformance.cleanupUnusedResources();
    }
  }, []);

  // 加载指定时间范围内的文档函数
  const loadDocuments = useCallback(async (showLoading = false, filter: 'today' | '3days' | 'week' | 'month' = 'today') => {
    try {
      if (showLoading) {
        setRefreshingDocuments(true);
      }
      
      const quotationHistory = JSON.parse(localStorage.getItem('quotation_history') || '[]');
      const invoiceHistory = JSON.parse(localStorage.getItem('invoice_history') || '[]');
      const purchaseHistory = JSON.parse(localStorage.getItem('purchase_history') || '[]');
      const packingHistory = JSON.parse(localStorage.getItem('packing_history') || '[]');

      const allDocuments = [
        ...quotationHistory.map((doc: any) => ({ ...doc, type: doc.type || 'quotation' })),
        ...invoiceHistory.map((doc: any) => ({ ...doc, type: 'invoice' })),
        ...purchaseHistory.map((doc: any) => ({ ...doc, type: 'purchase' })),
        ...packingHistory.map((doc: any) => ({ ...doc, type: 'packing' }))
      ];

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
      const filteredDocuments = allDocuments.filter((doc: any) => {
        // 优先使用date字段，如果没有则使用updatedAt或createdAt
        const docDate = new Date(doc.date || doc.updatedAt || doc.createdAt);
        return docDate >= startDate && docDate <= now;
      });

      // 按日期排序（最新的在前）
      const sorted = filteredDocuments
        .sort((a, b) => {
          const dateA = new Date(a.date || a.updatedAt || a.createdAt);
          const dateB = new Date(b.date || b.updatedAt || b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });

      setRecentDocuments(sorted);
      
      // 如果是手动刷新，显示成功消息
      if (showLoading) {
        setShowDocumentsRefreshMessage(true);
        setTimeout(() => setShowDocumentsRefreshMessage(false), 2000);
      }
    } catch (error) {
      console.error('加载文档失败:', error);
    } finally {
      if (showLoading) {
        setRefreshingDocuments(false);
      }
    }
  }, []);

  // 加载指定时间范围内的文档
  useEffect(() => {
    if (mounted) {
      loadDocuments(false, timeFilter);
    }
  }, [mounted, loadDocuments, timeFilter]);

  // 手动刷新处理函数
  const handleRefreshDocuments = useCallback(() => {
    loadDocuments(true, timeFilter);
  }, [loadDocuments, timeFilter]);

  // 切换展开/折叠状态（已移除，因为默认全部展开）
  const toggleSection = useCallback((section: string) => {
    // 已移除展开/折叠功能，默认全部展开
  }, []);

  // 监听localStorage变化，实时更新单据记录
  useEffect(() => {
    if (!mounted) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.includes('_history') || e.key.includes('History'))) {
        loadDocuments(false, timeFilter);
      }
    };

    // 监听storage事件（跨标签页）
    window.addEventListener('storage', handleStorageChange);

    // 创建自定义事件监听器（同标签页内）
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail && (e.detail.key.includes('_history') || e.detail.key.includes('History'))) {
        loadDocuments(false, timeFilter);
      }
    };

    window.addEventListener('customStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [mounted, loadDocuments, timeFilter]);

  // 优化预加载逻辑
  const prefetchPages = useCallback(() => {
    if (typeof window !== 'undefined') {
      const priorityPages = ['/quotation', '/invoice', '/purchase', '/packing', '/history', '/customer'];
      priorityPages.forEach(page => {
        router.prefetch(page);
      });
    }
  }, [router]);

  useEffect(() => {
    const init = async () => {
      setMounted(true);
      // 获取用户权限 - 每次登录都强制重新获取
      await fetchUser(true);
    };
    init();
  }, [fetchUser]);

  const handleLogout = async () => {
    // 清除权限store和所有相关缓存
    usePermissionStore.getState().clearUser();
    localStorage.removeItem('username');
    localStorage.removeItem('permissions_backup');
    localStorage.removeItem('permission-store');
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  // 使用权限store的权限检查函数
  const availableQuickCreateModules = useMemo(() => {
    const modules = QUICK_CREATE_MODULES.filter(module => {
      // 销售确认使用与报价单相同的权限
      if (module.id === 'confirmation') {
        return hasPermission('quotation');
      }
      return hasPermission(module.id);
    });
    return modules;
  }, [hasPermission, user?.permissions]);

  const availableToolModules = useMemo(() => {
    return TOOL_MODULES.filter(module => hasPermission(module.id));
  }, [hasPermission, user?.permissions]);

  const availableToolsModules = useMemo(() => {
    return TOOLS_MODULES.filter(module => hasPermission(module.id));
  }, [hasPermission, user?.permissions]);

  // 页面加载完成后的性能记录
  useEffect(() => {
    if (mounted && !refreshing && user) { // 移除loading检查
      performanceMonitor.endTimer('dashboard_page_load');
      const metrics = performanceMonitor.getPageLoadMetrics();
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Dashboard页面加载性能:', metrics);
      }
    }
  }, [mounted, refreshing, user]); // 移除loading检查

  // 避免闪烁，在客户端渲染前返回空内容
  if (!mounted || status === 'loading') {
    return null;
  }

  if (!session) {
    router.push('/');
    return null;
  }

  // 显示错误状态
  // if (fetchError) { // 移除此行，因为fetchError已移除
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="text-red-600 mb-4">加载失败</div>
  //         <div className="text-sm text-gray-500 mb-4">{fetchError}</div>
  //         <div className="flex space-x-2 justify-center">
  //           <button 
  //             onClick={() => fetchUser(false)}
  //             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
  //           >
  //             重试
  //           </button>
  //           <button 
  //             onClick={handleRefreshPermissions}
  //             className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
  //           >
  //             强制刷新
  //           </button>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-black">
      <div className="flex-1">
        <DynamicHeader 
          user={{
            name: session?.user?.name || user?.username || '用户',
            isAdmin: user?.isAdmin || false
          }}
          onLogout={handleLogout}
          onProfile={() => setShowProfileModal(true)}
          onRefreshPermissions={async () => {
            try {
              await fetchUser(true);
              setShowSuccessMessage(true);
              setTimeout(() => setShowSuccessMessage(false), 3000);
              // 不强制刷新页面，让组件自动重新渲染
            } catch (error) {
              console.error('刷新权限失败:', error);
            }
          }}
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 成功消息 */}
          {showSuccessMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-800 dark:text-green-200 text-sm font-medium">
                  权限信息已成功刷新
                </span>
              </div>
            </div>
          )}



          {/* 功能按钮区域 */}
          {(availableQuickCreateModules.length > 0 || availableToolsModules.length > 0 || availableToolModules.length > 0) && (
            <div className="mb-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {/* 新建单据按钮 */}
                {availableQuickCreateModules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <button
                      key={module.id}
                      className="group relative bg-white dark:bg-[#1c1c1e] shadow-md hover:shadow-lg 
                        rounded-xl overflow-hidden transition-all duration-300 ease-in-out
                        hover:-translate-y-1 cursor-pointer
                        border border-gray-200/50 dark:border-gray-800/50
                        hover:border-gray-300/70 dark:hover:border-gray-700/70
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        dark:focus:ring-offset-gray-900
                        p-4 h-20 flex items-center space-x-3"
                      onClick={() => {
                        if (module.id === 'confirmation') {
                          // 为销售确认设置全局变量
                          if (typeof window !== 'undefined') {
                            (window as any).__QUOTATION_TYPE__ = 'confirmation';
                          }
                        }
                        router.push(module.path);
                      }}
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${module.color} flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-1">
                          {module.name}
                        </h3>
                      </div>
                    </button>
                  );
                })}
                
                {/* 管理中心按钮 */}
                {availableToolsModules.slice(0, 4).map((module) => {
                  const Icon = module.icon;
                  return (
                    <button
                      key={module.id}
                      className="group relative bg-white dark:bg-[#1c1c1e] shadow-md hover:shadow-lg 
                        rounded-xl overflow-hidden transition-all duration-300 ease-in-out
                        hover:-translate-y-1 cursor-pointer
                        border border-gray-200/50 dark:border-gray-800/50
                        hover:border-gray-300/70 dark:hover:border-gray-700/70
                        p-4 h-20 flex items-center space-x-3"
                      onClick={() => router.push(module.path)}
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${module.color} flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-1">
                          {module.name}
                        </h3>
                      </div>
                    </button>
                  );
                })}
                
                {/* 实用工具按钮 */}
                {availableToolModules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <button
                      key={module.id}
                      className="group relative bg-white dark:bg-[#1c1c1e] shadow-md hover:shadow-lg 
                        rounded-xl overflow-hidden transition-all duration-300 ease-in-out
                        hover:-translate-y-1 cursor-pointer
                        border border-gray-200/50 dark:border-gray-800/50
                        hover:border-gray-300/70 dark:hover:border-gray-700/70
                        p-4 h-20 flex items-center space-x-3"
                      onClick={() => router.push(module.path)}
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${module.color} flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-1">
                          {module.name}
                        </h3>
                      </div>
                    </button>
                  );
                })}
                
                {/* 更多功能按钮 */}
                {availableToolsModules.length > 4 && (
                  <button
                    className="group relative bg-white dark:bg-[#1c1c1e] shadow-md hover:shadow-lg 
                      rounded-xl overflow-hidden transition-all duration-300 ease-in-out
                      hover:-translate-y-1 cursor-pointer
                      border border-gray-200/50 dark:border-gray-800/50
                      hover:border-gray-300/70 dark:hover:border-gray-700/70
                      p-4 h-20 flex items-center space-x-3"
                    onClick={() => router.push('/tools')}
                  >
                    <div className="p-2 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                      <Settings className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-1">
                        更多功能
                      </h3>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}



          {/* 4. 今天创建或修改的单据 */}
          <div className="mb-8">
            <div className="flex items-center justify-end mb-4">
              <div className="flex items-center space-x-3">
                {/* 时间筛选器 */}
                <div className="flex items-center space-x-1 bg-white dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                  <button
                    onClick={() => setTimeFilter('today')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      timeFilter === 'today'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    1D
                  </button>
                  <button
                    onClick={() => setTimeFilter('3days')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      timeFilter === '3days'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    3D
                  </button>
                  <button
                    onClick={() => setTimeFilter('week')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      timeFilter === 'week'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    1W
                  </button>
                  <button
                    onClick={() => setTimeFilter('month')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      timeFilter === 'month'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    1M
                  </button>
                </div>
                {/* 刷新成功消息 */}
                {showDocumentsRefreshMessage && (
                  <div className="flex items-center px-3 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-800 dark:text-green-200 text-xs font-medium">
                      已刷新
                    </span>
                  </div>
                )}
                <button
                  onClick={handleRefreshDocuments}
                  disabled={refreshingDocuments}
                  className={`flex items-center space-x-1 text-sm transition-colors ${
                    refreshingDocuments 
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                  title="刷新单据列表"
                >
                  <svg className={`w-4 h-4 ${refreshingDocuments ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{refreshingDocuments ? '刷新中...' : '刷新'}</span>
                </button>
                <button
                  onClick={() => router.push('/history')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  查看全部
                </button>
              </div>
            </div>
            {recentDocuments.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                      className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-md border border-gray-200/50 dark:border-gray-800/50 p-3 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        // 根据文档类型跳转到编辑页面
                        const editPath = `/${doc.type}/edit/${doc.id}`;
                        router.push(editPath);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-7 h-7 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${textColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {getDocumentTypeName(doc.type)} - {getDocumentNumber(doc)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
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
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-md border border-gray-200/50 dark:border-gray-800/50 p-8 text-center">
                <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                  {timeFilter === 'today' && '今天还没有创建或修改的单据'}
                  {timeFilter === '3days' && '最近三天还没有创建或修改的单据'}
                  {timeFilter === 'week' && '最近一周还没有创建或修改的单据'}
                  {timeFilter === 'month' && '最近一个月还没有创建或修改的单据'}
                </div>
                <div className="text-sm text-gray-400 dark:text-gray-500">
                  开始创建你的第一个单据吧！
                </div>
              </div>
            )}
          </div>

          {/* 无权限提示 */}
          {availableQuickCreateModules.length === 0 && availableToolModules.length === 0 && availableToolsModules.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                暂无可用功能，请联系管理员分配权限
              </div>
              <button
                onClick={async () => {
                  try {
                    await fetchUser(true);
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 3000);
                    // 不强制刷新页面，让组件自动重新渲染
                  } catch (error) {
                    console.error('刷新权限失败:', error);
                  }
                }}
                disabled={refreshing}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  refreshing
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {refreshing ? '刷新中...' : '刷新权限'}
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
} 