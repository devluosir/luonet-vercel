'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Building2, FileText, Package, Receipt, ShoppingCart, ArrowLeft, Edit, ChevronRight } from 'lucide-react';
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

        console.log('=== Debug Info ===');
        console.log('Raw Quotation History:', quotationHistory);

        // 过滤掉无效的记录
        const validQuotationHistory = quotationHistory.filter((doc: any) => {
          // 检查记录是否有效
          const isValid = doc && 
            typeof doc === 'object' && 
            (doc.customerName || doc.quotationNo); // 至少要有客户名称或报价单号

          if (!isValid) {
            console.log('Invalid quotation record:', doc);
          }
          return isValid;
        });

        console.log('Valid Quotation History:', validQuotationHistory);

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

        console.log('All Records:', allRecords);

        // 统一处理客户名称格式
        const normalizeCustomerName = (name: string) => {
          if (!name || typeof name !== 'string') {
            console.log('Invalid customer name:', name);
            return '未命名客户';
          }
          const normalized = name
            .trim()
            .replace(/\s+/g, ' ') // 将多个空格替换为单个空格
            .toUpperCase(); // 转换为大写
          console.log(`Normalizing name: "${name}" -> "${normalized}"`);
          return normalized;
        };

        // 统计客户数据
        const customerMap = new Map<string, CustomerInfo>();
        
        // 处理所有记录
        allRecords.forEach((doc: any) => {
          // 检查记录的有效性
          if (!doc || typeof doc !== 'object') {
            console.log('Invalid record:', doc);
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
            console.log('Skipping record with invalid customer name:', doc);
            return;
          }

          const customerName = normalizeCustomerName(rawCustomerName);
          console.log(`Processing record - Type: ${doc.type}, Raw Name: "${rawCustomerName}", Normalized: "${customerName}"`);
          
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link 
            href="/dashboard"
            className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          {/* Tab切换 */}
          <div className="mt-8">
            <div className="border-b border-gray-200 dark:border-gray-800">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('customer')}
                  className={`
                    ${activeTab === 'customer'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                    }
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  `}
                >
                  <Users className="w-5 h-5" />
                  <span>客户</span>
                </button>

                <button
                  onClick={() => setActiveTab('supplier')}
                  className={`
                    ${activeTab === 'supplier'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                    }
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  `}
                >
                  <Building2 className="w-5 h-5" />
                  <span>供应商</span>
                </button>
              </nav>
            </div>
          </div>

          {/* 客户列表 */}
          {activeTab === 'customer' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {customers.map((customer) => (
                <div
                  key={customer.name}
                  className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 
                    hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* 客户信息头部 */}
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {customer.name.split('\n')[0]}
                        </h3>
                        {customer.name.split('\n').length > 1 && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">
                            {customer.name.split('\n').slice(1).join('\n')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        {customer.quotationCount > 0 && (
                          <div className="relative group">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 
                              border border-blue-100 dark:border-blue-800">
                              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 
                                flex items-center justify-center">
                                <span className="text-xs font-medium text-white">{customer.quotationCount}</span>
                              </div>
                            </div>
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 
                              text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              报价
                            </div>
                          </div>
                        )}

                        {customer.confirmationCount > 0 && (
                          <div className="relative group">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 
                              border border-green-100 dark:border-green-800">
                              <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-green-600 dark:bg-green-500 
                                flex items-center justify-center">
                                <span className="text-xs font-medium text-white">{customer.confirmationCount}</span>
                              </div>
                            </div>
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 
                              text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              确认
                            </div>
                          </div>
                        )}

                        {customer.packingCount > 0 && (
                          <div className="relative group">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/20 
                              border border-teal-100 dark:border-teal-800">
                              <Package className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-teal-600 dark:bg-teal-500 
                                flex items-center justify-center">
                                <span className="text-xs font-medium text-white">{customer.packingCount}</span>
                              </div>
                            </div>
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 
                              text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              装箱
                            </div>
                          </div>
                        )}

                        {customer.invoiceCount > 0 && (
                          <div className="relative group">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 
                              border border-purple-100 dark:border-purple-800">
                              <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-purple-600 dark:bg-purple-500 
                                flex items-center justify-center">
                                <span className="text-xs font-medium text-white">{customer.invoiceCount}</span>
                              </div>
                            </div>
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 
                              text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              开票
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 单据列表 */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                              className={`group bg-white dark:bg-[#1c1c1e] p-3 flex items-center space-x-3 rounded-xl
                                hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer
                                active:shadow-sm hover:border-gray-300/70 dark:hover:border-gray-700/70 ${color.hover}`}
                            >
                              <div className={`w-7 h-7 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0
                                group-hover:scale-110 transition-transform duration-200`}>
                                <span className={`text-xs font-medium ${color.text}`}>
                                  {doc.type === 'quotation' ? 'QTN' : 
                                   doc.type === 'confirmation' ? 'SC' : 
                                   doc.type === 'packing' ? 'PL' : 
                                   'INV'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium text-gray-900 dark:text-white truncate
                                  transition-colors duration-200 ${color.text}`}>
                                  {doc.number}
                                </div>
                              </div>
                              {/* 添加一个微妙的箭头指示器 */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
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
                  <div className="text-center py-12 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-gray-200/50 dark:border-gray-800/50">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">暂无客户</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      创建单据时会自动添加客户信息
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 供应商列表 */}
          {activeTab === 'supplier' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.name}
                  className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 
                    hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* 供应商信息头部 */}
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {supplier.name.split('\n')[0]}
                        </h3>
                        {supplier.name.split('\n').length > 1 && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">
                            {supplier.name.split('\n').slice(1).join('\n')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="relative group">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 
                            border border-orange-100 dark:border-orange-800">
                            <ShoppingCart className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-orange-600 dark:bg-orange-500 
                              flex items-center justify-center">
                              <span className="text-xs font-medium text-white">{supplier.purchaseCount}</span>
                            </div>
                          </div>
                          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 
                            text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            采购
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 供应商单据列表 */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                              className={`group bg-white dark:bg-[#1c1c1e] p-3 flex items-center space-x-3 rounded-xl
                                hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer
                                active:shadow-sm hover:border-gray-300/70 dark:hover:border-gray-700/70 ${color.hover}`}
                            >
                              <div className={`w-7 h-7 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0
                                group-hover:scale-110 transition-transform duration-200`}>
                                <span className={`text-xs font-medium ${color.text}`}>PO</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium text-gray-900 dark:text-white truncate
                                  transition-colors duration-200 ${color.text}`}>
                                  {doc.number}
                                </div>
                              </div>
                              {/* 添加一个微妙的箭头指示器 */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
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
                  <div className="text-center py-12 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-gray-200/50 dark:border-gray-800/50">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">暂无供应商</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      创建采购订单时会自动添加供应商信息
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
