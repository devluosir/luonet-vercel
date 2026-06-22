'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Users, 
  Building, 
  UserPlus, 
  Plus,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAppUser } from '@/hooks/useAppUser';
import { 
  CustomerTabs, 
  CustomerList, 
  SupplierList, 
  ConsigneeList, 
  CustomerModal,
  NewCustomerTracker,
  FeatureFlagManager,
  FilterChipBar
} from '../components';
import { useCustomerData, useCustomerActions, useCustomerForm, useAutoSync } from '../hooks';
import { useAnalytics, useAutoPerformanceMonitoring } from '../hooks/useAnalytics';
import { Customer, Supplier, Consignee, TabType } from '../types';
import { TimelineService, FollowUpService } from '../services/timelineService';
import type {
  CustomerFilterType,
  CustomerSortType,
  CustomerViewMode,
} from '../components/FilterChipBar';

type CustomerActivityLevel = 'high' | 'medium' | 'low';
type ConfirmState = {
  open: boolean;
  title: string;
  description: string;
  variant: 'danger' | 'default';
  resolve: (ok: boolean) => void;
} | null;

function getCustomerCount(counts: Map<string, number>, customer: Customer) {
  return counts.get(customer.id) ?? counts.get(customer.name) ?? 0;
}

function getCustomerActivityLevel(timelineCount: number, followUpCount: number): CustomerActivityLevel {
  const totalActivity = timelineCount + followUpCount;

  if (totalActivity >= 10) return 'high';
  if (totalActivity >= 5) return 'medium';
  return 'low';
}

function customerNeedsFollowUp(timelineCount: number, followUpCount: number): boolean {
  return timelineCount > 0 && followUpCount === 0;
}

function isCustomerCreatedThisMonth(customer: Customer): boolean {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const createdAt = customer.createdAt ? new Date(customer.createdAt) : null;
  return Boolean(createdAt && createdAt >= lastMonth);
}

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CustomerPage Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              页面加载出现问题
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              请刷新页面重试
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function CustomerPageContent() {
  const { data: session } = useSession();
  const { user, handleLogout } = useAppUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType | 'new_customers'>('customers');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingConsignee, setEditingConsignee] = useState<Consignee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<CustomerViewMode>('grid');
  const [activeFilter, setActiveFilter] = useState<CustomerFilterType>('all');
  const [sortBy, setSortBy] = useState<CustomerSortType>('date_desc');
  const [isClient, setIsClient] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  // 确保在客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 使用自定义hooks - 只在客户端使用
  const { customers, suppliers, consignees, isLoading, refreshData } = useCustomerData();
  const showConfirm = useCallback((opts: {
    title: string;
    description: string;
    variant?: 'danger' | 'default';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        open: true,
        title: opts.title,
        description: opts.description,
        variant: opts.variant ?? 'default',
        resolve,
      });
    });
  }, []);
  const { saveCustomer, saveSupplier, saveConsignee, deleteCustomer, deleteSupplier, deleteConsignee } = useCustomerActions(showConfirm);
  const { formData, resetForm, setFormDataForEdit, handleInputChange, validateForm } = useCustomerForm();
  
  // 启用自动同步 - 只在客户端启用
  useAutoSync();

  // 启用埋点和性能监控 - 只在客户端启用
  const analytics = useAnalytics();
  const { trackSearch } = analytics;
  useAutoPerformanceMonitoring();

  // 页面加载性能监控
  useEffect(() => {
    if (isClient && analytics.trackPageLoad) {
      const loadTime = performance.now();
      analytics.trackPageLoad(loadTime);
    }
  }, [isClient, analytics]);

  // 获取实时统计
  const getRealTimeStats = () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const recentCustomers = customers.filter(customer => {
      const createdAt = customer.createdAt ? new Date(customer.createdAt) : null;
      return createdAt && createdAt >= lastMonth;
    });

    return {
      totalCustomers: customers.length,
      totalSuppliers: suppliers.length,
      totalConsignees: consignees.length,
      recentCustomers: recentCustomers.length,
      growthRate: customers.length > 0 ? ((recentCustomers.length / customers.length) * 100).toFixed(1) : '0'
    };
  };

  const stats = getRealTimeStats();
  const timelineCounts = useMemo(() => TimelineService.getCountsByCustomer(), []);
  const followUpCounts = useMemo(() => FollowUpService.getCountsByCustomer(), []);

  const customerFilterCounts = useMemo(() => {
    return {
      highCount: customers.filter((customer) => {
        const timelineCount = getCustomerCount(timelineCounts, customer);
        const followUpCount = getCustomerCount(followUpCounts, customer);
        return getCustomerActivityLevel(timelineCount, followUpCount) === 'high';
      }).length,
      needsFollowUpCount: customers.filter((customer) => {
        const timelineCount = getCustomerCount(timelineCounts, customer);
        const followUpCount = getCustomerCount(followUpCounts, customer);
        return customerNeedsFollowUp(timelineCount, followUpCount);
      }).length,
      thisMonthCount: customers.filter(isCustomerCreatedThisMonth).length,
    };
  }, [customers, followUpCounts, timelineCounts]);

  // 处理添加新项目
  const handleAddNew = () => {
    resetForm();
    setEditingCustomer(null);
    setEditingSupplier(null);
    setEditingConsignee(null);
    setShowModal(true);

    if (activeTab === 'customers') {
      analytics.trackAddCustomer('new_customer');
    }
  };

  // 处理编辑
  const handleEdit = (item: Customer | Supplier | Consignee) => {
    setFormDataForEdit(item);

    if (activeTab === 'customers') {
      setEditingCustomer(item as Customer);
      setEditingSupplier(null);
      setEditingConsignee(null);
      analytics.trackEditCustomer(item.id, (item as Customer).name);
    } else if (activeTab === 'suppliers') {
      setEditingSupplier(item as Supplier);
      setEditingCustomer(null);
      setEditingConsignee(null);
    } else {
      setEditingConsignee(item as Consignee);
      setEditingCustomer(null);
      setEditingSupplier(null);
    }

    setShowModal(true);
  };

  // 处理删除
  const handleDelete = async (item: Customer | Supplier | Consignee) => {
    let success = false;

    if (activeTab === 'customers') {
      success = await deleteCustomer(item as Customer);
      if (success) {
        analytics.trackDeleteCustomer(item.id, (item as Customer).name);
      }
    } else if (activeTab === 'suppliers') {
      success = await deleteSupplier(item as Supplier);
    } else {
      success = await deleteConsignee(item as Consignee);
    }

    if (success) {
      refreshData();
    }
  };

  // 处理查看详情
  const handleViewDetail = (customer: Customer) => {
    const customerName = customer.name.split('\n')[0] || customer.name;
    router.push(`/customer/detail?id=${encodeURIComponent(customer.id)}&name=${encodeURIComponent(customerName)}`);
    analytics.trackViewCustomerDetail(customer.id, customerName);
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      analytics.trackValidationError('form', 'Validation failed');
      return;
    }

    let success = false;

    if (activeTab === 'customers') {
      success = await saveCustomer(formData, editingCustomer);
    } else if (activeTab === 'suppliers') {
      success = await saveSupplier(formData, editingSupplier);
    } else {
      success = await saveConsignee(formData, editingConsignee);
    }

    if (success) {
      setShowModal(false);
      resetForm();
      setEditingCustomer(null);
      setEditingSupplier(null);
      setEditingConsignee(null);
      refreshData();
    }
  };

  // 处理模态框关闭
  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
    setEditingCustomer(null);
    setEditingSupplier(null);
    setEditingConsignee(null);
  };

  const handleConfirmCancel = useCallback(() => {
    setConfirmState((state) => {
      state?.resolve(false);
      return null;
    });
  }, []);

  const handleConfirmAccept = useCallback(() => {
    setConfirmState((state) => {
      state?.resolve(true);
      return null;
    });
  }, []);

  // 处理搜索
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    trackSearch(query, customers.length);
  }, [customers.length, trackSearch]);

  // 处理标签页切换
  const handleTabChange = (tab: TabType | 'new_customers') => {
    setActiveTab(tab);
    analytics.trackSwitchTab(tab);
  };

  // 处理刷新数据
  const handleRefreshData = async () => {
    const startTime = performance.now();
    await refreshData();
    const responseTime = performance.now() - startTime;
    analytics.trackPerformance('data_refresh', responseTime);
  };

  // 如果不在客户端，显示加载状态
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-gray-600 dark:text-gray-400">正在加载...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <Users className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            请先登录
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            您需要登录才能访问客户管理功能
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '客户管理' }]}
      user={user}
      onLogout={handleLogout}
    >
      {/* 简化顶部导航栏 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 左侧：标题 */}
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                客户管理
              </h1>
            </div>

            {/* 右侧：搜索和操作 */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefreshData}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="刷新数据"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleAddNew}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>添加</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 简化统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">总客户数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCustomers}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  <span>+{stats.growthRate}% 较上月</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">供应商</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSuppliers}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">收货人</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalConsignees}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">本月新增</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recentCustomers}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  <span>+{stats.growthRate}% 较上月</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* 标签页导航 */}
          <CustomerTabs activeTab={activeTab} onTabChange={handleTabChange} />

          {activeTab === 'customers' && (
            <FilterChipBar
              total={customers.length}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              highCount={customerFilterCounts.highCount}
              needsFollowUpCount={customerFilterCounts.needsFollowUpCount}
              thisMonthCount={customerFilterCounts.thisMonthCount}
              searchQuery={searchQuery}
              onSearchChange={handleSearch}
            />
          )}

          {/* 数据列表 */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">加载中...</span>
              </div>
            ) : activeTab === 'customers' ? (
              <CustomerList
                customers={customers}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetail={handleViewDetail}
                searchQuery={searchQuery}
                viewMode={viewMode}
                activeFilter={activeFilter}
                sortBy={sortBy}
              />
            ) : activeTab === 'suppliers' ? (
              <SupplierList
                suppliers={suppliers}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ) : activeTab === 'consignees' ? (
              <ConsigneeList
                consignees={consignees}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ) : activeTab === 'new_customers' ? (
              <NewCustomerTracker onRefresh={handleRefreshData} />
            ) : null}
          </div>
        </div>

        {/* 模态框 */}
        {activeTab !== 'new_customers' && (
          <CustomerModal
            isOpen={showModal}
            onClose={handleCloseModal}
            formData={formData}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            isEditing={!!(editingCustomer || editingSupplier || editingConsignee)}
            activeTab={activeTab}
          />
        )}

        {/* 功能开关管理（仅开发环境） */}
        <FeatureFlagManager />
      </div>

      <ConfirmDialog
        open={Boolean(confirmState?.open)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        variant={confirmState?.variant ?? 'default'}
        confirmLabel={confirmState?.variant === 'danger' ? '删除' : '确认'}
        onConfirm={handleConfirmAccept}
        onCancel={handleConfirmCancel}
      />
    </AppLayout>
  );
}

export default function CustomerPage() {
  return (
    <ErrorBoundary>
      <CustomerPageContent />
    </ErrorBoundary>
  );
}
