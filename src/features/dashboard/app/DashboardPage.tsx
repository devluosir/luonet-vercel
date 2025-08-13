'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { usePermissionStore } from '@/lib/permissions';
import { usePermissionRefresh } from '@/hooks/usePermissionRefresh';
import { preloadManager } from '@/utils/preloadUtils';
import { 
  QUICK_CREATE_MODULES, 
  TOOL_MODULES, 
  TOOLS_MODULES 
} from '@/constants/dashboardModules';

// 导入新的模块化组件
import { DashboardModules } from '@/features/dashboard/components/DashboardModules';
import { DashboardDocuments } from '@/features/dashboard/components/DashboardDocuments';
import { DashboardSuccessMessage } from '@/features/dashboard/components/DashboardSuccessMessage';
import { useDashboardState } from '@/features/dashboard/hooks/useDashboardState';
import { useDashboardPermissions } from '@/features/dashboard/hooks/useDashboardPermissions';
import { useDashboardDocuments } from '@/features/dashboard/hooks/useDashboardDocuments';
import { 
  filterQuickCreateModules, 
  filterToolModules, 
  filterToolsModules 
} from '@/features/dashboard/utils/moduleFilters';
import type { DashboardModule } from '@/features/dashboard/types';
import { ThemeDebugger } from '@/components/ThemeDebugger';


export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  
  // 使用自定义hooks管理状态
  const { 
    showSuccessMessage, 
    setShowSuccessMessage, 
    successMessage, 
    setSuccessMessage 
  } = useDashboardState();
  
  const { 
    permissionMap, 
    user, 
    isPermissionLoading 
  } = useDashboardPermissions(session);
  
  const { 
    recentDocuments, 
    timeFilter, 
    setTimeFilter, 
    typeFilter, 
    setTypeFilter, 
    showAllFilters, 
    setShowAllFilters,
    documentCounts,
    updateDocumentCounts 
  } = useDashboardDocuments(permissionMap, mounted);
  
  // 使用权限刷新Hook
  const { refresh: refreshPermissions } = usePermissionRefresh();
  
  // 初始化逻辑
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
    return filterQuickCreateModules(QUICK_CREATE_MODULES, permissionMap as any);
  }, [permissionMap]);

  const availableToolModules = useMemo(() => {
    return filterToolModules(TOOL_MODULES, permissionMap as any);
  }, [permissionMap]);

  const availableToolsModules = useMemo(() => {
    return filterToolsModules(TOOLS_MODULES, permissionMap as any);
  }, [permissionMap]);

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
            isAdmin: user?.isAdmin ?? session?.user?.isAdmin ?? false,
            email: user?.email || session?.user?.email || null
          }}
          onLogout={handleLogout}
          title="Dashboard"
          showWelcome={true}
        />

        {/* Dashboard内容区域 - 设置独立背景层，防止父级背景污染 */}
        <div className="relative z-0 bg-transparent isolation isolate">
          {/* 独立背景层 - 完全隐藏，避免任何干扰 */}
          <div className="hidden" />

          <div className="relative z-10 w-full max-w-none px-2 sm:px-4 lg:px-6 xl:px-8 2xl:px-12 py-6">
            {/* 成功消息 */}
            <DashboardSuccessMessage 
              show={showSuccessMessage}
              message={successMessage}
              onClose={() => setShowSuccessMessage(false)}
            />

            {/* 功能模块区域 */}
            <DashboardModules
              quickCreateModules={availableQuickCreateModules}
              toolModules={availableToolModules}
              toolsModules={availableToolsModules}
              documentCounts={documentCounts}
              onModuleClick={handleModuleClick}
              onModuleHover={handleModuleHover}
            />

            {/* 最近文档列表 */}
            <DashboardDocuments
              documents={recentDocuments}
              timeFilter={timeFilter}
              typeFilter={typeFilter}
              showAllFilters={showAllFilters}
              onTimeFilterChange={setTimeFilter}
              onTypeFilterChange={setTypeFilter}
              onShowAllFiltersChange={setShowAllFilters}
              permissionMap={permissionMap}
            />
          </div>
        </div>
      </div>

      <Footer />

      {/* 主题调试器 - 仅在开发环境显示 */}
      {process.env.NODE_ENV === 'development' && <ThemeDebugger />}
    </div>
  );
}
