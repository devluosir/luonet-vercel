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
  Package
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { performanceMonitor, optimizePerformance } from '@/utils/performance';
import { usePermissionStore } from '@/lib/permissions';
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

// 定义所有可用的模块
const MODULES = [
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
    id: 'quotation', 
    name: '报价及确认', 
    description: '生成报价单和销售确认单', 
    path: '/quotation',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    hoverColor: 'hover:text-blue-500 dark:hover:text-blue-300'
  },
  {
    id: 'packing',
    name: '箱单发票',
    description: '生成和管理箱单发票',
    path: '/packing',
    icon: Package,
    color: 'from-teal-500 to-teal-600',
    bgColor: 'from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20',
    textColor: 'text-teal-600 dark:text-teal-400',
    hoverColor: 'hover:text-teal-500 dark:hover:text-teal-300'
  },
  { 
    id: 'invoice', 
    name: '财务发票', 
    description: '生成和管理发票', 
    path: '/invoice',
    icon: Receipt,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    hoverColor: 'hover:text-purple-500 dark:hover:text-purple-300'
  },
  { 
    id: 'purchase', 
    name: '采购订单', 
    description: '生成给供应商的采购订单', 
    path: '/purchase',
    icon: ShoppingCart,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
    textColor: 'text-orange-600 dark:text-orange-400',
    hoverColor: 'hover:text-orange-500 dark:hover:text-orange-300'
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
  },
];

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

export default function ToolsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // 使用权限store
  const { 
    user, 
    isLoading: loading, 
    error: fetchError, 
    fetchUser, 
    hasPermission 
  } = usePermissionStore();
  
  // 使用loading作为refreshing状态
  const refreshing = loading;

  // 暂时禁用性能监控，避免无限重新渲染
  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     performanceMonitor.startTimer('tools_page_load');
  //     performanceMonitor.monitorResourceLoading();
  //     performanceMonitor.monitorApiCalls();
  //     
  //     // 性能优化
  //     optimizePerformance.optimizeFontLoading();
  //     optimizePerformance.cleanupUnusedResources();
  //   }
  // }, []);

  // 优化预加载逻辑 - 使用useCallback避免重复创建
  const prefetchPages = useCallback(() => {
    if (typeof window !== 'undefined') {
      // 只预加载最常用的页面，避免资源竞争
      const priorityPages = ['/quotation', '/invoice'];
      priorityPages.forEach(page => {
        router.prefetch(page);
      });
      
      // 延迟预加载其他页面
      setTimeout(() => {
        const secondaryPages = ['/purchase', '/history'];
        secondaryPages.forEach(page => {
          router.prefetch(page);
        });
      }, 2000); // 增加延迟时间
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    prefetchPages();
  }, [prefetchPages]);

  const handleLogout = async () => {
    // 清除权限store
    usePermissionStore.getState().clearUser();
    localStorage.removeItem('username');
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  // 使用权限store的fetchUser
  const handleRefreshPermissions = useCallback(async () => {
    try {
      // 先清除当前用户的缓存
      usePermissionStore.getState().clearUser();
      
      await fetchUser(true);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('刷新权限失败:', error);
    }
  }, [fetchUser]);

  useEffect(() => {
    if (!mounted || status === 'loading') return;

    if (!session) {
      router.push('/');
      return;
    }

    // 使用权限store获取用户信息
    fetchUser();
  }, [mounted, session, status, router, fetchUser]);

  // 使用权限store的权限检查函数
  const availableModules = useMemo(() => {
    return MODULES.filter(module => hasPermission(module.id));
  }, [hasPermission]);

  // 暂时禁用性能监控，避免无限重新渲染
  // useEffect(() => {
  //   if (mounted && !loading && user) {
  //     performanceMonitor.endTimer('tools_page_load');
  //     const metrics = performanceMonitor.getPageLoadMetrics();
  //     if (process.env.NODE_ENV === 'development') {
  //       console.log('📊 Tools页面加载性能:', metrics);
  //     }
  //   }
  // }, [mounted, loading, user]);

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
              onClick={handleRefreshPermissions}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              强制刷新
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-black">
      <div className="flex-1">
        {user && (
          <>
            <Header 
              user={{
                name: user.username,
                isAdmin: user.isAdmin
              }}
              onLogout={handleLogout}
              onProfile={() => setShowProfileModal(true)}
              onRefreshPermissions={handleRefreshPermissions}
              isRefreshing={refreshing}
              title="工具"
            />

            <ProfileModal
              isOpen={showProfileModal}
              onClose={() => setShowProfileModal(false)}
              user={user}
            />
          </>
        )}

        <div className="flex flex-col items-center justify-center w-full py-4 sm:py-6 md:py-8 lg:py-12 px-4 sm:px-6 lg:px-8 xl:px-10">
          {availableModules.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                暂无可用工具，请联系管理员分配权限
              </div>
              <button
                onClick={handleRefreshPermissions}
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
          ) : (
            <div className="w-full max-w-none px-2 sm:px-4 lg:px-6">
              {/* 成功消息 */}
              {showSuccessMessage && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                      权限信息已更新，页面即将刷新...
                    </span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                {availableModules.map((module) => {
                  const Icon = module.icon || Settings;
                  return (
                    <div
                      key={module.id}
                                        className="group relative bg-white dark:bg-[#1c1c1e] shadow-sm hover:shadow-lg 
                           rounded-xl overflow-hidden transition-all duration-300 ease-in-out
                           hover:-translate-y-2 cursor-pointer
                           border border-gray-200/50 dark:border-gray-800/50
                           hover:border-gray-300/70 dark:hover:border-gray-700/70
                           min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                           dark:focus:ring-offset-gray-900"
                      onClick={() => router.push(module.path)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push(module.path);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`打开${module.name}`}
                    >
                                        {/* 背景渐变层 */}
                  <div 
                    className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300 ease-in-out ${module.bgColor}`}
                  ></div>
                  
                  {/* 悬停时的光晕效果 */}
                  <div 
                    className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 ease-in-out bg-gradient-to-br ${module.color}`}
                  ></div>
                      
                                        <div className="p-2.5 sm:p-3 md:p-4 lg:p-5 h-full flex flex-col">
                    {/* 图标和标题 */}
                    <div className="flex items-start space-x-2.5 sm:space-x-3 md:space-x-4 mb-2 sm:mb-3">
                      <div className={`p-2 sm:p-2.5 md:p-3 lg:p-3.5 rounded-xl bg-gradient-to-br ${module.color} flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-900 dark:text-white leading-tight line-clamp-1">
                          {module.name}
                        </h3>
                      </div>
                    </div>
                    
                    {/* 描述 */}
                    <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2 sm:mb-3 flex-grow line-clamp-2 leading-relaxed">
                      {module.description}
                    </p>
                    
                    {/* 操作按钮 */}
                    <div className={`flex items-center justify-between mt-auto pt-1.5 sm:pt-2 border-t border-gray-100 dark:border-gray-800`}>
                      <div className={`flex items-center text-xs sm:text-sm md:text-base font-semibold ${module.textColor} ${module.hoverColor} transition-colors duration-300`}>
                        <span>开始使用</span>
                      </div>
                      <svg className={`h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 ${module.textColor} transform group-hover:translate-x-1 transition-transform duration-300`} 
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
        </div>
      </div>
      <Footer />
    </div>
  );
}