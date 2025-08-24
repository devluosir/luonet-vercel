'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, 
  Users, 
  Building, 
  UserPlus, 
  TrendingUp, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  CustomerTabs, 
  CustomerToolbar, 
  CustomerList, 
  SupplierList, 
  ConsigneeList, 
  CustomerModal,
  NewCustomerTracker
} from '../components';
import { useCustomerData, useCustomerActions, useCustomerForm, useAutoSync } from '../hooks';
import { Customer, Supplier, Consignee, TabType } from '../types';

export default function CustomerPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType | 'new_customers'>('customers');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingConsignee, setEditingConsignee] = useState<Consignee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);

  // 使用自定义hooks
  const { customers, suppliers, consignees, isLoading, refreshData } = useCustomerData();
  const { saveCustomer, saveSupplier, saveConsignee, deleteCustomer, deleteSupplier, deleteConsignee } = useCustomerActions();
  const { formData, resetForm, setFormDataForEdit, handleInputChange, validateForm } = useCustomerForm();
  
  // 启用自动同步
  useAutoSync();

  // 获取实时统计数据
  const getRealTimeStats = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentCustomers = customers.filter(customer => {
      const createdAt = customer.createdAt ? new Date(customer.createdAt) : null;
      return createdAt && createdAt >= lastMonth;
    });

    const recentWeekCustomers = customers.filter(customer => {
      const createdAt = customer.createdAt ? new Date(customer.createdAt) : null;
      return createdAt && createdAt >= lastWeek;
    });

    // 计算需要跟进的客户
    const customersNeedingFollowUp = customers.filter(customer => {
      // 这里可以根据业务逻辑判断哪些客户需要跟进
      return true; // 简化示例
    });

    return {
      totalCustomers: customers.length,
      totalSuppliers: suppliers.length,
      totalConsignees: consignees.length,
      recentCustomers: recentCustomers.length,
      recentWeekCustomers: recentWeekCustomers.length,
      growthRate: customers.length > 0 ? ((recentCustomers.length / customers.length) * 100).toFixed(1) : '0',
      customersNeedingFollowUp: customersNeedingFollowUp.length
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
  };

  // 处理编辑
  const handleEdit = (item: Customer | Supplier | Consignee) => {
    setFormDataForEdit(item);
    
    if (activeTab === 'customers') {
      setEditingCustomer(item as Customer);
      setEditingSupplier(null);
      setEditingConsignee(null);
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
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* 顶部导航栏 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 左侧：返回按钮和标题 */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>返回</span>
              </button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6"></div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                客户管理
              </h1>
            </div>

            {/* 右侧：快速操作 */}
            <div className="flex items-center space-x-3">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索客户、供应商..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>

              {/* 刷新按钮 */}
              <button
                onClick={refreshData}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="刷新数据"
              >
                <RefreshCw className="h-5 w-5" />
              </button>

              {/* 添加按钮 */}
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
        {/* 实时统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 总客户数 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-right">
                <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+{stats.growthRate}%</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">本月增长</div>
              </div>
            </div>
            <div className="mb-2">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCustomers}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">总客户数</div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>本周新增: {stats.recentWeekCustomers}</span>
              <span>需要跟进: {stats.customersNeedingFollowUp}</span>
            </div>
          </div>

          {/* 供应商 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400">合作伙伴</div>
              </div>
            </div>
            <div className="mb-2">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalSuppliers}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">供应商</div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              活跃供应商管理
            </div>
          </div>

          {/* 收货人 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400">物流信息</div>
              </div>
            </div>
            <div className="mb-2">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalConsignees}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">收货人</div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              物流地址管理
            </div>
          </div>

          {/* 新客户 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400">本月新增</div>
              </div>
            </div>
            <div className="mb-2">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.recentCustomers}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">新客户</div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              需要跟进开发
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* 标签页导航 */}
          <CustomerTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* 工具栏 */}
          {activeTab !== 'new_customers' && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <CustomerToolbar 
                activeTab={activeTab} 
                onRefresh={refreshData} 
                onAddNew={handleAddNew} 
              />
            </div>
          )}

          {/* 数据列表 */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-ping"></div>
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 dark:text-gray-400 font-medium">加载中...</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">正在获取数据</p>
                </div>
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
              <NewCustomerTracker onRefresh={refreshData} />
            ) : null}
          </div>
        </div>

        {/* 快速操作浮动按钮 */}
        <div className="fixed bottom-6 right-6 z-20">
          <div className="relative">
            {/* 主按钮 */}
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center"
            >
              <Plus className="w-6 h-6" />
            </button>

            {/* 快速操作菜单 */}
            {showQuickActions && (
              <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-48">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                  快速操作
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveTab('customers');
                      handleAddNew();
                      setShowQuickActions(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>添加客户</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('suppliers');
                      handleAddNew();
                      setShowQuickActions(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <Building className="w-4 h-4" />
                    <span>添加供应商</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('consignees');
                      handleAddNew();
                      setShowQuickActions(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>添加收货人</span>
                  </button>
                </div>
              </div>
            )}
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
      </div>
    </div>
  );
}
