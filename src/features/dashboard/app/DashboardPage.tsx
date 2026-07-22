'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppLayout } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
import { usePermissionRefresh } from '@/hooks/usePermissionRefresh';

// 导入新的模块化组件
import { DashboardDocuments } from '@/features/dashboard/components/DashboardDocuments';
import { DashboardSuccessMessage } from '@/features/dashboard/components/DashboardSuccessMessage';
import { InquiryOrderStats } from '@/features/dashboard/components/InquiryOrderStats';
import { DashboardTrendSection } from '@/features/dashboard/components/DashboardTrendSection';
import { useDashboardState } from '@/features/dashboard/hooks/useDashboardState';
import { useDashboardPermissions } from '@/features/dashboard/hooks/useDashboardPermissions';
import { useDashboardDocuments } from '@/features/dashboard/hooks/useDashboardDocuments';
import { useInquiryOrderStats, type TrendSource } from '@/features/dashboard/hooks/useInquiryOrderStats';
import type { Granularity } from '@/features/dashboard/utils/inquiryStats';
import { syncInquiryNow } from '@/features/inquiry/hooks/useInquirySync';
// 调试组件已移除


export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { handleLogout } = useAppUser();
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
    updateDocumentCounts: _updateDocumentCounts
  } = useDashboardDocuments(permissionMap, mounted);

  // 使用权限刷新Hook
  const { refresh: _refreshPermissions } = usePermissionRefresh();

  // 询价/订单统计 + 趋势图（inquiry 权限→总询价订单统计图；purchaseRegistration 权限→采购部询价订单统计图；
  // 两者都有时首页趋势图区域会显示 tab 切换，见 DashboardTrendSection，TASK-113）。
  // trendSource 是"当前激活哪张表"的唯一状态源，趋势图 tab 和上方"本周/本月"统计区域共用同一个值，
  // 保证切换 tab 时两块内容一起联动（首页细化需求）。
  const [trendGranularity, setTrendGranularity] = useState<Granularity>('month');
  const [trendSource, setTrendSource] = useState<TrendSource>('inquiry');
  const hasInquiryAccess = permissionMap.permissions.inquiry;
  const hasPurchaseAccess = permissionMap.permissions.purchaseRegistration;
  // 只有一个权限时没有 tab 可切，统计区域固定跟着那一个权限对应的表，不受 trendSource 默认值影响
  const effectiveTrendSource: TrendSource =
    hasInquiryAccess && hasPurchaseAccess ? trendSource : hasPurchaseAccess ? 'purchase' : 'inquiry';
  const inquiryOrderStats = useInquiryOrderStats(hasInquiryAccess, trendGranularity, 'inquiry');
  const purchaseOrderStats = useInquiryOrderStats(hasPurchaseAccess, trendGranularity, 'purchase');
  const activeOrderStats = effectiveTrendSource === 'purchase' ? purchaseOrderStats : inquiryOrderStats;
  const isRefreshingStats = useRef(false);
  const [refreshingStats, setRefreshingStats] = useState(false);

  const handleRefreshStats = useCallback(async () => {
    if (isRefreshingStats.current || (!hasInquiryAccess && !hasPurchaseAccess)) return;

    isRefreshingStats.current = true;
    setRefreshingStats(true);
    try {
      await syncInquiryNow({
        mergeLocal: hasInquiryAccess,
        pushLocal: hasInquiryAccess,
      });
    } catch {
      // 静默失败，保留刷新前的统计数据
    } finally {
      isRefreshingStats.current = false;
      setRefreshingStats(false);
    }
  }, [hasInquiryAccess, hasPurchaseAccess]);

  // 初始化逻辑
  useEffect(() => {
    setMounted(true);
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

        {(hasInquiryAccess || hasPurchaseAccess) && (
          <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <InquiryOrderStats
              visible
              loading={!mounted || isPermissionLoading || !activeOrderStats.mounted}
              month={activeOrderStats.month}
              source={effectiveTrendSource}
              onRefresh={handleRefreshStats}
              refreshing={refreshingStats}
            />
          </div>
        )}

        <DashboardTrendSection
          inquiryVisible={hasInquiryAccess}
          purchaseVisible={hasPurchaseAccess}
          granularity={trendGranularity}
          onGranularityChange={setTrendGranularity}
          inquiryData={inquiryOrderStats.trend}
          purchaseData={purchaseOrderStats.trend}
          activeSource={trendSource}
          onActiveSourceChange={setTrendSource}
        />

        {permissionMap.permissions.history && (
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
        )}
      </div>
      {/* 调试组件已移除 */}
    </AppLayout>
  );
}
