'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, 
  Users, 
  Building, 
  UserPlus, 
  Plus,
  Search,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  CustomerTabs, 
  CustomerList, 
  SupplierList, 
  ConsigneeList, 
  CustomerModal,
  NewCustomerTracker,
  FeatureFlagManager
} from '../components';
import { useCustomerData, useCustomerActions, useCustomerForm, useAutoSync } from '../hooks';
import { useAnalytics, useAutoPerformanceMonitoring } from '../hooks/useAnalytics';
import { Customer, Supplier, Consignee, TabType } from '../types';

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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType | 'new_customers'>('customers');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingConsignee, setEditingConsignee] = useState<Consignee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);

  // 确保在客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 使用自定义hooks - 只在客户端使用
  const { customers, suppliers, consignees, isLoading, refreshData } = useCustomerData();
  const { saveCustomer, saveSupplier, saveConsignee, deleteCustomer, deleteSupplier, deleteConsignee } = useCustomerActions();
  const { formData, resetForm, setFormDataForEdit, handleInputChange, validateForm } = useCustomerForm();
  
  // 启用自动同步 - 只在客户端启用
  useAutoSync();

  // 启用埋点和性能监控 - 只在客户端启用
  const analytics = useAnalytics();
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
    router.push(`/customer/detail?id=${encodeURIComponent(customer.name)}&name=${encodeURIComponent(customerName)}`);
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

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    const filteredCustomers = customers.filter(customer => {
      if (!query) return true;
      const searchLower = query.toLowerCase();
      return customer.name.toLowerCase().includes(searchLower);
    });

    analytics.trackSearch(query, filteredCustomers.length);
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 简化顶部导航栏 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 左侧：返回和标题 */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>返回</span>
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                客户管理
              </h1>
            </div>

            {/* 右侧：搜索和操作 */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索客户、供应商..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
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
    </div>
  );
}

export default function CustomerPage() {
  return (
    <ErrorBoundary>
      <CustomerPageContent />
    </ErrorBoundary>
  );
}
