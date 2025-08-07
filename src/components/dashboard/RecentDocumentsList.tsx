import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Receipt, 
  Package, 
  ShoppingCart, 
  Search,
  Archive,
  X
} from 'lucide-react';
import { DOCUMENT_TYPES } from '@/constants/dashboardModules';



interface Document {
  id: string;
  type: string;
  quotationNo?: string;
  invoiceNo?: string;
  orderNo?: string;
  contractNo?: string;
  customerName?: string;
  supplierName?: string;
  consigneeName?: string;
  date?: string;
  updatedAt?: string;
  createdAt?: string;
  totalAmount?: number;
  currency?: string;
  documentType?: string;
  data?: unknown;
  [key: string]: unknown;
}

interface RecentDocumentsListProps {
  documents: Document[];
  timeFilter: 'today' | '3days' | 'week' | 'month';
  typeFilter: 'all' | 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase';
  onTimeFilterChange: (filter: 'today' | '3days' | 'week' | 'month') => void;
  onTypeFilterChange: (filter: 'all' | 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase') => void;
  showAllFilters: boolean;
  onShowAllFiltersChange: (show: boolean) => void;
}

export const RecentDocumentsList: React.FC<RecentDocumentsListProps> = ({
  documents,
  timeFilter,
  typeFilter,
  onTimeFilterChange,
  onTypeFilterChange,
  showAllFilters,
  onShowAllFiltersChange
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  // 获取文档类型名称
  const getDocumentTypeName = (type: string) => {
    return DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES]?.label || 'DOC';
  };

  // 获取文档编号
  const getDocumentNumber = (doc: Document) => {
    const data = doc.data as Record<string, unknown> | undefined;
    switch (doc.type) {
      case 'quotation': 
        return doc.quotationNo || (data?.quotationNo as string) || '';
      case 'confirmation': 
        return doc.contractNo || (data?.contractNo as string) || doc.quotationNo || (data?.quotationNo as string) || '';
      case 'invoice': 
        return doc.invoiceNo || (data?.invoiceNo as string) || '';
      case 'purchase': 
        return doc.orderNo || (data?.orderNo as string) || '';
      case 'packing': 
        return doc.invoiceNo || (data?.invoiceNo as string) || doc.orderNo || (data?.orderNo as string) || '';
      default: 
        return doc.id;
    }
  };

  // 获取文档名称
  const getDocumentName = (doc: Document) => {
    const data = doc.data as Record<string, unknown> | undefined;
    let name = '';
    
    // 尝试从不同字段获取名称
    if (doc.type === 'purchase') {
      name = doc.supplierName || (data?.supplierName as string) || '未命名供应商';
    } else if (doc.type === 'packing') {
      name = doc.consigneeName || (data?.consigneeName as string) || '未命名收货人';
    } else {
      name = doc.customerName || (data?.customerName as string) || '未命名客户';
    }
    
    // 处理多行文本，取第一行
    return name.split('\n')[0]?.trim() || name;
  };

  // 过滤和搜索文档
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // 根据搜索词过滤
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => {
        try {
          // 获取搜索文本 - 用于搜索功能
          const data = doc.data as Record<string, unknown> | undefined;
          const documentNumber = getDocumentNumber(doc);
          const documentName = getDocumentName(doc);
          
          // 扩展搜索范围，包括data字段中的信息
          const customerName = doc.customerName || (data?.customerName as string) || '';
          const supplierName = doc.supplierName || (data?.supplierName as string) || '';
          const consigneeName = doc.consigneeName || (data?.consigneeName as string) || '';
          
          const searchText = `${documentNumber} ${documentName} ${customerName} ${supplierName} ${consigneeName}`.toLowerCase();
          return searchText.includes(searchLower);
        } catch (error) {
          console.warn('搜索过滤时出错:', error, doc);
          return false;
        }
      });
    }

    return filtered;
  }, [documents, searchTerm]);

  // 获取颜色类名
  const getColorClasses = (docType: string) => {
    switch (docType) {
      case 'quotation':
        return 'group-hover:text-blue-600 dark:group-hover:text-blue-400';
      case 'confirmation':
        return 'group-hover:text-green-600 dark:group-hover:text-green-400';
      case 'packing':
        return 'group-hover:text-teal-600 dark:group-hover:text-teal-400';
      case 'invoice':
        return 'group-hover:text-purple-600 dark:group-hover:text-purple-400';
      case 'purchase':
        return 'group-hover:text-orange-600 dark:group-hover:text-orange-400';
      default:
        return 'group-hover:text-gray-600 dark:group-hover:text-gray-400';
    }
  };

  // 高亮搜索词
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800/50 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // 获取空状态文本
  const getEmptyStateText = () => {
    const timeText = {
      'today': '今天',
      '3days': '最近三天',
      'week': '最近一周',
      'month': '最近一个月'
    }[timeFilter];
    
    const typeText = {
      'all': '所有类型',
      'quotation': '报价单',
      'confirmation': '销售确认',
      'packing': '装箱单',
      'invoice': '财务发票',
      'purchase': '采购订单'
    }[typeFilter];
    
    if (searchTerm.trim()) {
      return `没有找到包含"${searchTerm}"的${typeText}`;
    }
    
    return `${timeText}还没有创建或修改的${typeText}`;
  };

  // 获取文档类型图标和颜色
  const getDocumentTypeInfo = (type: string) => {
    switch (type) {
      case 'quotation':
        return { Icon: FileText, bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-300' };
      case 'confirmation':
        return { Icon: FileText, bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-300' };
      case 'packing':
        return { Icon: Package, bgColor: 'bg-teal-100 dark:bg-teal-900/30', textColor: 'text-teal-700 dark:text-teal-300' };
      case 'invoice':
        return { Icon: Receipt, bgColor: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-700 dark:text-purple-300' };
      case 'purchase':
        return { Icon: ShoppingCart, bgColor: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-700 dark:text-orange-300' };
      default:
        return { Icon: FileText, bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-300' };
    }
  };

  const handleDocumentClick = (doc: Document) => {
    // 对于confirmation类型，需要跳转到quotation页面并设置tab
    if (doc.type === 'confirmation') {
      const editPath = `/quotation/edit/${doc.id}?tab=confirmation`;
      router.push(editPath);
    } else {
      const editPath = `/${doc.type}/edit/${doc.id}`;
      router.push(editPath);
    }
  };

  return (
    <div className="mb-8">
      {/* ✅ 筛选器区域 */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
        {/* ✅ 搜索框：中大屏可见，中屏时收缩 */}
        <div className="relative hidden md:block w-full lg:max-w-md md:max-w-xs xl:max-w-lg">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索文档编号、客户名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 text-sm bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
              title="清除搜索"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ✅ 筛选按钮组：小屏&大屏均展示 */}
        <div className="flex items-center justify-between w-full md:w-auto gap-1 flex-wrap">
          {/* 📌 文档类型按钮组（右侧 ALL 开关 + 类型） */}
          <div className="flex items-center gap-1 ml-auto">
            {/* 类型按钮：展开时显示 */}
            {showAllFilters && (
              <div className="flex items-center gap-1 transition-all duration-300">
                {[
                  { label: 'QTN', value: 'quotation', color: 'blue' },
                  { label: 'SC', value: 'confirmation', color: 'green' },
                  { label: 'PL', value: 'packing', color: 'teal' },
                  { label: 'INV', value: 'invoice', color: 'purple' },
                  { label: 'PO', value: 'purchase', color: 'orange' },
                ].map(({ label, value, color }) => (
                  <button
                    key={value}
                    onClick={() => onTypeFilterChange(value as 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase')}
                    className={`px-2 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                      typeFilter === value
                        ? `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300`
                        : `text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-${color}-50 dark:hover:bg-${color}-800/50`
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* ALL 按钮：开关 */}
            <button
              onClick={() => onShowAllFiltersChange(!showAllFilters)}
              className={`px-2 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                typeFilter === 'all' && !showAllFilters
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
              }`}
            >
              {showAllFilters ? 'X' : 'All'}
            </button>
          </div>

          {/* 📅 时间筛选器 */}
          <div className="flex items-center gap-1">
            {[
              { label: '1D', value: 'today' },
              { label: '3D', value: '3days' },
              { label: '1W', value: 'week' },
              { label: '1M', value: 'month' },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onTimeFilterChange(value as 'today' | '3days' | 'week' | 'month')}
                className={`px-2 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                  timeFilter === value
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 📂 管理按钮 */}
          <button
            onClick={() => router.push('/history')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50 rounded-lg"
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">管理</span>
          </button>
        </div>
      </div>

      {/* 文档列表 */}
      {filteredDocuments.length > 0 ? (
        <div className="dashboard-grid gap-4">
          {filteredDocuments.map((doc) => {
            const { Icon, bgColor, textColor } = getDocumentTypeInfo(doc.type);
            const documentNumber = getDocumentNumber(doc);
            const documentName = getDocumentName(doc);
            
            return (
              <div
                key={doc.id}
                onClick={() => handleDocumentClick(doc)}
                className="group bg-white dark:bg-[#1c1c1e] rounded-xl shadow-md border border-gray-200/50 dark:border-gray-800/50
                  p-5 cursor-pointer transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1
                  active:translate-y-0 active:shadow-md"
              >
                <div className="flex items-start space-x-4">
                  {/* 文档类型图标 */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
                    <Icon className={`w-5 h-5 ${textColor}`} />
                  </div>
                  
                  {/* 文档信息 */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium text-gray-900 dark:text-white truncate
                      transition-colors duration-200 ${getColorClasses(doc.type)}`}>
                      {getDocumentTypeName(doc.type)} - {highlightText(documentNumber, searchTerm)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5
                      group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
                      {highlightText(documentName, searchTerm)}
                    </div>
                  </div>
                  
                  {/* 添加一个微妙的箭头指示器 */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-md border border-gray-200/50 dark:border-gray-800/50 p-5 text-center">
          <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">
            {getEmptyStateText()}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {searchTerm.trim() ? '尝试使用不同的搜索词' : '开始创建第一个单据吧！'}
          </div>
        </div>
      )}
    </div>
  );
};