'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Building2, FileText, Package, Receipt, ShoppingCart, ArrowLeft, Edit, ChevronRight, Settings, Trash2, X, Check, Save, User } from 'lucide-react';
import { usePermissionStore } from '@/lib/permissions';
import { format } from 'date-fns';

// 修改客户/供应商信息接口
interface DocumentInfo {
  id: string;
  type: 'quotation' | 'confirmation' | 'packing' | 'invoice';
  number: string;
  date: Date;
}

interface CustomerInfo {
  name: string;
  quotationCount: number;
  confirmationCount: number;
  packingCount: number;
  invoiceCount: number;
  lastUpdated: Date;
  documents: DocumentInfo[];
}

interface SupplierInfo {
  name: string;
  purchaseCount: number;
  lastUpdated: Date;
  documents: { id: string; number: string; date: Date; }[];
}

export default function CustomerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [mounted, setMounted] = useState(false);
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>([]);
  const { user, hasPermission } = usePermissionStore();

  // 设置相关状态
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // 编辑客户相关状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerInfo | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    originalName: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  // 编辑供应商相关状态
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierInfo | null>(null);
  const [editSupplierForm, setEditSupplierForm] = useState({
    name: '',
    originalName: ''
  });
  const [editSupplierLoading, setEditSupplierLoading] = useState(false);

  // 加载客户和供应商数据
  useEffect(() => {
    if (!mounted) return;

    const loadData = () => {
      try {
        // 从localStorage加载历史记录
        const quotationHistory = JSON.parse(localStorage.getItem('quotation_history') || '[]');
        const packingHistory = JSON.parse(localStorage.getItem('packing_history') || '[]');
        const invoiceHistory = JSON.parse(localStorage.getItem('invoice_history') || '[]');
        const purchaseHistory = JSON.parse(localStorage.getItem('purchase_history') || '[]');



        // 过滤掉无效的记录
        const validQuotationHistory = quotationHistory.filter((doc: any) => {
          // 检查记录是否有效
          const isValid = doc && 
            typeof doc === 'object' && 
            (doc.customerName || doc.quotationNo); // 至少要有客户名称或报价单号


          return isValid;
        });



        // 合并所有历史记录并按时间排序
        const allRecords = [
          ...validQuotationHistory.map((doc: any) => {
            // 检查是否是确认单
            const isConfirmation = doc.type === 'confirmation' || (doc.data && doc.data.type === 'confirmation');
            return {
              ...doc,
              type: isConfirmation ? 'confirmation' : 'quotation'
            };
          }),
          ...packingHistory.map((doc: any) => ({ ...doc, type: 'packing' })),
          ...invoiceHistory.map((doc: any) => ({ ...doc, type: 'invoice' }))
        ].sort((a, b) => {
          const dateA = new Date(a.date || a.updatedAt || a.createdAt);
          const dateB = new Date(b.date || b.updatedAt || b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });



        // 统一处理客户名称格式
        const normalizeCustomerName = (name: string) => {
          if (!name || typeof name !== 'string') {
            return '未命名客户';
          }
          const normalized = name
            .trim()
            .replace(/\s+/g, ' ') // 将多个空格替换为单个空格
            .toUpperCase(); // 转换为大写

          return normalized;
        };

        // 统计客户数据
        const customerMap = new Map<string, CustomerInfo>();
        
        // 处理所有记录
        allRecords.forEach((doc: any) => {
          // 检查记录的有效性
          if (!doc || typeof doc !== 'object') {
            return;
          }

          let rawCustomerName;
          if (doc.type === 'packing') {
            rawCustomerName = doc.consigneeName || doc.customerName || '未命名客户';
          } else {
            rawCustomerName = doc.customerName || '未命名客户';
          }
          
          // 如果客户名称为空或无效，跳过该记录
          if (!rawCustomerName || rawCustomerName === '未命名客户') {
            return;
          }

          const customerName = normalizeCustomerName(rawCustomerName);

          
          if (!customerMap.has(customerName)) {
            customerMap.set(customerName, {
              name: rawCustomerName,
              quotationCount: 0,
              confirmationCount: 0,
              packingCount: 0,
              invoiceCount: 0,
              lastUpdated: new Date(doc.date || doc.updatedAt || doc.createdAt),
              documents: []
            });
          }

          const customer = customerMap.get(customerName)!;
          
          // 获取单据编号
          let documentNumber = '';
          let documentType = doc.type;

          switch (documentType) {
            case 'quotation':
              documentNumber = doc.quotationNo || '-';
              customer.quotationCount++;
              break;
            case 'confirmation':
              // 确认单只显示contractNo
              documentNumber = doc.data?.contractNo || '-';
              customer.confirmationCount++;
              break;
            case 'packing':
              documentNumber = doc.invoiceNo || '-';
              customer.packingCount++;
              break;
            case 'invoice':
              documentNumber = doc.invoiceNo || '-';
              customer.invoiceCount++;
              break;
          }

          // 添加文档信息
          customer.documents.push({
            id: doc.id || '',
            type: documentType,
            number: documentNumber,
            date: new Date(doc.date || doc.updatedAt || doc.createdAt)
          });
          
          // 更新最后更新时间
          const docDate = new Date(doc.date || doc.updatedAt || doc.createdAt);
          if (docDate > customer.lastUpdated) {
            customer.lastUpdated = docDate;
            // 使用最新记录的原始名称
            customer.name = rawCustomerName;
          }
        });

        console.log('Final Customer Map:', Array.from(customerMap.entries()));

        // 统计供应商数据
        const supplierMap = new Map<string, SupplierInfo>();
        
        // 处理采购订单
        purchaseHistory.forEach((doc: any) => {
          const rawSupplierName = doc.supplierName || '未命名供应商';
          const supplierName = normalizeCustomerName(rawSupplierName);
          
          if (!supplierMap.has(supplierName)) {
            supplierMap.set(supplierName, {
              name: rawSupplierName,
              purchaseCount: 0,
              lastUpdated: new Date(doc.date || doc.updatedAt || doc.createdAt),
              documents: []
            });
          }

          const supplier = supplierMap.get(supplierName)!;
          supplier.purchaseCount++;
          
          // 添加文档信息
          supplier.documents.push({
            id: doc.id || '',
            number: doc.orderNo || '',
            date: new Date(doc.date || doc.updatedAt || doc.createdAt)
          });

          // 更新最后更新时间
          const docDate = new Date(doc.date || doc.updatedAt || doc.createdAt);
          if (docDate > supplier.lastUpdated) {
            supplier.lastUpdated = docDate;
            // 使用最新记录的原始名称
            supplier.name = rawSupplierName;
          }
        });

        // 转换为数组并按最后更新时间排序
        const sortedCustomers = Array.from(customerMap.values())
          .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
        
        console.log('Sorted Customers:', sortedCustomers);
        
        setCustomers(sortedCustomers);
        setSuppliers(Array.from(supplierMap.values())
          .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()));

      } catch (error) {
        console.error('加载数据失败:', error);
      }
    };

    loadData();

    // 监听localStorage变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.includes('_history')) {
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customStorageChange', handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customStorageChange', handleStorageChange as EventListener);
    };
  }, [mounted]);

  // 初始化
  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理文档选择
  const handleDocumentSelect = (documentId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    const allDocumentIds = customers.flatMap(customer => 
      customer.documents.map(doc => doc.id)
    );
    
    if (selectedDocuments.size === allDocumentIds.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(allDocumentIds));
    }
  };

  // 删除选中的文档
  const handleDeleteSelected = async () => {
    if (selectedDocuments.size === 0) return;

    setDeleteLoading(true);
    try {
      // 获取所有历史记录
      const quotationHistory = JSON.parse(localStorage.getItem('quotation_history') || '[]');
      const packingHistory = JSON.parse(localStorage.getItem('packing_history') || '[]');
      const invoiceHistory = JSON.parse(localStorage.getItem('invoice_history') || '[]');

      // 过滤掉选中的文档
      const newQuotationHistory = quotationHistory.filter((doc: any) => !selectedDocuments.has(doc.id));
      const newPackingHistory = packingHistory.filter((doc: any) => !selectedDocuments.has(doc.id));
      const newInvoiceHistory = invoiceHistory.filter((doc: any) => !selectedDocuments.has(doc.id));

      // 更新localStorage
      localStorage.setItem('quotation_history', JSON.stringify(newQuotationHistory));
      localStorage.setItem('packing_history', JSON.stringify(newPackingHistory));
      localStorage.setItem('invoice_history', JSON.stringify(newInvoiceHistory));

      // 触发自定义事件通知其他组件
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: 'history_updated' }
      }));

      // 清空选择
      setSelectedDocuments(new Set());
      setShowDeleteConfirm(false);
      
      // 显示成功消息
      alert(`成功删除 ${selectedDocuments.size} 个文档`);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 打开编辑客户模态框
  const handleEditCustomer = (customer: CustomerInfo) => {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name,
      originalName: customer.name
    });
    setShowEditModal(true);
  };

  // 保存客户信息修改
  const handleSaveCustomerEdit = async () => {
    if (!editingCustomer || !editForm.name.trim()) {
      alert('请输入有效的客户名称');
      return;
    }

    setEditLoading(true);
    try {
      // 获取所有历史记录
      const quotationHistory = JSON.parse(localStorage.getItem('quotation_history') || '[]');
      const packingHistory = JSON.parse(localStorage.getItem('packing_history') || '[]');
      const invoiceHistory = JSON.parse(localStorage.getItem('invoice_history') || '[]');

      // 更新所有相关文档中的客户名称
      const updateCustomerName = (docs: any[], oldName: string, newName: string) => {
        return docs.map((doc: any) => {
          if (doc.customerName === oldName) {
            return { ...doc, customerName: newName };
          }
          if (doc.consigneeName === oldName) {
            return { ...doc, consigneeName: newName };
          }
          return doc;
        });
      };

      // 更新各个历史记录
      const updatedQuotationHistory = updateCustomerName(quotationHistory, editForm.originalName, editForm.name);
      const updatedPackingHistory = updateCustomerName(packingHistory, editForm.originalName, editForm.name);
      const updatedInvoiceHistory = updateCustomerName(invoiceHistory, editForm.originalName, editForm.name);

      // 保存到localStorage
      localStorage.setItem('quotation_history', JSON.stringify(updatedQuotationHistory));
      localStorage.setItem('packing_history', JSON.stringify(updatedPackingHistory));
      localStorage.setItem('invoice_history', JSON.stringify(updatedInvoiceHistory));

      // 触发自定义事件通知其他组件
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: 'history_updated' }
      }));

      // 关闭模态框
      setShowEditModal(false);
      setEditingCustomer(null);
      setEditForm({ name: '', originalName: '' });
      
      // 显示成功消息
      alert(`客户信息已更新，共更新了 ${editingCustomer.documents.length} 个相关文档`);
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setEditLoading(false);
    }
  };

  // 打开编辑供应商模态框
  const handleEditSupplier = (supplier: SupplierInfo) => {
    setEditingSupplier(supplier);
    setEditSupplierForm({
      name: supplier.name,
      originalName: supplier.name
    });
    setShowEditSupplierModal(true);
  };

  // 保存供应商信息修改
  const handleSaveSupplierEdit = async () => {
    if (!editingSupplier || !editSupplierForm.name.trim()) {
      alert('请输入有效的供应商名称');
      return;
    }

    setEditSupplierLoading(true);
    try {
      // 获取采购订单历史记录
      const purchaseHistory = JSON.parse(localStorage.getItem('purchase_history') || '[]');

      // 更新所有相关文档中的供应商名称
      const updatedPurchaseHistory = purchaseHistory.map((doc: any) => {
        if (doc.supplierName === editSupplierForm.originalName) {
          return { ...doc, supplierName: editSupplierForm.name };
        }
        return doc;
      });

      // 保存到localStorage
      localStorage.setItem('purchase_history', JSON.stringify(updatedPurchaseHistory));

      // 触发自定义事件通知其他组件
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: 'history_updated' }
      }));

      // 关闭模态框
      setShowEditSupplierModal(false);
      setEditingSupplier(null);
      setEditSupplierForm({ name: '', originalName: '' });
      
      // 显示成功消息
      alert(`供应商信息已更新，共更新了 ${editingSupplier.documents.length} 个相关文档`);
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setEditSupplierLoading(false);
    }
  };

  // 避免闪烁
  if (!mounted || status === 'loading') {
    return null;
  }

  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-black">
      <main className="flex-1">
        <div className="w-full max-w-none px-2 sm:px-3 lg:px-4 py-3 sm:py-4 lg:py-6">
          {/* 返回按钮和设置按钮 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-3 lg:gap-4">
            <Link 
              href="/dashboard"
              className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7] 
                text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>

            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                bg-white dark:bg-[#1c1c1e] border border-gray-300 dark:border-gray-600 rounded-lg 
                hover:bg-gray-50 dark:hover:bg-[#2c2c2e] focus:outline-none focus:ring-2 focus:ring-blue-500
                w-full sm:w-auto justify-center"
            >
              <Settings className="w-4 h-4 mr-2" />
              {activeTab === 'customer' ? '客户文档管理' : '供应商文档管理'}
            </button>
          </div>

          {/* Tab切换 */}
          <div className="mt-4 sm:mt-6 lg:mt-6">
            <div className="border-b border-gray-200 dark:border-gray-800">
              <nav className="-mb-px flex space-x-4 sm:space-x-6 lg:space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('customer')}
                  className={`
                    ${activeTab === 'customer'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                    }
                    whitespace-nowrap py-3 sm:py-3 lg:py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                    flex-1 sm:flex-none justify-center sm:justify-start
                  `}
                >
                  <Users className="w-4 h-4 sm:w-4 lg:w-5 lg:h-5" />
                  <span>客户</span>
                </button>

                <button
                  onClick={() => setActiveTab('supplier')}
                  className={`
                    ${activeTab === 'supplier'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                    }
                    whitespace-nowrap py-3 sm:py-3 lg:py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                    flex-1 sm:flex-none justify-center sm:justify-start
                  `}
                >
                  <Building2 className="w-4 h-4 sm:w-4 lg:w-5 lg:h-5" />
                  <span>供应商</span>
                </button>
              </nav>
            </div>
          </div>

          {/* 客户列表 */}
          {activeTab === 'customer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mt-4 sm:mt-6 lg:mt-6">
              {customers.map((customer) => (
                <div
                  key={customer.name}
                  className="bg-white dark:bg-[#1c1c1e] rounded-xl sm:rounded-xl lg:rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 
                    hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* 客户信息头部 */}
                  <div className="p-3 sm:p-4 lg:p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 lg:gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {customer.name.split('\n')[0]}
                        </h3>
                        {customer.name.split('\n').length > 1 && (
                          <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line line-clamp-2">
                            {customer.name.split('\n').slice(1).join('\n')}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="inline-flex items-center px-2 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 
                            bg-white dark:bg-[#1c1c1e] border border-gray-300 dark:border-gray-600 rounded-lg 
                            hover:bg-gray-50 dark:hover:bg-[#2c2c2e] focus:outline-none focus:ring-2 focus:ring-blue-500
                            transition-all duration-200"
                        >
                          <Edit className="w-3 h-3 sm:w-3 lg:w-4 lg:h-4 mr-1 sm:mr-1 lg:mr-2" />
                          <span className="hidden sm:inline">编辑</span>
                        </button>
                        
                        <div className="flex items-center space-x-1 sm:space-x-1.5 lg:space-x-2">
                          {customer.quotationCount > 0 && (
                            <div className="relative group">
                              <div className="flex items-center justify-center w-5 h-5 sm:w-6 lg:w-7 lg:h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 
                                border border-blue-100 dark:border-blue-800">
                                <FileText className="w-2.5 h-2.5 sm:w-3 lg:w-3.5 lg:h-3.5 text-blue-600 dark:text-blue-400" />
                                <div className="absolute -top-1 -right-1 sm:-top-1 lg:-top-1.5 lg:-right-1.5 w-3.5 h-3.5 sm:w-4 lg:w-4.5 lg:h-4.5 rounded-full bg-blue-600 dark:bg-blue-500 
                                  flex items-center justify-center">
                                  <span className="text-xs font-medium text-white">{customer.quotationCount}</span>
                                </div>
                              </div>
                              <div className="absolute -bottom-6 sm:-bottom-7 lg:-bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 
                                text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                报价
                              </div>
                            </div>
                          )}

                          {customer.confirmationCount > 0 && (
                            <div className="relative group">
                              <div className="flex items-center justify-center w-5 h-5 sm:w-6 lg:w-7 lg:h-7 rounded-lg bg-green-50 dark:bg-green-900/20 
                                border border-green-100 dark:border-green-800">
                                <FileText className="w-2.5 h-2.5 sm:w-3 lg:w-3.5 lg:h-3.5 text-green-600 dark:text-green-400" />
                                <div className="absolute -top-1 -right-1 sm:-top-1 lg:-top-1.5 lg:-right-1.5 w-3.5 h-3.5 sm:w-4 lg:w-4.5 lg:h-4.5 rounded-full bg-green-600 dark:bg-green-500 
                                  flex items-center justify-center">
                                  <span className="text-xs font-medium text-white">{customer.confirmationCount}</span>
                                </div>
                              </div>
                              <div className="absolute -bottom-6 sm:-bottom-7 lg:-bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 
                                text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                确认
                              </div>
                            </div>
                          )}

                          {customer.packingCount > 0 && (
                            <div className="relative group">
                              <div className="flex items-center justify-center w-5 h-5 sm:w-6 lg:w-7 lg:h-7 rounded-lg bg-teal-50 dark:bg-teal-900/20 
                                border border-teal-100 dark:border-teal-800">
                                <Package className="w-2.5 h-2.5 sm:w-3 lg:w-3.5 lg:h-3.5 text-teal-600 dark:text-teal-400" />
                                <div className="absolute -top-1 -right-1 sm:-top-1 lg:-top-1.5 lg:-right-1.5 w-3.5 h-3.5 sm:w-4 lg:w-4.5 lg:h-4.5 rounded-full bg-teal-600 dark:bg-teal-500 
                                  flex items-center justify-center">
                                  <span className="text-xs font-medium text-white">{customer.packingCount}</span>
                                </div>
                              </div>
                              <div className="absolute -bottom-6 sm:-bottom-7 lg:-bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 
                                text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                装箱
                              </div>
                            </div>
                          )}

                          {customer.invoiceCount > 0 && (
                            <div className="relative group">
                              <div className="flex items-center justify-center w-5 h-5 sm:w-6 lg:w-7 lg:h-7 rounded-lg bg-purple-50 dark:bg-purple-900/20 
                                border border-purple-100 dark:border-purple-800">
                                <Receipt className="w-2.5 h-2.5 sm:w-3 lg:w-3.5 lg:h-3.5 text-purple-600 dark:text-purple-400" />
                                <div className="absolute -top-1 -right-1 sm:-top-1 lg:-top-1.5 lg:-right-1.5 w-3.5 h-3.5 sm:w-4 lg:w-4.5 lg:h-4.5 rounded-full bg-purple-600 dark:bg-purple-500 
                                  flex items-center justify-center">
                                  <span className="text-xs font-medium text-white">{customer.invoiceCount}</span>
                                </div>
                              </div>
                              <div className="absolute -bottom-6 sm:-bottom-7 lg:-bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 
                                text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                开票
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 单据列表 */}
                  <div className="p-2 sm:p-3 lg:p-4">
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:gap-3">
                      {customer.documents
                        .sort((a, b) => b.date.getTime() - a.date.getTime())
                        .map((doc) => {
                          // 根据文档类型确定编辑链接和样式
                          const editLink = 
                            doc.type === 'quotation' ? `/quotation/edit/${doc.id}` :
                            doc.type === 'confirmation' ? `/quotation/edit/${doc.id}` :
                            doc.type === 'packing' ? `/packing/edit/${doc.id}` :
                            doc.type === 'invoice' ? `/invoice/edit/${doc.id}` : '';

                          // 根据文档类型设置颜色
                          const colors = {
                            quotation: {
                              bg: 'bg-blue-100 dark:bg-blue-900/30',
                              text: 'text-blue-600 dark:text-blue-400',
                              hover: 'hover:bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20'
                            },
                            confirmation: {
                              bg: 'bg-green-100 dark:bg-green-900/30',
                              text: 'text-green-600 dark:text-green-400',
                              hover: 'hover:bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20'
                            },
                            packing: {
                              bg: 'bg-teal-100 dark:bg-teal-900/30',
                              text: 'text-teal-600 dark:text-teal-400',
                              hover: 'hover:bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20'
                            },
                            invoice: {
                              bg: 'bg-purple-100 dark:bg-purple-900/30',
                              text: 'text-purple-600 dark:text-purple-400',
                              hover: 'hover:bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20'
                            }
                          };

                          const color = colors[doc.type as keyof typeof colors] || colors.quotation;

                          return (
                            <Link 
                              key={doc.id}
                              href={editLink}
                              className={`group bg-white dark:bg-[#1c1c1e] p-1.5 sm:p-2 lg:p-2.5 flex items-center space-x-1.5 sm:space-x-2 lg:space-x-2.5 rounded-lg sm:rounded-lg lg:rounded-xl
                                hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer
                                active:shadow-sm hover:border-gray-300/70 dark:hover:border-gray-700/70 ${color.hover}`}
                            >
                              <div className={`w-5 h-5 sm:w-6 lg:w-6 lg:h-6 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0
                                group-hover:scale-110 transition-transform duration-200`}>
                                <span className={`text-xs font-medium ${color.text}`}>
                                  {doc.type === 'quotation' ? 'QTN' : 
                                   doc.type === 'confirmation' ? 'SC' : 
                                   doc.type === 'packing' ? 'PL' : 
                                   'INV'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs sm:text-sm lg:text-sm font-medium text-gray-900 dark:text-white truncate
                                  transition-colors duration-200 ${color.text}`}>
                                  {doc.number}
                                </div>
                              </div>
                              {/* 添加一个微妙的箭头指示器 */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                                <ChevronRight className="w-3 h-3 sm:w-3 lg:w-3.5 lg:h-3.5 text-gray-400 dark:text-gray-500" />
                              </div>
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ))}

              {customers.length === 0 && (
                <div className="col-span-full">
                  <div className="text-center py-6 sm:py-8 lg:py-10 bg-white dark:bg-[#1c1c1e] rounded-xl sm:rounded-xl lg:rounded-2xl border border-gray-200/50 dark:border-gray-800/50">
                    <Users className="mx-auto h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400" />
                    <h3 className="mt-3 sm:mt-4 lg:mt-4 text-sm sm:text-base lg:text-lg font-medium text-gray-900 dark:text-white">暂无客户</h3>
                    <p className="mt-1 sm:mt-2 lg:mt-2 text-xs sm:text-sm lg:text-sm text-gray-500 dark:text-gray-400">
                      创建单据时会自动添加客户信息
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 供应商列表 */}
          {activeTab === 'supplier' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mt-4 sm:mt-6 lg:mt-6">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.name}
                  className="bg-white dark:bg-[#1c1c1e] rounded-xl sm:rounded-xl lg:rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 
                    hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* 供应商信息头部 */}
                  <div className="p-3 sm:p-4 lg:p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 lg:gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {supplier.name.split('\n')[0]}
                        </h3>
                        {supplier.name.split('\n').length > 1 && (
                          <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line line-clamp-2">
                            {supplier.name.split('\n').slice(1).join('\n')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <button
                          onClick={() => handleEditSupplier(supplier)}
                          className="inline-flex items-center px-2 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 
                            bg-white dark:bg-[#1c1c1e] border border-gray-300 dark:border-gray-600 rounded-lg 
                            hover:bg-gray-50 dark:hover:bg-[#2c2c2e] focus:outline-none focus:ring-2 focus:ring-orange-500
                            transition-all duration-200"
                        >
                          <Edit className="w-3 h-3 sm:w-3 lg:w-4 lg:h-4 mr-1 sm:mr-1 lg:mr-2" />
                          <span className="hidden sm:inline">编辑</span>
                        </button>
                        
                        <div className="flex items-center justify-end">
                          <div className="relative group">
                            <div className="flex items-center justify-center w-5 h-5 sm:w-6 lg:w-7 lg:h-7 rounded-lg bg-orange-50 dark:bg-orange-900/20 
                              border border-orange-100 dark:border-orange-800">
                              <ShoppingCart className="w-2.5 h-2.5 sm:w-3 lg:w-3.5 lg:h-3.5 text-orange-600 dark:text-orange-400" />
                              <div className="absolute -top-1 -right-1 sm:-top-1 lg:-top-1.5 lg:-right-1.5 w-3.5 h-3.5 sm:w-4 lg:w-4.5 lg:h-4.5 rounded-full bg-orange-600 dark:bg-orange-500 
                                flex items-center justify-center">
                                <span className="text-xs font-medium text-white">{supplier.purchaseCount}</span>
                              </div>
                            </div>
                            <div className="absolute -bottom-6 sm:-bottom-7 lg:-bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 
                              text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              采购
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 供应商单据列表 */}
                  <div className="p-2 sm:p-3 lg:p-4">
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:gap-3">
                      {supplier.documents
                        .sort((a, b) => b.date.getTime() - a.date.getTime())
                        .map((doc) => {
                          const color = {
                            bg: 'bg-orange-100 dark:bg-orange-900/30',
                            text: 'text-orange-600 dark:text-orange-400',
                            hover: 'hover:bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20'
                          };

                          return (
                            <Link 
                              key={doc.id}
                              href={`/purchase/edit/${doc.id}`}
                              className={`group bg-white dark:bg-[#1c1c1e] p-1.5 sm:p-2 lg:p-2.5 flex items-center space-x-1.5 sm:space-x-2 lg:space-x-2.5 rounded-lg sm:rounded-lg lg:rounded-xl
                                hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer
                                active:shadow-sm hover:border-gray-300/70 dark:hover:border-gray-700/70 ${color.hover}`}
                            >
                              <div className={`w-5 h-5 sm:w-6 lg:w-6 lg:h-6 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0
                                group-hover:scale-110 transition-transform duration-200`}>
                                <span className={`text-xs font-medium ${color.text}`}>PO</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs sm:text-sm lg:text-sm font-medium text-gray-900 dark:text-white truncate
                                  transition-colors duration-200 ${color.text}`}>
                                  {doc.number}
                                </div>
                              </div>
                              {/* 添加一个微妙的箭头指示器 */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                                <ChevronRight className="w-3 h-3 sm:w-3 lg:w-3.5 lg:h-3.5 text-gray-400 dark:text-gray-500" />
                              </div>
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ))}

              {suppliers.length === 0 && (
                <div className="col-span-full">
                  <div className="text-center py-6 sm:py-8 lg:py-10 bg-white dark:bg-[#1c1c1e] rounded-xl sm:rounded-xl lg:rounded-2xl border border-gray-200/50 dark:border-gray-800/50">
                    <Building2 className="mx-auto h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400" />
                    <h3 className="mt-3 sm:mt-4 lg:mt-4 text-sm sm:text-base lg:text-lg font-medium text-gray-900 dark:text-white">暂无供应商</h3>
                    <p className="mt-1 sm:mt-2 lg:mt-2 text-xs sm:text-sm lg:text-sm text-gray-500 dark:text-gray-400">
                      创建采购订单时会自动添加供应商信息
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 设置模态框 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-3 lg:p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-xl sm:rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden">
            {/* 模态框头部 */}
            <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  {activeTab === 'customer' ? (
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">
                    {activeTab === 'customer' ? '客户文档管理' : '供应商文档管理'}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    管理相关文档，支持批量操作
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSettings(false);
                  setSelectedDocuments(new Set());
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* 模态框内容 */}
            <div className="p-3 sm:p-4 lg:p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
              {/* 操作栏 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 lg:gap-4">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline text-left sm:text-center"
                  >
                    {selectedDocuments.size === (activeTab === 'customer' ? customers.flatMap(c => c.documents) : suppliers.flatMap(s => s.documents)).length ? '取消全选' : '全选'}
                  </button>
                  {selectedDocuments.size > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      已选择 {selectedDocuments.size} 个文档
                    </span>
                  )}
                </div>
                {selectedDocuments.size > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center px-3 sm:px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg 
                      hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-auto justify-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除选中
                  </button>
                )}
              </div>

              {/* 文档列表 */}
              <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                {activeTab === 'customer' ? (
                  // 客户文档列表
                  customers.map((customer) => (
                    <div key={customer.name} className="border border-gray-200 dark:border-gray-800 rounded-lg">
                      <div className="p-2 sm:p-3 lg:p-4 bg-gray-50 dark:bg-gray-900">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{customer.name}</h3>
                      </div>
                      <div className="p-2 sm:p-3 lg:p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                          {customer.documents.map((doc) => {
                            const isSelected = selectedDocuments.has(doc.id);
                            const colors = {
                              quotation: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
                              confirmation: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
                              packing: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400' },
                              invoice: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' }
                            };
                            const color = colors[doc.type] || colors.quotation;

                            return (
                              <div
                                key={doc.id}
                                className={`flex items-center p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                                  ${isSelected 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}
                                onClick={() => handleDocumentSelect(doc.id)}
                              >
                                <div className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded border-2 flex items-center justify-center mr-2 sm:mr-3
                                  ${isSelected 
                                    ? 'border-blue-500 bg-blue-500' 
                                    : 'border-gray-300 dark:border-gray-600'
                                  }`}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded ${color.bg} flex items-center justify-center`}>
                                      <span className={`text-xs font-medium ${color.text}`}>
                                        {doc.type === 'quotation' ? 'QTN' : 
                                         doc.type === 'confirmation' ? 'SC' : 
                                         doc.type === 'packing' ? 'PL' : 
                                         'INV'}
                                      </span>
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {doc.number}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {format(doc.date, 'yyyy-MM-dd HH:mm')}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  // 供应商文档列表
                  suppliers.map((supplier) => (
                    <div key={supplier.name} className="border border-gray-200 dark:border-gray-800 rounded-lg">
                      <div className="p-2 sm:p-3 lg:p-4 bg-gray-50 dark:bg-gray-900">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{supplier.name}</h3>
                      </div>
                      <div className="p-2 sm:p-3 lg:p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                          {supplier.documents.map((doc) => {
                            const isSelected = selectedDocuments.has(doc.id);
                            const color = {
                              bg: 'bg-orange-100 dark:bg-orange-900/30',
                              text: 'text-orange-600 dark:text-orange-400'
                            };

                            return (
                              <div
                                key={doc.id}
                                className={`flex items-center p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                                  ${isSelected 
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}
                                onClick={() => handleDocumentSelect(doc.id)}
                              >
                                <div className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded border-2 flex items-center justify-center mr-2 sm:mr-3
                                  ${isSelected 
                                    ? 'border-orange-500 bg-orange-500' 
                                    : 'border-gray-300 dark:border-gray-600'
                                  }`}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded ${color.bg} flex items-center justify-center`}>
                                      <span className={`text-xs font-medium ${color.text}`}>PO</span>
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {doc.number}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {format(doc.date, 'yyyy-MM-dd HH:mm')}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${activeTab === 'customer' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-orange-100 dark:bg-orange-900/20'} flex items-center justify-center mr-3 sm:mr-4`}>
                  <Trash2 className={`w-5 h-5 sm:w-6 sm:h-6 ${activeTab === 'customer' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">确认删除</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    此操作无法撤销
                  </p>
                </div>
              </div>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4 sm:mb-6">
                确定要删除选中的 <span className="font-semibold">{selectedDocuments.size}</span> 个{activeTab === 'customer' ? '客户' : '供应商'}文档吗？
              </p>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                    bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleteLoading}
                  className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg 
                    disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeTab === 'customer' 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                >
                  {deleteLoading ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑客户模态框 */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-xl w-full max-w-md">
            {/* 模态框头部 */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">编辑客户信息</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    修改后将应用到所有相关单据
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCustomer(null);
                  setEditForm({ name: '', originalName: '' });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* 模态框内容 */}
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {/* 客户名称输入 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    客户名称
                  </label>
                  <textarea
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                      bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-white 
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      resize-none text-sm sm:text-base"
                    rows={3}
                    placeholder="请输入客户名称"
                  />
                </div>

                {/* 影响范围提示 */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        影响范围
                      </h4>
                      <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>报价单：{editingCustomer.quotationCount} 个</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span>确认单：{editingCustomer.confirmationCount} 个</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                          <span>装箱单：{editingCustomer.packingCount} 个</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          <span>发票：{editingCustomer.invoiceCount} 个</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCustomer(null);
                    setEditForm({ name: '', originalName: '' });
                  }}
                  disabled={editLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                    bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveCustomerEdit}
                  disabled={editLoading || !editForm.name.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg 
                    hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center"
                >
                  {editLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑供应商模态框 */}
      {showEditSupplierModal && editingSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-xl w-full max-w-md">
            {/* 模态框头部 */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">编辑供应商信息</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    修改后将应用到所有相关单据
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditSupplierModal(false);
                  setEditingSupplier(null);
                  setEditSupplierForm({ name: '', originalName: '' });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* 模态框内容 */}
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {/* 供应商名称输入 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    供应商名称
                  </label>
                  <textarea
                    value={editSupplierForm.name}
                    onChange={(e) => setEditSupplierForm({ ...editSupplierForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                      bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-white 
                      focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
                      resize-none text-sm sm:text-base"
                    rows={3}
                    placeholder="请输入供应商名称"
                  />
                </div>

                {/* 影响范围提示 */}
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                        影响范围
                      </h4>
                      <div className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                          <span>采购订单：{editingSupplier.purchaseCount} 个</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setShowEditSupplierModal(false);
                    setEditingSupplier(null);
                    setEditSupplierForm({ name: '', originalName: '' });
                  }}
                  disabled={editSupplierLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                    bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveSupplierEdit}
                  disabled={editSupplierLoading || !editSupplierForm.name.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg 
                    hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center"
                >
                  {editSupplierLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
