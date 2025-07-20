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
  Package
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/Footer';
import { performanceMonitor, optimizePerformance } from '@/utils/performance';

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
    name: '新建报价单', 
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
    name: '新建销售确认', 
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
    name: '新建箱单', 
    description: '创建装箱单和发票', 
    path: '/packing',
    icon: Archive,
    color: 'from-teal-500 to-teal-600',
    bgColor: 'from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20',
    textColor: 'text-teal-600 dark:text-teal-400',
    hoverColor: 'hover:text-teal-500 dark:hover:text-teal-300',
    shortcut: 'B'
  },
  { 
    id: 'invoice', 
    name: '新建发票', 
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
    name: '新建采购单', 
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
    name: '单据管理中心', 
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

// 缓存键常量
const CACHE_KEY = 'userInfo';
const CACHE_DURATION = 10 * 60 * 1000; // 10分钟

// 缓存工具函数
const cacheUtils = {
  get: (key: string) => {
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      if (now - timestamp > CACHE_DURATION) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch (e) {
      sessionStorage.removeItem(key);
      return null;
    }
  },
  
  set: (key: string, data: any) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      sessionStorage.setItem(key, JSON.stringify(cacheData));
    } catch (e) {
      console.warn('缓存写入失败:', e);
    }
  },
  
  clear: (key: string) => {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn('缓存清除失败:', e);
    }
  }
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [refreshingDocuments, setRefreshingDocuments] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);

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

  // 加载今天创建或修改的文档函数
  const loadTodayDocuments = useCallback(async (showLoading = false) => {
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

      // 获取今天的日期
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      // 筛选今天创建或修改的文档
      const todayDocuments = allDocuments.filter((doc: any) => {
        const docDate = new Date(doc.updatedAt || doc.createdAt);
        const docDateString = docDate.toISOString().split('T')[0];
        return docDateString === todayString;
      });

      // 按更新时间排序
      const sorted = todayDocuments
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

      setRecentDocuments(sorted);
      
      // 如果是手动刷新，显示成功消息
      if (showLoading) {
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
      }
    } catch (error) {
      console.error('加载今天文档失败:', error);
    } finally {
      if (showLoading) {
        setRefreshingDocuments(false);
      }
    }
  }, []);

  // 加载今天创建或修改的文档
  useEffect(() => {
    if (mounted) {
      loadTodayDocuments(false);
    }
  }, [mounted, loadTodayDocuments]);

  // 手动刷新处理函数
  const handleRefreshDocuments = useCallback(() => {
    loadTodayDocuments(true);
  }, [loadTodayDocuments]);

  // 监听localStorage变化，实时更新今天创建或修改的单据
  useEffect(() => {
    if (!mounted) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.includes('_history') || e.key.includes('History'))) {
        loadTodayDocuments(false);
      }
    };

    // 监听storage事件（跨标签页）
    window.addEventListener('storage', handleStorageChange);

    // 创建自定义事件监听器（同标签页内）
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail && (e.detail.key.includes('_history') || e.detail.key.includes('History'))) {
        loadTodayDocuments(false);
      }
    };

    window.addEventListener('customStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [mounted, loadTodayDocuments]);

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
    setMounted(true);
    prefetchPages();
  }, [prefetchPages]);

  const handleLogout = async () => {
    cacheUtils.clear(CACHE_KEY);
    localStorage.removeItem('username');
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  // 优化用户信息获取逻辑
  const fetchUser = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setFetchError(null);
      
      performanceMonitor.startTimer('user_fetch');
      
      if (forceRefresh) {
        cacheUtils.clear(CACHE_KEY);
        console.log('强制刷新用户权限信息');
      }
      
      const cachedUser = cacheUtils.get(CACHE_KEY);
      if (cachedUser && !forceRefresh) {
        setUser(cachedUser);
        setLoading(false);
        performanceMonitor.endTimer('user_fetch');
        return;
      }
      
      let retryCount = 0;
      const maxRetries = 1;
      
      while (retryCount <= maxRetries) {
        try {
          const response = await fetch(`/api/users/me${forceRefresh ? '?force=true' : ''}`, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          setUser(data);
          
          cacheUtils.set(CACHE_KEY, data);
          
          if (forceRefresh) {
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
          }
          break;
        } catch (error) {
          retryCount++;
          if (retryCount > maxRetries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      performanceMonitor.endTimer('user_fetch');
    } catch (error) {
      console.error('Error fetching user:', error);
      setFetchError(error instanceof Error ? error.message : '获取用户信息失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || status === 'loading') return;

    if (!session) {
      router.push('/');
      return;
    }

    fetchUser();
  }, [mounted, session, status, router, fetchUser]);

  // 使用useMemo优化模块过滤计算
  const availableQuickCreateModules = useMemo(() => {
    if (!user?.permissions) return [];
    
    return QUICK_CREATE_MODULES.filter(module => {
      // 销售确认使用与报价单相同的权限
      if (module.id === 'confirmation') {
        const quotationPermission = user.permissions.find(p => p.moduleId === 'quotation');
        return quotationPermission?.canAccess;
      }
      
      const permission = user.permissions.find(p => p.moduleId === module.id);
      return permission?.canAccess;
    });
  }, [user?.permissions]);

  const availableToolModules = useMemo(() => {
    if (!user?.permissions) return [];
    
    return TOOL_MODULES.filter(module => {
      const permission = user.permissions.find(p => p.moduleId === module.id);
      return permission?.canAccess;
    });
  }, [user?.permissions]);

  const availableToolsModules = useMemo(() => {
    if (!user?.permissions) return [];
    
    return TOOLS_MODULES.filter(module => {
      const permission = user.permissions.find(p => p.moduleId === module.id);
      return permission?.canAccess;
    });
  }, [user?.permissions]);

  // 页面加载完成后的性能记录
  useEffect(() => {
    if (mounted && !loading && user) {
      performanceMonitor.endTimer('dashboard_page_load');
      const metrics = performanceMonitor.getPageLoadMetrics();
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Dashboard页面加载性能:', metrics);
      }
    }
  }, [mounted, loading, user]);

  // 避免闪烁，在客户端渲染前返回空内容
  if (!mounted) {
    return null;
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">加载中...</div>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-sm text-gray-500 mt-2">
              正在获取用户权限信息...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // 显示错误状态
  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">加载失败</div>
          <div className="text-sm text-gray-500 mb-4">{fetchError}</div>
          <div className="flex space-x-2 justify-center">
            <button 
              onClick={() => fetchUser(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重试
            </button>
            <button 
              onClick={() => fetchUser(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              强制刷新
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getDocumentTypeName = (type: string) => {
    switch (type) {
      case 'quotation': return '报价单';
      case 'confirmation': return '销售确认';
      case 'invoice': return '发票';
      case 'purchase': return '采购单';
      case 'packing': return '箱单';
      default: return '单据';
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
        {user && (
          <>
            <DynamicHeader 
              user={{
                name: user.username,
                isAdmin: user.isAdmin
              }}
              onLogout={handleLogout}
              onProfile={() => setShowProfileModal(true)}
              onRefreshPermissions={() => fetchUser(true)}
              isRefreshing={refreshing}
              title="LC App Dashboard"
              showWelcome={true}
            />

            <ProfileModal
              isOpen={showProfileModal}
              onClose={() => setShowProfileModal(false)}
              user={user}
            />
          </>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          {/* 1. 快速创建单据 */}
          {availableQuickCreateModules.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    快速创建单据
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    选择要创建的单据类型
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                {availableQuickCreateModules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div
                      key={module.id}
                      className="group relative bg-white dark:bg-[#1c1c1e] shadow-md hover:shadow-xl 
                        rounded-2xl overflow-hidden transition-all duration-300 ease-in-out
                        hover:-translate-y-2 cursor-pointer
                        border border-gray-200/50 dark:border-gray-800/50
                        hover:border-gray-300/70 dark:hover:border-gray-700/70
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        dark:focus:ring-offset-gray-900
                        min-h-[180px]"
                      onClick={() => {
                        if (module.id === 'confirmation') {
                          // 为销售确认设置全局变量
                          if (typeof window !== 'undefined') {
                            (window as any).__QUOTATION_TYPE__ = 'confirmation';
                          }
                        }
                        router.push(module.path);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (module.id === 'confirmation') {
                            // 为销售确认设置全局变量
                            if (typeof window !== 'undefined') {
                              (window as any).__QUOTATION_TYPE__ = 'confirmation';
                            }
                          }
                          router.push(module.path);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`创建${module.name}`}
                    >
                      {/* 背景渐变层 */}
                      <div 
                        className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300 ease-in-out ${module.bgColor}`}
                      ></div>
                      
                      {/* 悬停时的光晕效果 */}
                      <div 
                        className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 ease-in-out bg-gradient-to-br ${module.color}`}
                      ></div>
                          
                      <div className="p-4 h-full flex flex-col">
                        {/* 图标和标题 */}
                        <div className="flex items-start space-x-3 mb-3">
                          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${module.color} flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight line-clamp-1">
                              {module.name}
                            </h3>
                          </div>
                        </div>
                        
                        {/* 描述 */}
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 flex-grow line-clamp-2 leading-relaxed">
                          {module.description}
                        </p>
                        
                        {/* 操作提示 */}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                          <div className={`flex items-center text-sm font-semibold ${module.textColor} ${module.hoverColor} transition-colors duration-300`}>
                            <span>快速创建</span>
                          </div>
                          <svg className={`h-4 w-4 ${module.textColor} transform group-hover:translate-x-1 transition-transform duration-300`} 
                              viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" 
                                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                                  clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. 管理中心 */}
          {availableToolsModules.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    管理中心
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    单据管理和客户管理
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {availableToolsModules.slice(0, 4).map((module) => {
                  const Icon = module.icon;
                  return (
                    <div
                      key={module.id}
                      className="group relative bg-white dark:bg-[#1c1c1e] shadow-sm hover:shadow-lg 
                        rounded-xl overflow-hidden transition-all duration-300 ease-in-out
                        hover:-translate-y-1 cursor-pointer
                        border border-gray-200/50 dark:border-gray-800/50
                        hover:border-gray-300/70 dark:hover:border-gray-700/70
                        min-h-[160px]"
                      onClick={() => router.push(module.path)}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300 ease-in-out ${module.bgColor}`}></div>
                      <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 ease-in-out bg-gradient-to-br ${module.color}`}></div>
                      
                      <div className="p-5 h-full flex flex-col">
                        {/* 图标和标题 */}
                        <div className="flex items-start space-x-4 mb-4">
                          <div className={`p-3 rounded-2xl bg-gradient-to-br ${module.color} flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight line-clamp-1">
                              {module.name}
                            </h3>
                          </div>
                        </div>
                        
                        {/* 描述 */}
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow line-clamp-2 leading-relaxed">
                          {module.description}
                        </p>
                        
                        {/* 操作按钮 */}
                        <div className={`flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-800`}>
                          <div className={`flex items-center text-sm font-semibold ${module.textColor} ${module.hoverColor} transition-colors duration-300`}>
                            <span>进入管理</span>
                          </div>
                          <svg className={`h-4 w-4 ${module.textColor} transform group-hover:translate-x-1 transition-transform duration-300`} 
                              viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" 
                                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                                  clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {availableToolsModules.length > 4 && (
                  <div
                    className="group relative bg-white dark:bg-[#1c1c1e] shadow-md hover:shadow-xl 
                      rounded-2xl overflow-hidden transition-all duration-300 ease-in-out
                      hover:-translate-y-2 cursor-pointer
                      border border-gray-200/50 dark:border-gray-800/50
                      hover:border-gray-300/70 dark:hover:border-gray-700/70
                      min-h-[180px]"
                    onClick={() => router.push('/tools')}
                  >
                    <div className="p-5 h-full flex flex-col">
                      <div className="flex items-start space-x-4 mb-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-gray-500 to-gray-600 flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                          <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight line-clamp-1">
                            更多功能
                          </h3>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow line-clamp-2 leading-relaxed">
                        查看所有可用功能模块
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors duration-300">
                          <span>查看全部</span>
                        </div>
                        <svg className="h-4 w-4 text-gray-600 dark:text-gray-400 transform group-hover:translate-x-1 transition-transform duration-300" 
                            viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" 
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                                clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. 实用工具 */}
          {availableToolModules.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    实用工具
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    AI助手和实用工具
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {availableToolModules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div
                      key={module.id}
                      className="group relative bg-white dark:bg-[#1c1c1e] shadow-sm hover:shadow-lg 
                        rounded-xl overflow-hidden transition-all duration-300 ease-in-out
                        hover:-translate-y-1 cursor-pointer
                        border border-gray-200/50 dark:border-gray-800/50
                        hover:border-gray-300/70 dark:hover:border-gray-700/70
                        min-h-[160px]"
                      onClick={() => router.push(module.path)}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300 ease-in-out ${module.bgColor}`}></div>
                      <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 ease-in-out bg-gradient-to-br ${module.color}`}></div>
                      
                      <div className="p-4 h-full flex flex-col">
                        <div className="flex items-start space-x-3 mb-3">
                          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${module.color} flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight line-clamp-1">
                              {module.name}
                            </h3>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 flex-grow line-clamp-2 leading-relaxed">
                          {module.description}
                        </p>
                        
                        <div className={`flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-800`}>
                          <div className={`flex items-center text-sm font-semibold ${module.textColor} ${module.hoverColor} transition-colors duration-300`}>
                            <span>开始使用</span>
                          </div>
                          <svg className={`h-4 w-4 ${module.textColor} transform group-hover:translate-x-1 transition-transform duration-300`} 
                              viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" 
                                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                                  clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. 今天创建或修改的单据 */}
          <div className="mb-8">
            {/* 刷新成功消息 */}
            {showSuccessMessage && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-800 dark:text-green-200 text-sm font-medium">
                    单据列表已成功刷新
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                今天创建或修改的单据
              </h2>
              <div className="flex items-center space-x-3">
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
              <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-800/50">
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
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
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                        onClick={() => {
                          // 根据文档类型跳转到编辑页面
                          const editPath = `/${doc.type}/edit/${doc.id}`;
                          router.push(editPath);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
                              <Icon className={`w-4 h-4 ${textColor}`} />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {getDocumentTypeName(doc.type)} - {getDocumentNumber(doc)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {doc.customerName || '未命名客户'}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(doc.updatedAt || doc.createdAt).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 p-8 text-center">
                <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                  今天还没有创建或修改的单据
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
                onClick={() => fetchUser(true)}
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