'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Plus, Search, Filter, Trash2, Edit, Eye, List, Grid, Table, CheckSquare, Square } from 'lucide-react';
import { Footer } from '@/components/Footer';

// 添加CSS样式
const cardStyles = `
  .line-clamp-4 {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

interface CustomerRecord {
  id: string;
  name: string;
  content: string; // 多行文本内容
  createdAt: string;
  updatedAt: string;
  usageRecords: UsageRecord[];
}

interface UsageRecord {
  documentType: 'invoice' | 'packing' | 'quotation' | 'confirmation' | 'purchase';
  documentNo: string;
  usedAt: string;
}

type ViewMode = 'list' | 'card' | 'table';

export default function CustomerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', content: '' });
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // 添加 ref 用于检测点击外部区域
  const buttonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || status === 'loading') return;

    if (!session) {
      router.push('/');
      return;
    }

    setLoading(false);
    loadCustomers();
  }, [mounted, session, status, router]);

  // 加载客户数据
  const loadCustomers = () => {
    const saved = localStorage.getItem('customerRecords');
    if (saved) {
      const customers = JSON.parse(saved);
      setCustomers(customers);
    }
  };

  // 保存客户数据
  const saveCustomers = (newCustomers: CustomerRecord[]) => {
    localStorage.setItem('customerRecords', JSON.stringify(newCustomers));
    setCustomers(newCustomers);
  };



  // 进入选择模式
  const enterSelectMode = () => {
    setIsSelectMode(true);
    setSelectedCustomers(new Set());
  };

  // 退出选择模式
  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedCustomers(new Set());
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      // 如果全部已选中，则取消全选
      setSelectedCustomers(new Set());
    } else {
      // 否则全选
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  // 选择/取消选择单个客户
  const toggleSelectCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  // 批量删除选中的客户
  const handleBatchDelete = () => {
    if (selectedCustomers.size === 0) {
      return;
    }

    const updatedCustomers = customers.filter(c => !selectedCustomers.has(c.id));
    saveCustomers(updatedCustomers);
    setSelectedCustomers(new Set());
    setIsSelectMode(false);
  };

  // 添加新客户
  const handleAddCustomer = () => {
    if (!newCustomer.name.trim() || !newCustomer.content.trim()) return;

    const customer: CustomerRecord = {
      id: Date.now().toString(),
      name: newCustomer.name.trim(),
      content: newCustomer.content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageRecords: []
    };

    const updatedCustomers = [...customers, customer];
    saveCustomers(updatedCustomers);
    setNewCustomer({ name: '', content: '' });
    setShowAddModal(false);
  };

  // 编辑客户
  const handleEditCustomer = (customer: CustomerRecord) => {
    setEditingCustomer(customer);
    setNewCustomer({ name: customer.name, content: customer.content });
    setShowAddModal(true);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingCustomer || !newCustomer.name.trim() || !newCustomer.content.trim()) return;

    const updatedCustomer: CustomerRecord = {
      ...editingCustomer,
      name: newCustomer.name.trim(),
      content: newCustomer.content.trim(),
      updatedAt: new Date().toISOString()
    };

    const updatedCustomers = customers.map(c => 
      c.id === editingCustomer.id ? updatedCustomer : c
    );
    saveCustomers(updatedCustomers);
    setEditingCustomer(null);
    setNewCustomer({ name: '', content: '' });
    setShowAddModal(false);
  };

  // 删除客户
  const handleDeleteCustomer = (id: string) => {
    const updatedCustomers = customers.filter(c => c.id !== id);
    saveCustomers(updatedCustomers);
  };



  // 过滤客户
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 清理客户的使用记录
  const handleClearCustomerRecords = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const updatedCustomers = customers.map(c => 
      c.id === customerId 
        ? { ...c, usageRecords: [] }
        : c
    );
    saveCustomers(updatedCustomers);
  };

  // 清理所有客户的使用记录
  const handleClearAllRecords = () => {
    const updatedCustomers = customers.map(c => ({ ...c, usageRecords: [] }));
    saveCustomers(updatedCustomers);
  };

  // 渲染列表视图
  const renderListView = () => (
    <div className="space-y-4">
      {filteredCustomers.map((customer) => (
        <div key={customer.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 flex items-start gap-4">
                {isSelectMode && (
                  <button
                    onClick={() => toggleSelectCustomer(customer.id)}
                    className="mt-1 p-1 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {selectedCustomers.has(customer.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </button>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {customer.name}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {new Date(customer.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {customer.content}
                    </pre>
                  </div>
                  {customer.usageRecords.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <span>使用记录</span>
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                          {customer.usageRecords.length}
                        </span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {customer.usageRecords.map((record, index) => {
                          // 根据文档类型设置对应的颜色
                          let badgeClasses = '';
                          switch (record.documentType) {
                            case 'quotation':
                              badgeClasses = 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
                              break;
                            case 'confirmation':
                              badgeClasses = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
                              break;
                            case 'invoice':
                              badgeClasses = 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
                              break;
                            case 'purchase':
                              badgeClasses = 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200';
                              break;
                            case 'packing':
                              badgeClasses = 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200';
                              break;
                            default:
                              badgeClasses = 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200';
                          }
                          
                          return (
                            <span
                              key={index}
                              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${badgeClasses} hover:scale-105 transition-transform duration-200`}
                              title={`${record.documentType === 'invoice' ? '发票' : 
                                     record.documentType === 'packing' ? '箱单' : 
                                     record.documentType === 'quotation' ? '报价' : 
                                     record.documentType === 'confirmation' ? '订单确认' : 
                                     record.documentType === 'purchase' ? '采购' : '未知'}: ${record.documentNo}`}
                            >
                              {record.documentNo}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {!isSelectMode && (
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleEditCustomer(customer)}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="编辑"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleClearCustomerRecords(customer.id)}
                    className="p-2 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-200 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20"
                    title="清理使用记录"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染卡片视图
  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredCustomers.map((customer) => (
        <div key={customer.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 group">
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 flex items-start gap-3">
                {isSelectMode && (
                  <button
                    onClick={() => toggleSelectCustomer(customer.id)}
                    className="mt-1 p-1 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {selectedCustomers.has(customer.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </button>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                    {customer.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full inline-block">
                    {new Date(customer.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {!isSelectMode && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleEditCustomer(customer)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="编辑"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4 min-h-[80px]">
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4 leading-relaxed">
                {customer.content}
              </p>
            </div>
            
            {customer.usageRecords.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <span>使用记录</span>
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full text-xs font-medium">
                    {customer.usageRecords.length}
                  </span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {customer.usageRecords.slice(0, 4).map((record, index) => {
                    // 根据文档类型设置对应的颜色
                    let badgeClasses = '';
                    switch (record.documentType) {
                      case 'quotation':
                        badgeClasses = 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
                        break;
                      case 'confirmation':
                        badgeClasses = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
                        break;
                      case 'invoice':
                        badgeClasses = 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
                        break;
                      case 'purchase':
                        badgeClasses = 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200';
                        break;
                      case 'packing':
                        badgeClasses = 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200';
                        break;
                      default:
                        badgeClasses = 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200';
                    }
                    
                    return (
                      <span
                        key={index}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeClasses} hover:scale-105 transition-transform duration-200`}
                        title={`${record.documentType === 'invoice' ? '发票' : 
                               record.documentType === 'packing' ? '箱单' : 
                               record.documentType === 'quotation' ? '报价' : 
                               record.documentType === 'confirmation' ? '订单确认' : 
                               record.documentType === 'purchase' ? '采购' : '未知'}: ${record.documentNo}`}
                      >
                        {record.documentNo}
                      </span>
                    );
                  })}
                  {customer.usageRecords.length > 4 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      +{customer.usageRecords.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染表格视图
  const renderTableView = () => (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
          <tr>
            {isSelectMode && (
              <th className="w-12 px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
              </th>
            )}
            <th className="w-48 px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              客户名称
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              使用记录
            </th>
            <th className="w-32 px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              更新时间
            </th>
            {!isSelectMode && (
              <th className="w-24 px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                操作
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {filteredCustomers.map((customer) => (
            <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
              {isSelectMode && (
                <td className="w-12 px-4 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleSelectCustomer(customer.id)}
                    className="p-1 rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {selectedCustomers.has(customer.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </button>
                </td>
              )}
              <td className="w-48 px-6 py-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-full" title={customer.name}>
                  {customer.name}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {customer.usageRecords.map((record, index) => {
                    // 根据文档类型设置对应的颜色
                    let badgeClasses = '';
                    switch (record.documentType) {
                      case 'quotation':
                        badgeClasses = 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
                        break;
                      case 'confirmation':
                        badgeClasses = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
                        break;
                      case 'invoice':
                        badgeClasses = 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
                        break;
                      case 'purchase':
                        badgeClasses = 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200';
                        break;
                      case 'packing':
                        badgeClasses = 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200';
                        break;
                      default:
                        badgeClasses = 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200';
                    }
                    
                    return (
                      <span
                        key={index}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeClasses} hover:scale-105 transition-transform duration-200`}
                        title={`${record.documentType === 'invoice' ? '发票' : 
                               record.documentType === 'packing' ? '箱单' : 
                               record.documentType === 'quotation' ? '报价' : 
                               record.documentType === 'confirmation' ? '订单确认' : 
                               record.documentType === 'purchase' ? '采购' : '未知'}: ${record.documentNo}`}
                      >
                        {record.documentNo}
                      </span>
                    );
                  })}
                </div>
              </td>
              <td className="w-32 px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {new Date(customer.updatedAt).toLocaleDateString()}
              </td>
              {!isSelectMode && (
                <td className="w-24 px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditCustomer(customer)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(customer.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // 避免闪烁，在客户端渲染前返回空内容
  if (!mounted) {
    return null;
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-black">
      {/* 添加CSS样式 */}
      <style jsx>{cardStyles}</style>
      
      <div className="flex-1">
        {/* 主要内容区域 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <button
            onClick={() => router.push('/tools')}
            className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>

          {/* 标题和操作按钮 */}
          <div className="flex items-center justify-between mt-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">客户管理</h1>
            <div className="flex items-center gap-2" ref={buttonsRef}>
              {isSelectMode ? (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    已选择 {selectedCustomers.size} 项
                  </span>
                  <button
                    onClick={handleBatchDelete}
                    disabled={selectedCustomers.size === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-all duration-200 hover:shadow-lg shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除选中 ({selectedCustomers.size})
                  </button>
                  <button
                    onClick={exitSelectMode}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-md"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={enterSelectMode}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-md"
                  >
                    <CheckSquare className="w-4 h-4" />
                    批量操作
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 hover:shadow-lg shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    添加客户
                  </button>
                  <button
                    onClick={handleClearAllRecords}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 transition-all duration-200 hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                    清理所有记录
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 搜索和视图切换区域 */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索客户名称或内容..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">视图:</span>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors duration-200 ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title="列表视图"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-2 rounded-md transition-colors duration-200 ${
                      viewMode === 'card'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title="卡片视图"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-colors duration-200 ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title="表格视图"
                  >
                    <Table className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 客户列表区域 */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            {filteredCustomers.length === 0 ? (
              <div className="p-6">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Users className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {searchTerm ? '没有找到匹配的客户' : '暂无客户记录'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {searchTerm ? '请尝试其他搜索关键词' : '点击"添加客户"开始创建客户记录'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className={viewMode === 'table' ? '' : 'p-6'}>
                {viewMode === 'list' && renderListView()}
                {viewMode === 'card' && renderCardView()}
                {viewMode === 'table' && renderTableView()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 添加/编辑客户弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {editingCustomer ? '编辑客户' : '添加客户'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  客户名称
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入客户名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  客户信息
                </label>
                <textarea
                  value={newCustomer.content}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, content: e.target.value }))}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="输入客户详细信息（公司名称、地址、联系方式等）"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCustomer(null);
                  setNewCustomer({ name: '', content: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                取消
              </button>
              <button
                onClick={editingCustomer ? handleSaveEdit : handleAddCustomer}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
              >
                {editingCustomer ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
