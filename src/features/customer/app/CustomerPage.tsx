'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  CustomerTabs, 
  CustomerToolbar, 
  CustomerList, 
  SupplierList, 
  ConsigneeList, 
  CustomerModal 
} from '../components';
import { useCustomerData, useCustomerActions, useCustomerForm } from '../hooks';
import { Customer, Supplier, Consignee, TabType } from '../types';

export default function CustomerPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('customers');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingConsignee, setEditingConsignee] = useState<Consignee | null>(null);

  // 使用自定义hooks
  const { customers, suppliers, consignees, isLoading, refreshData } = useCustomerData();
  const { saveCustomer, saveSupplier, saveConsignee, deleteCustomer, deleteSupplier, deleteConsignee } = useCustomerActions();
  const { formData, resetForm, setFormDataForEdit, handleInputChange, validateForm } = useCustomerForm();

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            请先登录
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            您需要登录才能访问客户管理功能
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和返回按钮 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
              返回
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            客户与供应商管理
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            管理您的客户和供应商信息
          </p>
        </div>

        {/* Tab切换 */}
        <CustomerTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* 工具栏 */}
        <CustomerToolbar 
          activeTab={activeTab} 
          onRefresh={refreshData} 
          onAddNew={handleAddNew} 
        />

        {/* 数据列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">加载中...</p>
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
          ) : (
            <ConsigneeList 
              consignees={consignees} 
              onEdit={handleEdit} 
              onDelete={handleDelete} 
            />
          )}
        </div>

        {/* 模态框 */}
        <CustomerModal
          isOpen={showModal}
          onClose={handleCloseModal}
          formData={formData}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          isEditing={!!(editingCustomer || editingSupplier || editingConsignee)}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
}
