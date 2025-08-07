'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Settings } from 'lucide-react';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ModuleButton } from '@/components/dashboard/ModuleButton';
import { RecentDocumentsList } from '@/components/dashboard/RecentDocumentsList';

import { usePermissionStore } from '@/lib/permissions';
import { usePermissionRefresh } from '@/hooks/usePermissionRefresh';
import { preloadManager } from '@/utils/preloadUtils';
import { 
  QUICK_CREATE_MODULES, 
  TOOL_MODULES, 
  TOOLS_MODULES 
} from '@/constants/dashboardModules';
import { 
  getAllDocumentCounts
} from '@/utils/documentCounts';
import { buildPermissionMap } from '@/utils/mapPermissions';
import { Permission } from '@/types/permissions';
import {
  DocumentType,
  TimeFilter,
  DocumentWithType,
  loadAllDocumentsByPermissions,
  filterDocumentsByTimeRange,
  filterDocumentsByType,
  sortDocumentsByDate
} from '@/utils/dashboardUtils';

// 模块类型定义
interface DashboardModule {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  bgColor?: string;
  iconBg?: string;
  textColor?: string;
  titleColor?: string;
  shortcut?: string;
  shortcutBg?: string;
}



export default function DashboardPage() {
  // 所有 hooks 统一声明
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [recentDocuments, setRecentDocuments] = useState<DocumentWithType[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [typeFilter, setTypeFilter] = useState<'all' | DocumentType>('all');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [documentCounts, setDocumentCounts] = useState({
    quotation: 0,
    confirmation: 0,
    invoice: 0,
    packing: 0,
    purchase: 0
  });
  
  // 使用权限刷新Hook
  const { refresh: refreshPermissions } = usePermissionRefresh();
  
  // 使用全局权限store
  const { user, isLoading: _permissionLoading } = usePermissionStore();
  
  // 更新文档计数
  const updateDocumentCounts = useCallback(() => {
    const counts = getAllDocumentCounts();
    setDocumentCounts(counts);
  }, []);
  
  // 初始化文档计数
  useEffect(() => {
    if (mounted) {
      updateDocumentCounts();
    }
  }, [mounted, updateDocumentCounts]);
  
  // 优化的权限映射 - 使用新的工具函数
  const permissionMap = useMemo(() => {
    // 获取本地缓存的权限数据
    let cachedPermissions = [];
    if (typeof window !== 'undefined') {
      try {
        const userCache = localStorage.getItem('userCache');
        if (userCache) {
          const cacheData = JSON.parse(userCache);
          const isRecent = cacheData.timestamp && (Date.now() - cacheData.timestamp) < 24 * 60 * 60 * 1000;
          
          if (isRecent) {
            cachedPermissions = cacheData.permissions || [];
          }
        }
      } catch (error) {
        console.error('恢复权限数据失败:', error);
      }
    }
    
    return buildPermissionMap(
      user?.permissions,
      session?.user?.permissions,
      cachedPermissions
    );
  }, [user?.permissions, session?.user?.permissions]);

  // 优化的初始化逻辑
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
  }, []);

  // 优化的文档加载函数
  const loadDocuments = useCallback(async (filter: TimeFilter = 'today', typeFilter: 'all' | DocumentType = 'all') => {
    try {
      // 使用工具函数加载所有有权限的文档
      const allDocuments = loadAllDocumentsByPermissions(permissionMap);

      // 使用工具函数进行时间筛选
      let filteredDocuments = filterDocumentsByTimeRange(allDocuments, filter);

      // 使用工具函数进行类型筛选
      filteredDocuments = filterDocumentsByType(filteredDocuments, typeFilter);

      // 使用工具函数进行排序
      const sorted = sortDocumentsByDate(filteredDocuments);

      setRecentDocuments(sorted);
    } catch (error) {
      console.error('加载文档失败:', error);
    }
  }, [permissionMap]);

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
        updateDocumentCounts();
      }
    };

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail && (e.detail.key.includes('_history') || e.detail.key.includes('History'))) {
        loadDocuments(timeFilter, typeFilter);
        updateDocumentCounts();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [mounted, loadDocuments, timeFilter, typeFilter, updateDocumentCounts]);

  // 监听权限变化事件
  useEffect(() => {
    if (!mounted) return;

    const handlePermissionChange = (e: CustomEvent) => {
      if (showSuccessMessage) return;

      setSuccessMessage(e.detail?.message || '权限信息已更新');
      setShowSuccessMessage(true);
      
      setTimeout(() => setShowSuccessMessage(false), 3000);
    };

    window.addEventListener('permissionChanged', handlePermissionChange as EventListener);

    return () => {
      window.removeEventListener('permissionChanged', handlePermissionChange as EventListener);
    };
  }, [mounted, showSuccessMessage]);
  
  // 监听权限Store变化
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let hasTriggeredPreload = false;
    let lastPermissionsHash = '';
    let lastCheckTime = 0;
    const debounceMs = 2000;
    
    const unsubscribe = usePermissionStore.subscribe((state) => {
      if (state.user && state.user.permissions && state.user.permissions.length > 0) {
        const now = Date.now();
        
        if (now - lastCheckTime < debounceMs) {
          return;
        }
        
        lastCheckTime = now;
        
        const currentPermissionsHash = JSON.stringify(
          state.user.permissions
            .filter((p: Permission) => p.canAccess)
            .map((p: Permission) => p.moduleId)
            .sort()
        );
        
        const permissionsChanged = lastPermissionsHash !== currentPermissionsHash;
        
        if (permissionsChanged) {
          console.log('检测到权限变化，需要重新预加载', {
            oldHash: lastPermissionsHash,
            newHash: currentPermissionsHash,
            permissions: state.user.permissions.map((p: Permission) => ({ moduleId: p.moduleId, canAccess: p.canAccess }))
          });
          
          lastPermissionsHash = currentPermissionsHash;
          
          if (!hasTriggeredPreload && preloadManager.shouldPreloadBasedOnPermissions()) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              preloadManager.delayedPreload().catch(error => {
                console.error('延迟预加载失败:', error);
              });
              hasTriggeredPreload = true;
            }, 3000);
          }
        }
      }
    });
    
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // 监听权限更新事件
  useEffect(() => {
    const handlePermissionsUpdated = async (event: CustomEvent) => {
      console.log('收到权限更新事件:', event.detail);
      
      if (event.detail?.permissions) {
        try {
          setSuccessMessage('权限已更新，正在刷新页面...');
          
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          
        } catch (updateError) {
          console.error('权限更新处理失败:', updateError);
          setSuccessMessage('权限更新失败，请重试');
          setTimeout(() => setShowSuccessMessage(false), 3000);
        }
      }
    };

    window.addEventListener('permissionsUpdated', handlePermissionsUpdated as unknown as EventListener);
    
    return () => {
      window.removeEventListener('permissionsUpdated', handlePermissionsUpdated as unknown as EventListener);
    };
  }, []);

  // 优化的模块点击处理
  const handleModuleClick = useCallback((module: DashboardModule) => {
    // 对于confirmation模块，设置全局变量并跳转到报价单页面
    if (module.id === 'confirmation') {
      if (typeof window !== 'undefined') {
        (window as { __QUOTATION_TYPE__?: string }).__QUOTATION_TYPE__ = 'confirmation';
      }
    }
    
    router.push(module.path);
  }, [router]);

  // 智能预加载
  const handleModuleHover = useCallback((module: DashboardModule) => {
    router.prefetch(module.path);
  }, [router]);

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
        case 'ai-email':
          return permissionMap.permissions['ai-email'];
        default:
          return true;
      }
    });
  }, [permissionMap.permissions]);

  const availableToolsModules = useMemo(() => {
    return TOOLS_MODULES.filter(module => {
      switch (module.id) {
        case 'history':
          return permissionMap.permissions.history;
        case 'customer':
          return permissionMap.permissions.customer;
        default:
          return true;
      }
    });
  }, [permissionMap.permissions]);

  // 权限刷新处理函数
  const _handleRefreshPermissions = useCallback(async () => {
    const username = session?.user?.username || session?.user?.name;
    if (username) {
      await refreshPermissions(username);
    }
  }, [session?.user?.username, session?.user?.name, refreshPermissions]);

  // 优化的退出逻辑
  const handleLogout = useCallback(async () => {
    usePermissionStore.getState().clearUser();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userCache');
    }
    
    await signOut();
  }, []);

  // 使用 useEffect 处理重定向
  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router, mounted]);

  // 权限加载状态检查
  const isPermissionLoading = !user && status === 'loading';
  
  // 提前返回检查
  if (!mounted) return null;
  if (status === 'unauthenticated') return null;
  
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

  return (
    <div className="min-h-screen flex flex-col bg-transparent dark:bg-gray-900/20">
      <div className="flex-1">
        <Header 
          user={{
            name: user?.username || session?.user?.username || session?.user?.name || '用户',
            isAdmin: user?.isAdmin ?? session?.user?.isAdmin ?? false
          }}
          onLogout={handleLogout}
          onProfile={() => setShowProfileModal(true)}
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

        {/* Dashboard内容区域 - 设置独立背景层，防止父级背景污染 */}
        <div className="relative z-0 bg-transparent isolation isolate">
          {/* 独立背景层 - 完全隐藏，避免任何干扰 */}
          <div className="hidden" />

          <div className="relative z-10 w-full max-w-none px-2 sm:px-4 lg:px-6 xl:px-8 2xl:px-12 py-6">
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {/* 新建单据按钮 */}
                  {availableQuickCreateModules.map((module) => (
                    <ModuleButton 
                      key={module.id}
                      module={module}
                      onClick={handleModuleClick}
                      onHover={handleModuleHover}
                      quotationCount={documentCounts.quotation}
                      confirmationCount={documentCounts.confirmation}
                      invoiceCount={documentCounts.invoice}
                      packingCount={documentCounts.packing}
                      purchaseCount={documentCounts.purchase}
                    />
                  ))}
                  
                  {/* 管理中心按钮 */}
                  {availableToolsModules.slice(0, 4).map((module) => (
                    <ModuleButton 
                      key={module.id}
                      module={module}
                      onClick={handleModuleClick}
                      onHover={handleModuleHover}
                      quotationCount={documentCounts.quotation}
                      confirmationCount={documentCounts.confirmation}
                      invoiceCount={documentCounts.invoice}
                      packingCount={documentCounts.packing}
                      purchaseCount={documentCounts.purchase}
                    />
                  ))}
                  
                  {/* 实用工具按钮 */}
                  {availableToolModules.map((module) => (
                    <ModuleButton 
                      key={module.id}
                      module={module}
                      onClick={handleModuleClick}
                      onHover={handleModuleHover}
                      quotationCount={documentCounts.quotation}
                      confirmationCount={documentCounts.confirmation}
                      invoiceCount={documentCounts.invoice}
                      packingCount={documentCounts.packing}
                      purchaseCount={documentCounts.purchase}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 最近文档列表 */}
            {permissionMap.accessibleDocumentTypes.length > 0 && (
              <RecentDocumentsList
                documents={recentDocuments}
                timeFilter={timeFilter}
                typeFilter={typeFilter}
                onTimeFilterChange={setTimeFilter}
                onTypeFilterChange={setTypeFilter}
                showAllFilters={showAllFilters}
                onShowAllFiltersChange={setShowAllFilters}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* 强制 Tailwind JIT 包含所有渐变类名 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="hidden">
          bg-gradient-to-tr

          from-blue-300/80 to-blue-500/80
          from-emerald-300/80 to-emerald-500/80
          from-orange-300/80 to-orange-500/80
          from-violet-300/80 to-violet-500/80
          from-indigo-300/80 to-indigo-500/80
          from-pink-300/80 to-pink-500/80
          from-cyan-300/80 to-cyan-500/80
          from-fuchsia-300/80 to-fuchsia-500/80

          dark:from-blue-600/80 dark:to-blue-800/80
          dark:from-emerald-600/80 dark:to-emerald-800/80
          dark:from-orange-600/80 dark:to-orange-800/80
          dark:from-violet-600/80 dark:to-violet-800/80
          dark:from-indigo-600/80 dark:to-indigo-800/80
          dark:from-pink-600/80 dark:to-pink-800/80
          dark:from-cyan-600/80 dark:to-cyan-800/80
          dark:from-fuchsia-600/80 dark:to-fuchsia-800/80

          bg-white/30 bg-white/20 bg-white/40
          border-white/40 backdrop-blur-md
          bg-gray-800/80 text-gray-800
        </div>
      )}
      
      <Footer />
    </div>
  );
} 