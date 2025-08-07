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
  data?: any;
  [key: string]: any;
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
    switch (doc.type) {
      case 'quotation': 
        return doc.quotationNo || doc.data?.quotationNo || '';
      case 'confirmation': 
        return doc.contractNo || doc.data?.contractNo || doc.quotationNo || doc.data?.quotationNo || '';
      case 'invoice': 
        return doc.invoiceNo || doc.data?.invoiceNo || '';
      case 'purchase': 
        return doc.orderNo || doc.data?.orderNo || '';
      case 'packing': 
        return doc.invoiceNo || doc.data?.invoiceNo || doc.orderNo || doc.data?.orderNo || '';
      default: 
        return doc.id;
    }
  };

  // 获取文档名称
  const getDocumentName = (doc: Document) => {
    let name = '';
    
    // 尝试从不同字段获取名称
    if (doc.type === 'purchase') {
      name = doc.supplierName || doc.data?.supplierName || '未命名供应商';
    } else if (doc.type === 'packing') {
      name = doc.consigneeName || doc.data?.consigneeName || '未命名收货人';
    } else {
      name = doc.customerName || doc.data?.customerName || '未命名客户';
    }
    
    // 处理多行文本，取第一行
    return name.split('\n')[0]?.trim() || name;
  };

  // 获取搜索文本 - 用于搜索功能
  const getSearchText = (doc: Document) => {
    const documentNumber = getDocumentNumber(doc);
    const documentName = getDocumentName(doc);
    
    // 扩展搜索范围，包括data字段中的信息
    const customerName = doc.customerName || doc.data?.customerName || '';
    const supplierName = doc.supplierName || doc.data?.supplierName || '';
    const consigneeName = doc.consigneeName || doc.data?.consigneeName || '';
    
    return `${documentNumber} ${documentName} ${customerName} ${supplierName} ${consigneeName}`.toLowerCase();
  };

  // 过滤和搜索文档
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // 根据搜索词过滤
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => {
        try {
          const searchText = getSearchText(doc);
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

  // 获取文档图标和颜色
  const getDocumentIconAndColor = (type: string) => {
    switch (type) {
      case 'quotation':
        return { Icon: FileText, bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-600 dark:text-blue-400' };
      case 'confirmation':
        return { Icon: FileText, bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-600 dark:text-green-400' };
      case 'packing':
        return { Icon: Package, bgColor: 'bg-teal-100 dark:bg-teal-900/30', textColor: 'text-teal-600 dark:text-teal-400' };
      case 'invoice':
        return { Icon: Receipt, bgColor: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-600 dark:text-purple-400' };
      case 'purchase':
        return { Icon: ShoppingCart, bgColor: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-600 dark:text-orange-400' };
      default:
        return { Icon: FileText, bgColor: 'bg-gray-100 dark:bg-gray-900/30', textColor: 'text-gray-600 dark:text-gray-400' };
    }
  };

  return (
    <div className="mb-8">
      {/* 筛选器区域 */}
      <div className="flex items-center justify-center sm:justify-between mb-4">
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-md mr-4">
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

        {/* 筛选器按钮组 */}
        <div className="flex items-center space-x-2">
          {/* 文档类型筛选器 */}
          <div className="flex items-center space-x-0.5 bg-white dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
            <button
              onClick={() => {
                onShowAllFiltersChange(!showAllFilters);
                if (typeFilter !== 'all') {
                  onTypeFilterChange('all');
                }
              }}
              className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                active:scale-95 ${typeFilter === 'all' && !showAllFilters ? 'bg-gray-100 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300 font-bold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
            >
              ALL
            </button>
            {showAllFilters && (
              <>
                <button
                  onClick={() => onTypeFilterChange('quotation')}
                  className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                    active:scale-95 ${typeFilter === 'quotation' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                >
                  QTN
                </button>
                <button
                  onClick={() => onTypeFilterChange('confirmation')}
                  className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                    active:scale-95 ${typeFilter === 'confirmation' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                >
                  SC
                </button>
                <button
                  onClick={() => onTypeFilterChange('packing')}
                  className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                    active:scale-95 ${typeFilter === 'packing' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                >
                  PL
                </button>
                <button
                  onClick={() => onTypeFilterChange('invoice')}
                  className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                    active:scale-95 ${typeFilter === 'invoice' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                >
                  INV
                </button>
                <button
                  onClick={() => onTypeFilterChange('purchase')}
                  className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                    active:scale-95 ${typeFilter === 'purchase' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                >
                  PO
                </button>
              </>
            )}
          </div>

          {/* 时间筛选器 */}
          <div className="flex items-center space-x-0.5 bg-white dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
            <button
              onClick={() => onTimeFilterChange('today')}
              className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                active:scale-95 ${timeFilter === 'today' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
            >
              1D
            </button>
            <button
              onClick={() => onTimeFilterChange('3days')}
              className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                active:scale-95 ${timeFilter === '3days' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
            >
              3D
            </button>
            <button
              onClick={() => onTimeFilterChange('week')}
              className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                active:scale-95 ${timeFilter === 'week' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
            >
              1W
            </button>
            <button
              onClick={() => onTimeFilterChange('month')}
              className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                active:scale-95 ${timeFilter === 'month' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
            >
              1M
            </button>
          </div>

          {/* 查看全部按钮 */}
          <div className="flex items-center space-x-1">
            <div className="flex items-center space-x-0.5 bg-white dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
              <button
                onClick={() => router.push('/history')}
                className="px-2 py-1 text-xs rounded-md transition-all duration-200 ease-in-out
                  active:scale-95 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 
                  hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center space-x-1"
                title="单据管理"
              >
                <Archive className="w-3 h-3 transition-colors" />
                <span className="hidden sm:inline">管理</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 文档列表 */}
      {filteredDocuments.length > 0 ? (
        <div className="dashboard-grid gap-4">
          {filteredDocuments.map((doc) => {
            const { Icon, bgColor, textColor } = getDocumentIconAndColor(doc.type);
            const documentNumber = getDocumentNumber(doc);
            const documentName = getDocumentName(doc);
            
            return (
              <div
                key={doc.id}
                className={`group bg-white dark:bg-[#1c1c1e] rounded-xl shadow-md border border-gray-200/50 dark:border-gray-800/50 
                  p-3 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer
                  active:shadow-sm hover:border-gray-300/70 dark:hover:border-gray-700/70 w-full
                  ${(() => {
                    switch (doc.type) {
                      case 'quotation':
                        return 'hover:bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20';
                      case 'confirmation':
                        return 'hover:bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20';
                      case 'packing':
                        return 'hover:bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20';
                      case 'invoice':
                        return 'hover:bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20';
                      case 'purchase':
                        return 'hover:bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20';
                      default:
                        return 'hover:bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20';
                    }
                  })()}`}
                onClick={() => {
                  // 对于confirmation类型，需要跳转到quotation页面并设置tab
                  if (doc.type === 'confirmation') {
                    const editPath = `/quotation/edit/${doc.id}?tab=confirmation`;
                    router.push(editPath);
                  } else {
                    const editPath = `/${doc.type}/edit/${doc.id}`;
                    router.push(editPath);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // 对于confirmation类型，需要跳转到quotation页面并设置tab
                    if (doc.type === 'confirmation') {
                      const editPath = `/quotation/edit/${doc.id}?tab=confirmation`;
                      router.push(editPath);
                    } else {
                      const editPath = `/${doc.type}/edit/${doc.id}`;
                      router.push(editPath);
                    }
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`编辑${getDocumentTypeName(doc.type)}单据 ${documentNumber}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-7 h-7 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0
                    group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className={`w-3.5 h-3.5 ${textColor} transition-colors`} />
                  </div>
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