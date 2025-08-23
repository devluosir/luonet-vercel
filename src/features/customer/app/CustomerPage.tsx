'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Users, Building, UserPlus, TrendingUp } from 'lucide-react';
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

  // 使用自定义hooks
  const { customers, suppliers, consignees, isLoading, refreshData } = useCustomerData();
  const { saveCustomer, saveSupplier, saveConsignee, deleteCustomer, deleteSupplier, deleteConsignee } = useCustomerActions();
  const { formData, resetForm, setFormDataForEdit, handleInputChange, validateForm } = useCustomerForm();
  
  // 启用自动同步
  useAutoSync();

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

  // 获取统计数据
  const getStats = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
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

  const stats = getStats();

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和返回按钮 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 rounded-lg hover:bg-white dark:hover:bg-gray-800 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              返回
            </button>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              客户与供应商管理
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              全面管理您的客户关系，跟踪业务进展，提升客户服务质量
            </p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总客户数</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCustomers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600 dark:text-green-400">+{stats.growthRate}%</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">本月新增</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">供应商</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalSuppliers}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                合作伙伴管理
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">收货人</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalConsignees}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                物流信息管理
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">新客户</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.recentCustomers}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                本月新增客户
              </div>
            </div>
          </div>
        </div>

        {/* Tab切换 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
