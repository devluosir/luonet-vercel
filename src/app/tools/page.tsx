'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calculator, 
  Calendar, 
  Clock, 
  FileText, 
  Settings, 
  User, 
  LogOut,
  RefreshCw,
  Bell,
  Search,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { performanceMonitor, optimizePerformance } from '@/utils/performance';
import { Header } from '@/components/Header';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { getSession } from 'next-auth/react';
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

// 定义所有可用的模块
const MODULES = [
  { 
    id: 'history', 
    name: '单据管理中心', 
    description: '管理单据历史记录', 
    path: '/history',
    icon: Settings,
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
    icon: Settings,
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
    icon: Settings,
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
    icon: Settings,
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
    icon: User,
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
    icon: Settings,
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
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 使用loading作为refreshing状态
  const refreshing = isLoading;

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
    // usePermissionStore.getState().clearUser(); // 移除此行
    if (typeof window !== 'undefined') {
      localStorage.removeItem('username');
    }
    // await signOut({ redirect: true, callbackUrl: '/' }); // 移除此行
  };

  // 权限刷新处理函数
  const handleRefreshPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setShowSuccessMessage(false);
      
      // 获取当前session信息
      const session = await getSession();
      if (!session?.user) {
        throw new Error('用户未登录');
      }
      
      // 调用权限刷新API - 使用与dashboard相同的API
      const response = await fetch('/api/auth/get-latest-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': session.user.id || session.user.username || '',
          'X-User-Name': session.user.username || session.user.name || '',
          'X-User-Admin': session.user.isAdmin ? 'true' : 'false',
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`权限刷新失败: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // 更新全局权限store
        const updatedUser = {
          id: session.user.id || session.user.username || '',
          username: session.user.username || session.user.name || '',
          email: session.user.email || null,
          status: true,
          isAdmin: session.user.isAdmin || false,
          permissions: data.permissions
        };
        
        // 更新全局权限store
        usePermissionStore.getState().setUser(updatedUser);
        
        // 保存到本地存储
        if (typeof window !== 'undefined') {
          localStorage.setItem('latestPermissions', JSON.stringify(data.permissions));
          localStorage.setItem('permissionsTimestamp', Date.now().toString());
          localStorage.setItem('userInfo', JSON.stringify(updatedUser));
        }

        // 触发权限变化事件，通知其他组件
        window.dispatchEvent(new CustomEvent('permissionChanged', {
          detail: {
            message: '权限信息已更新',
            permissions: data.permissions
          }
        }));
        
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } else {
        throw new Error(data.error || '权限刷新失败');
      }
    } catch (error) {
      console.error('刷新权限失败:', error);
      setShowSuccessMessage(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    // 移除登录检查，因为中间件已经处理了认证
    // if (!session) {
    //   router.push('/');
    //   return;
    // }
  }, [mounted]);

  // 使用session中的权限信息进行权限检查
  const hasPermission = useCallback((moduleId: string): boolean => {
    // 移除此行
    return true;
  }, []);

  // 使用session中的权限信息过滤可用模块
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

  // 移除登录检查，因为中间件已经处理了认证
  // if (!session?.user) {
  //   return null;
  // }

  // 如果没有权限信息，显示提示而不是错误
  // if (!session?.user?.permissions) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-600 dark:text-gray-400 mb-4">暂无权限信息</div>
      </div>
    </div>
  );
}