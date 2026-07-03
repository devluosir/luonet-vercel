'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { AppLayout } from '@/components/layout';
import { usePermissionStore } from '@/lib/permissions';
import { clearD1DocumentLocalState } from '@/utils/d1Sync';
import { usePermissionRefresh } from '@/hooks/usePermissionRefresh';
import {
  QUICK_CREATE_MODULES,
  TOOL_MODULES,
  TOOLS_MODULES
} from '@/constants/dashboardModules';

// 导入新的模块化组件
import { DashboardModules } from '@/features/dashboard/components/DashboardModules';
import { DashboardDocuments } from '@/features/dashboard/components/DashboardDocuments';
import { DashboardSuccessMessage } from '@/features/dashboard/components/DashboardSuccessMessage';
import { StatsCards } from '@/features/dashboard/components/StatsCards';
import { useDashboardState } from '@/features/dashboard/hooks/useDashboardState';
import { useDashboardPermissions } from '@/features/dashboard/hooks/useDashboardPermissions';
import { useDashboardDocuments } from '@/features/dashboard/hooks/useDashboardDocuments';
import {
  filterQuickCreateModules,
  filterToolModules,
  filterToolsModules
} from '@/features/dashboard/utils/moduleFilters';
import type { DashboardModule } from '@/features/dashboard/types';
// 调试组件已移除


export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  // 使用自定义hooks管理状态
  const {
    showSuccessMessage,
    setShowSuccessMessage,
    successMessage,
    setSuccessMessage: _setSuccessMessage
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
    todayCounts,
    updateDocumentCounts: _updateDocumentCounts
  } = useDashboardDocuments(permissionMap, mounted);

  // 使用权限刷新Hook
  const { refresh: _refreshPermissions } = usePermissionRefresh();

  // 初始化逻辑
  useEffect(() => {
    setMounted(true);
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
    return filterQuickCreateModules(QUICK_CREATE_MODULES, permissionMap);
  }, [permissionMap]);

  const availableToolModules = useMemo(() => {
    return filterToolModules(TOOL_MODULES, permissionMap);
  }, [permissionMap]);

  const availableToolsModules = useMemo(() => {
    return filterToolsModules(TOOLS_MODULES, permissionMap);
  }, [permissionMap]);

  // 优化的退出逻辑
  const handleLogout = useCallback(async () => {
    usePermissionStore.getState().clearUser();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userCache');
      clearD1DocumentLocalState();
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
    <AppLayout
      breadcrumbs={[{ label: '首页' }]}
      user={{
        name: user?.username || session?.user?.username || session?.user?.name || '用户',
        isAdmin: user?.isAdmin ?? session?.user?.isAdmin ?? false,
        email: user?.email || session?.user?.email || null,
      }}
      onLogout={handleLogout}
    >
      <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 xl:px-8 2xl:px-12 py-6">
        <DashboardSuccessMessage
          show={showSuccessMessage}
          message={successMessage}
          onClose={() => setShowSuccessMessage(false)}
        />

        <StatsCards counts={todayCounts} loading={!mounted || isPermissionLoading} permissionMap={permissionMap} />

        <DashboardModules
          quickCreateModules={availableQuickCreateModules}
          toolModules={availableToolModules}
          toolsModules={availableToolsModules}
          documentCounts={documentCounts}
          onModuleClick={handleModuleClick}
          onModuleHover={handleModuleHover}
        />

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
      {/* 调试组件已移除 */}
    </AppLayout>
  );
}
