'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Plus, Search, Filter, Download, Upload, Trash2, Edit, Eye } from 'lucide-react';
import { Footer } from '@/components/Footer';

interface CustomerRecord {
  id: string;
  name: string;
  content: string; // 多行文本内容
  createdAt: string;
  updatedAt: string;
  usageRecords: UsageRecord[];
}

interface UsageRecord {
  documentType: 'invoice' | 'packing' | 'quotation';
  documentNo: string;
  usedAt: string;
}

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
  const [showImportExport, setShowImportExport] = useState(false);
  
  // 添加 ref 用于检测点击外部区域
  const importExportRef = useRef<HTMLDivElement>(null);
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
      setCustomers(JSON.parse(saved));
    }
  };

  // 保存客户数据
  const saveCustomers = (newCustomers: CustomerRecord[]) => {
    localStorage.setItem('customerRecords', JSON.stringify(newCustomers));
    setCustomers(newCustomers);
  };

  // 添加点击外部区域关闭弹窗的功能
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // 检查是否点击了导入/导出弹窗外部
      if (showImportExport && 
          importExportRef.current && 
          !importExportRef.current.contains(target) &&
          buttonsRef.current &&
          !buttonsRef.current.contains(target)) {
        setShowImportExport(false);
      }
    };

    // 只在弹窗显示时添加事件监听器
    if (showImportExport) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImportExport]);

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
    if (confirm('确定要删除这个客户记录吗？')) {
      const updatedCustomers = customers.filter(c => c.id !== id);
      saveCustomers(updatedCustomers);
    }
  };

  // 导出客户数据
  const handleExport = () => {
    if (customers.length === 0) {
      alert('没有客户记录可导出');
      return;
    }
    
    const dataStr = JSON.stringify(customers, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer_records_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowImportExport(false);
    
    alert(`成功导出 ${customers.length} 条客户记录`);
  };

  // 导入客户数据
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          // 验证数据格式并转换
          const validatedData = importedData.map((item: any) => {
            // 确保每个记录都有必要的字段
            return {
              id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name: item.name || 'Unknown',
              content: item.content || item.to || '',
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
              usageRecords: item.usageRecords || []
            };
          });
          
          // 合并现有数据和导入的数据
          const mergedData = [...customers];
          validatedData.forEach(customer => {
            const existingIndex = mergedData.findIndex(c => c.id === customer.id);
            if (existingIndex >= 0) {
              mergedData[existingIndex] = customer;
            } else {
              mergedData.push(customer);
            }
          });
          saveCustomers(mergedData);
          alert(`成功导入 ${validatedData.length} 条客户记录`);
        } else {
          alert('文件格式错误：数据必须是数组格式');
        }
      } catch (error) {
        console.error('Error importing data:', error);
        alert('文件格式错误，请确保是有效的JSON文件');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
    setShowImportExport(false);
  };

  // 过滤客户
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.content.toLowerCase().includes(searchTerm.toLowerCase())
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
              <div className="relative">
                <button
                  onClick={() => setShowImportExport(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <Download className="w-4 h-4" />
                  导入/导出
                </button>
                
                {/* 导入/导出弹窗 */}
                {showImportExport && (
                  <div 
                    ref={importExportRef}
                    className="absolute z-10 right-0 top-full mt-1 w-[200px]
                      bg-white dark:bg-[#2C2C2E] rounded-xl shadow-lg
                      border border-gray-200/50 dark:border-gray-700/50
                      p-2"
                  >
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleExport}
                        className="w-full px-3 py-2 text-left text-sm
                          hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg
                          text-gray-700 dark:text-gray-300"
                      >
                        Export Customers
                      </button>
                      <label className="block">
                        <span className="w-full px-3 py-2 text-left text-sm
                          hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg
                          text-gray-700 dark:text-gray-300
                          cursor-pointer block"
                        >
                          Import Customers
                        </span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImport}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                添加客户
              </button>
            </div>
          </div>



          {/* 搜索和过滤区域 */}
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
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {customer.name}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(customer.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
                          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                            {customer.content}
                          </pre>
                        </div>
                        {customer.usageRecords.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              使用记录:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {customer.usageRecords.map((record, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                                >
                                  {record.documentType === 'invoice' && '发票'}
                                  {record.documentType === 'packing' && '箱单'}
                                  {record.documentType === 'quotation' && '报价'}
                                  : {record.documentNo}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
