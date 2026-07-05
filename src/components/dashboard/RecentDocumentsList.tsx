import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronDown, ChevronUp, Archive } from 'lucide-react';
import { FileText, Package, Receipt, ShoppingCart } from 'lucide-react';
import { DocumentWithType } from '@/utils/dashboardUtils';

type DocumentTypeFilter = 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase';

type DocumentFieldData = {
  quotationNo?: string;
  contractNo?: string;
  invoiceNo?: string;
  orderNo?: string;
  customerName?: string;
  supplierName?: string;
  consigneeName?: string;
};

type DocumentTypeOption = {
  label: string;
  value: DocumentTypeFilter;
  color: string;
};

interface RecentDocumentsListProps {
  documents: DocumentWithType[];
  timeFilter: 'today' | '3days' | 'week' | 'month';
  typeFilter: 'all' | DocumentTypeFilter;
  onTimeFilterChange: (filter: 'today' | '3days' | 'week' | 'month') => void;
  onTypeFilterChange: (filter: 'all' | DocumentTypeFilter) => void;
  showAllFilters: boolean;
  onShowAllFiltersChange: (show: boolean) => void;
  permissionMap?: {
    documentTypePermissions: {
      quotation: boolean;
      confirmation: boolean;
      packing: boolean;
      invoice: boolean;
      purchase: boolean;
    };
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const getDocumentData = (doc: DocumentWithType): DocumentFieldData => (
  isRecord(doc.data) ? doc.data : {}
);

const firstString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
};

export const RecentDocumentsList: React.FC<RecentDocumentsListProps> = ({
  documents,
  timeFilter,
  typeFilter,
  onTimeFilterChange,
  onTypeFilterChange,
  showAllFilters,
  onShowAllFiltersChange,
  permissionMap
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  // 获取有权限的文档类型
  const getAvailableDocumentTypes = (): DocumentTypeOption[] => {
    if (!permissionMap?.documentTypePermissions) {
      // 如果没有权限映射，返回所有类型
      return [
        { label: 'QTN', value: 'quotation', color: 'blue' },
        { label: 'SC', value: 'confirmation', color: 'green' },
        { label: 'PL', value: 'packing', color: 'teal' },
        { label: 'INV', value: 'invoice', color: 'purple' },
        { label: 'PO', value: 'purchase', color: 'orange' },
      ];
    }

    const availableTypes: DocumentTypeOption[] = [];
    const { documentTypePermissions } = permissionMap;

    if (documentTypePermissions.quotation) {
      availableTypes.push({ label: 'QTN', value: 'quotation', color: 'blue' });
    }
    if (documentTypePermissions.confirmation) {
      availableTypes.push({ label: 'SC', value: 'confirmation', color: 'green' });
    }
    if (documentTypePermissions.packing) {
      availableTypes.push({ label: 'PL', value: 'packing', color: 'teal' });
    }
    if (documentTypePermissions.invoice) {
      availableTypes.push({ label: 'INV', value: 'invoice', color: 'purple' });
    }
    if (documentTypePermissions.purchase) {
      availableTypes.push({ label: 'PO', value: 'purchase', color: 'orange' });
    }

    return availableTypes;
  };

  // 获取文档编号
  const getDocumentNumber = (doc: DocumentWithType) => {
    const data = getDocumentData(doc);
    let num = '';
    switch (doc.type) {
      case 'quotation':
        num = firstString(doc.quotationNo, data.quotationNo);
        break;
      case 'confirmation':
        num = firstString(doc.contractNo, data.contractNo, doc.quotationNo, data.quotationNo);
        break;
      case 'invoice':
        num = firstString(doc.invoiceNo, data.invoiceNo);
        break;
      case 'purchase':
        num = firstString(doc.orderNo, data.orderNo);
        break;
      case 'packing':
        num = firstString(doc.invoiceNo, data.invoiceNo, doc.orderNo, data.orderNo);
        break;
      default:
        num = doc.id;
    }
    return num || doc.id;
  };

  // 获取文档名称
  const getDocumentName = (doc: DocumentWithType) => {
    const data = getDocumentData(doc);
    let name = '';

    // 尝试从不同字段获取名称
    if (doc.type === 'purchase') {
      name = firstString(doc.supplierName, data.supplierName) || '未命名供应商';
    } else if (doc.type === 'packing') {
      name = firstString(doc.consigneeName, data.consigneeName) || '未命名收货人';
    } else {
      name = firstString(doc.customerName, data.customerName) || '未命名客户';
    }

    // 处理多行文本，取第一行
    return name.split('\n')[0]?.trim() || name;
  };

  // 过滤和搜索文档
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // 首先根据权限过滤文档类型
    if (permissionMap?.documentTypePermissions) {
      filtered = filtered.filter(doc => {
        switch (doc.type) {
          case 'quotation':
            return permissionMap.documentTypePermissions.quotation;
          case 'confirmation':
            return permissionMap.documentTypePermissions.confirmation;
          case 'packing':
            return permissionMap.documentTypePermissions.packing;
          case 'invoice':
            return permissionMap.documentTypePermissions.invoice;
          case 'purchase':
            return permissionMap.documentTypePermissions.purchase;
          default:
            return false;
        }
      });
    }

    // 根据类型筛选器过滤
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === typeFilter);
    }

    // 根据搜索词过滤
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => {
        try {
          // 获取搜索文本 - 用于搜索功能
          const data = getDocumentData(doc);
          const documentNumber = getDocumentNumber(doc);
          const documentName = getDocumentName(doc);

          // 扩展搜索范围，包括data字段中的信息
          const customerName = firstString(doc.customerName, data.customerName);
          const supplierName = firstString(doc.supplierName, data.supplierName);
          const consigneeName = firstString(doc.consigneeName, data.consigneeName);

          const searchText = `${documentNumber} ${documentName} ${customerName} ${supplierName} ${consigneeName}`.toLowerCase();
          return searchText.includes(searchLower);
        } catch (error) {
          console.warn('搜索过滤时出错:', error, doc);
          return false;
        }
      });
    }

    return filtered;
  }, [documents, searchTerm, typeFilter, permissionMap]);

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

  // 获取悬停背景色
  const getHoverBgColor = (docType: string) => {
    switch (docType) {
      case 'quotation':
        return 'hover:bg-blue-50 dark:hover:bg-blue-900/20';
      case 'confirmation':
        return 'hover:bg-green-50 dark:hover:bg-green-900/20';
      case 'packing':
        return 'hover:bg-teal-50 dark:hover:bg-teal-900/20';
      case 'invoice':
        return 'hover:bg-purple-50 dark:hover:bg-purple-900/20';
      case 'purchase':
        return 'hover:bg-orange-50 dark:hover:bg-orange-900/20';
      default:
        return 'hover:bg-gray-50 dark:hover:bg-gray-900/20';
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
      'quotation': 'QTN',
      'confirmation': 'SC',
      'packing': 'PL',
      'invoice': 'INV',
      'purchase': 'PO'
    }[typeFilter];

    if (searchTerm.trim()) {
      return `没有找到包含"${searchTerm}"的${typeText === '所有类型' ? '' : typeText + ' '}文档`;
    }

    return `${timeText}暂无 ${typeText} 文档`;
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

  const handleDocumentClick = (doc: DocumentWithType) => {
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
        {/* ✅ 搜索框：小屏独占一行，中大屏与筛选器同行 */}
        <div className="relative w-full md:max-w-xs lg:max-w-xs xl:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索单据号或名称..."
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
        <div className="flex items-center w-full md:w-auto gap-0.5 flex-wrap justify-end">
          {/* 📌 文档类型按钮组（右侧 ALL 开关 + 类型） */}
          <div className="flex items-center gap-0.5">
            {/* 类型按钮：展开时显示 */}
            {showAllFilters && (
              <div className="flex items-center gap-0.5 transition-all duration-300">
                {getAvailableDocumentTypes().map(({ label, value, color }) => (
                  <button
                    key={value}
                    onClick={() => onTypeFilterChange(value)}
                    className={`px-1.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 ${
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
              onClick={() => {
                if (showAllFilters) {
                  // 如果当前是展开状态，收起时设置为 'all'
                  onTypeFilterChange('all');
                }
                onShowAllFiltersChange(!showAllFilters);
              }}
              className={`px-1.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 flex items-center gap-0.5 ${
                typeFilter === 'all' && !showAllFilters
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50'
              }`}
            >
              <span>All</span>
              {showAllFilters ? (
                <ChevronUp className="w-3 h-3 transition-transform duration-200" />
              ) : (
                <ChevronDown className="w-3 h-3 transition-transform duration-200" />
              )}
            </button>
          </div>

          {/* 📅 时间筛选器 */}
          <div className="flex items-center gap-0.5">
            {[
              { label: '1D', value: 'today' },
              { label: '3D', value: '3days' },
              { label: '1W', value: 'week' },
              { label: '1M', value: 'month' },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onTimeFilterChange(value as 'today' | '3days' | 'week' | 'month')}
                className={`px-1.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95 ${
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
            className="flex items-center gap-0.5 px-1.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-800/50 rounded-lg"
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">管理</span>
          </button>
        </div>
      </div>

      {/* 文档列表 */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3 lg:gap-4 w-full max-w-none">
          {filteredDocuments.map((doc) => {
            const { Icon, bgColor, textColor } = getDocumentTypeInfo(doc.type);
            const documentNumber = getDocumentNumber(doc);
            const documentName = getDocumentName(doc);

            return (
              <div
                key={`${doc.type}-${doc.id}-${doc.updatedAt || doc.createdAt}`}
                onClick={() => handleDocumentClick(doc)}
                className={`group bg-white dark:bg-[#1c1c1e] rounded-xl shadow-md border border-gray-200/50 dark:border-gray-800/50
                  p-3 sm:p-4 md:p-5 cursor-pointer transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1
                  active:translate-y-0 active:shadow-md ${getHoverBgColor(doc.type)}`}
              >
                <div className="flex items-start space-x-3 md:space-x-4">
                  {/* 文档类型图标 */}
                  <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
                    <Icon className={`w-4 h-4 md:w-5 md:h-5 ${textColor}`} />
                  </div>

                  {/* 文档信息 */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium text-gray-900 dark:text-white md:truncate
                      transition-colors duration-200 ${getColorClasses(doc.type)}`}>
                      {highlightText(documentNumber, searchTerm)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5
                      group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
                      {highlightText(documentName, searchTerm)}
                    </div>
                  </div>

                  {/* 添加一个微妙的箭头指示器（小屏隐藏以节省空间） */}
                  <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
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
            {searchTerm.trim() ? '可尝试按“单据号”或“名称”搜索' : '支持按“单据号”或“名称”搜索，例如 C260101F'}
          </div>
        </div>
      )}
    </div>
  );
};
