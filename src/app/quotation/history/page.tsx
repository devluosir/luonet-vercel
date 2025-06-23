'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Edit2, Trash2, Copy, Download, Upload, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { QuotationHistory, QuotationHistoryFilters } from '@/types/quotation-history';
import { getQuotationHistory, deleteQuotationHistory, importQuotationHistory } from '@/utils/quotationHistory';
import dynamic from 'next/dynamic';
import { generateQuotationPDF } from '@/utils/quotationPdfGenerator';
import { QuotationData } from '@/types/quotation';
import { Footer } from '@/components/Footer';

// 动态导入iOS文件输入组件
const IOSFileInput = dynamic(() => import('@/components/IOSFileInput'), { ssr: false });

export default function QuotationHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<QuotationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<QuotationHistoryFilters>({
    search: '',
    type: 'all'
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof QuotationHistory | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc'
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showIOSFileInput, setShowIOSFileInput] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);

  // 处理搜索
  const getFilteredHistory = useCallback((items: QuotationHistory[]) => {
    return items.filter(item => {
      if (!filters.search) return true;
      
      const searchTerm = filters.search.toLowerCase().trim();
      
      // 匹配客户名称
      if (item.customerName.toLowerCase().includes(searchTerm)) return true;
      
      // 匹配单号
      const docNo = item.type === 'quotation' ? item.quotationNo : item.data.contractNo;
      if (docNo.toLowerCase().includes(searchTerm)) return true;
      
      // 匹配金额（支持大致金额搜索）
      const amount = item.totalAmount.toString();
      if (amount.includes(searchTerm)) return true;
      
      return false;
    }).filter(item => {
      // 类型筛选
      if (filters.type === 'all') return true;
      return item.type === filters.type;
    });
  }, [filters]);

  // 处理排序
  const handleSort = (key: keyof QuotationHistory) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 获取排序后的数据
  const getSortedHistory = useCallback((items: QuotationHistory[]) => {
    if (!sortConfig.key) return items;

    return [...items].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      return 0;
    });
  }, [sortConfig]);

  // 加载历史记录
  useEffect(() => {
    const loadHistory = () => {
      setIsLoading(true);
      try {
        const results = getQuotationHistory();
        const filteredResults = getFilteredHistory(results);
        const sortedResults = getSortedHistory(filteredResults);
        setHistory(sortedResults);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [filters, getFilteredHistory, getSortedHistory]);

  // 渲染排序图标
  const renderSortIcon = (key: keyof QuotationHistory) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="w-4 h-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />;
  };

  // 处理删除
  const handleDelete = (id: string) => {
    const success = deleteQuotationHistory(id);
    if (success) {
      setHistory(prev => prev.filter(item => item.id !== id));
      setShowDeleteConfirm(null);
    }
  };

  // 处理编辑
  const handleEdit = (id: string) => {
    router.push(`/quotation/edit/${id}`);
  };

  // 处理复制
  const handleCopy = (id: string) => {
    router.push(`/quotation/copy/${id}`);
  };

  // 处理导出
  const handleExport = () => {
    try {
      const results = getQuotationHistory();
      // 如果有选中的记录，只导出选中的记录
      const dataToExport = selectedIds.size > 0 
        ? results.filter(item => selectedIds.has(item.id))
        : results;
      
      const jsonData = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // 生成文件名
      let fileName = '';
      if (selectedIds.size === 1) {
        // 如果只选择了一条记录，使用其单号
        const selectedItem = dataToExport[0];
        const docNo = selectedItem.type === 'quotation' ? selectedItem.quotationNo : selectedItem.data.contractNo;
        fileName = `QH-${docNo}-${format(new Date(), 'yyyy-MM-dd')}`;
      } else {
        // 如果选择了多条或全部，使用日期
        const prefix = selectedIds.size > 0 ? `selected-${selectedIds.size}` : 'all';
        fileName = `QH-history-${prefix}-${format(new Date(), 'yyyy-MM-dd')}`;
      }
      
      a.download = `${fileName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting history:', error);
      alert('Export failed, please try again later.');
    }
  };

  // 处理导入
  const handleImport = () => {
    // 检测是否为iOS设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
    
    // 在iOS设备上使用专门的组件
    if (isIOS) {
      setShowIOSFileInput(true);
      return;
    }
    
    // 非iOS设备使用标准方法
    // 创建一个简单的文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    // 设置样式 - 保持简单
    fileInput.style.position = 'fixed';
    fileInput.style.top = '0';
    fileInput.style.left = '0';
    fileInput.style.opacity = '0';
    
    // 添加到DOM
    document.body.appendChild(fileInput);
    
    // 文件选择处理函数
    const handleFileSelect = () => {
      console.log('文件选择事件触发');
      
      if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        console.log('选择的文件:', file.name);
        
        // 检查文件名
        if (!file.name.toLowerCase().endsWith('.json')) {
          alert('请选择JSON格式的文件');
          document.body.removeChild(fileInput);
          return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
          console.log('文件读取完成');
          try {
            const content = e.target?.result as string;
            
            // 尝试解析JSON
            try {
              JSON.parse(content); // 验证JSON格式
              
              // 导入数据
              console.log('开始导入数据');
              const success = importQuotationHistory(content);
              
              if (success) {
                console.log('导入成功');
                const results = getQuotationHistory();
                const filteredResults = getFilteredHistory(results);
                const sortedResults = getSortedHistory(filteredResults);
                setHistory(sortedResults);
                alert('导入成功！');
              } else {
                console.error('导入失败');
                alert('导入失败，请确保文件格式正确。');
              }
            } catch (jsonError) {
              console.error('JSON解析错误:', jsonError);
              alert('导入失败，请确保文件格式正确（必须是有效的JSON格式）。');
            }
          } catch (error) {
            console.error('处理文件内容时出错:', error);
            alert('处理文件内容时出错，请重试。');
          } finally {
            // 清理DOM
            if (document.body.contains(fileInput)) {
              document.body.removeChild(fileInput);
            }
          }
        };
        
        reader.onerror = function() {
          console.error('文件读取错误');
          alert('读取文件时出错，请重试。');
          if (document.body.contains(fileInput)) {
            document.body.removeChild(fileInput);
          }
        };
        
        // 开始读取文件
        console.log('开始读取文件');
        reader.readAsText(file);
      } else {
        console.log('没有选择文件');
        // 用户没有选择文件，清理DOM
        if (document.body.contains(fileInput)) {
          document.body.removeChild(fileInput);
        }
      }
    };
    
    // 添加事件监听
    fileInput.addEventListener('change', handleFileSelect);
    
    // 直接触发点击
    console.log('触发文件选择器');
    setTimeout(() => {
      fileInput.click();
    }, 100);
    
    // 添加超时清理
    setTimeout(() => {
      if (document.body.contains(fileInput)) {
        document.body.removeChild(fileInput);
      }
    }, 60000); // 1分钟后清理
  };

  // 处理iOS文件选择
  const handleIOSFileSelect = (content: string) => {
    try {
      // 验证JSON格式
      JSON.parse(content);
      
      // 导入数据
      const success = importQuotationHistory(content);
      if (success) {
        const results = getQuotationHistory();
        const filteredResults = getFilteredHistory(results);
        const sortedResults = getSortedHistory(filteredResults);
        setHistory(sortedResults);
        alert('导入成功！');
      } else {
        alert('导入失败，请确保文件格式正确。');
      }
    } catch (error) {
      console.error('JSON解析错误:', error);
      alert('导入失败，请确保文件格式正确（必须是有效的JSON格式）。');
    } finally {
      setShowIOSFileInput(false);
    }
  };
  
  // 关闭iOS文件选择器
  const handleIOSFileCancel = () => {
    setShowIOSFileInput(false);
  };

  // 处理多选
  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map(item => item.id)));
    }
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    try {
      const success = Array.from(selectedIds).every(id => deleteQuotationHistory(id));
      if (success) {
        setHistory(prev => prev.filter(item => !selectedIds.has(item.id)));
        setSelectedIds(new Set());
        setShowBatchDeleteConfirm(false);
      } else {
        alert('Some records deletion failed, please refresh the page and try again.');
      }
    } catch (error) {
      console.error('Error batch deleting:', error);
      alert('Deletion failed, please try again later.');
    }
  };

  // 处理预览
  const handlePreview = async (id: string) => {
    const record = history.find(item => item.id === id);
    if (record) {
      setIsPreviewing(id);
      try {
        const pdfBlob = await generateQuotationPDF(record.data as QuotationData, true);
        const pdfDataUrl = URL.createObjectURL(pdfBlob);
        setPreviewUrl(pdfDataUrl);
      } catch (error) {
        console.error('Error generating preview:', error);
        alert('生成预览失败');
      } finally {
        setIsPreviewing(null);
      }
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Back button */}
          <Link href="/quotation" className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotation
          </Link>

          {/* Title and search bar */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-row justify-between items-center">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-[#F5F5F7] whitespace-nowrap">
                Quotation History
              </h1>
              <div className="flex flex-row gap-2">
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setShowBatchDeleteConfirm(true)}
                    className="h-10 px-4 rounded-xl text-sm font-medium
                      bg-red-600 hover:bg-red-700
                      text-white
                      flex items-center gap-2 whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Delete</span>
                    <span className="inline-flex">({selectedIds.size})</span>
                  </button>
                )}
                <button
                  onClick={handleExport}
                  className="h-10 px-4 rounded-xl text-sm font-medium
                    bg-[#007AFF] hover:bg-[#0066CC]
                    text-white
                    flex items-center gap-2 whitespace-nowrap"
                >
                  <Upload className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Export</span>
                  {selectedIds.size > 0 && <span className="inline-flex">({selectedIds.size})</span>}
                </button>
                <button
                  onClick={handleImport}
                  className="h-10 px-4 rounded-xl text-sm font-medium
                    bg-emerald-600 hover:bg-emerald-700
                    text-white
                    hover:shadow-md
                    flex items-center gap-2 whitespace-nowrap"
                >
                  <Download className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Import</span>
                </button>
              </div>
            </div>
            <div className="flex flex-row gap-2 w-full">
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as 'all' | 'quotation' | 'confirmation' }))}
                className="h-10 px-4 rounded-xl w-32 flex-shrink-0
                  bg-white dark:bg-[#2C2C2E]
                  border border-gray-200 dark:border-[#3A3A3C]
                  text-gray-900 dark:text-[#F5F5F7]
                  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
              >
                <option value="all">All Types</option>
                <option value="quotation">Quotation</option>
                <option value="confirmation">Order Confirmation</option>
              </select>
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search customer/number/amount..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full h-10 pl-10 pr-4 rounded-xl
                    bg-white dark:bg-[#2C2C2E]
                    border border-gray-200 dark:border-[#3A3A3C]
                    text-gray-900 dark:text-[#F5F5F7]
                    placeholder-gray-500 dark:placeholder-[#98989D]
                    focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                {filters.search && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1
                      text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <span className="sr-only">Clear search</span>
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* History list */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="py-8 text-center text-gray-500 dark:text-[#98989D]">
                  Loading...
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-[#3A3A3C]">
                        <th className="w-10 px-2 sm:px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={history.length > 0 && selectedIds.size === history.length}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 dark:border-[#3A3A3C]
                              text-[#007AFF] 
                              focus:ring-[#007AFF]
                              bg-white dark:bg-[#3A3A3C]"
                          />
                        </th>
                        <th 
                          className="w-1/4 px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-[#98989D] hidden lg:table-cell cursor-pointer group"
                          onClick={() => handleSort('customerName')}
                        >
                          <div className="flex items-center gap-1">
                            Customer Name
                            {renderSortIcon('customerName')}
                          </div>
                        </th>
                        <th 
                          className="w-[45%] sm:w-2/3 lg:w-1/3 px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-[#98989D] cursor-pointer group"
                          onClick={() => handleSort('quotationNo')}
                        >
                          <div className="flex items-center gap-1">
                            Number
                            {renderSortIcon('quotationNo')}
                          </div>
                        </th>
                        <th 
                          className="w-1/6 px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-[#98989D] hidden lg:table-cell cursor-pointer group"
                          onClick={() => handleSort('totalAmount')}
                        >
                          <div className="flex items-center gap-1">
                            Amount
                            {renderSortIcon('totalAmount')}
                          </div>
                        </th>
                        <th 
                          className="w-[35%] sm:w-1/4 lg:w-1/6 px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-[#98989D] cursor-pointer group"
                          onClick={() => handleSort('createdAt')}
                        >
                          <div className="flex items-center gap-1">
                            Created At
                            {renderSortIcon('createdAt')}
                          </div>
                        </th>
                        <th className="w-[20%] sm:w-[100px] px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-[#98989D]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => (
                        <tr key={item.id} className="border-b border-gray-200 dark:border-[#3A3A3C] last:border-0 hover:bg-gray-50 dark:hover:bg-[#3A3A3C]">
                          <td className="w-10 px-2 sm:px-4 py-2.5">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={() => handleSelect(item.id)}
                              className="rounded border-gray-300 dark:border-[#3A3A3C]
                                text-[#007AFF]
                                focus:ring-[#007AFF]
                                bg-white dark:bg-[#3A3A3C]"
                            />
                          </td>
                          <td className="w-1/4 px-2 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-[#F5F5F7] hidden lg:table-cell">
                            <div className="max-w-[200px] xl:max-w-[300px] whitespace-nowrap overflow-hidden text-ellipsis" title={item.customerName}>
                              {item.customerName}
                            </div>
                          </td>
                          <td className="w-[45%] sm:w-2/3 lg:w-1/3 px-2 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-[#F5F5F7] whitespace-nowrap overflow-hidden text-ellipsis">
                            {item.type === 'quotation' ? item.quotationNo : item.data.contractNo}
                          </td>
                          <td className="w-1/6 px-2 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-[#F5F5F7] hidden lg:table-cell">{item.currency === 'USD' ? '$' : '¥'}{item.totalAmount.toFixed(2)}</td>
                          <td className="w-[35%] sm:w-1/4 lg:w-1/6 px-2 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-[#F5F5F7] whitespace-nowrap overflow-hidden text-ellipsis">
                            {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                          </td>
                          <td className="w-[20%] sm:w-[100px] px-2 sm:px-4 py-2.5">
                            <div className="flex items-center gap-0.5 sm:gap-2">
                              <button
                                onClick={() => handlePreview(item.id)}
                                disabled={isPreviewing === item.id}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#48484A] text-green-600 dark:text-green-500 disabled:opacity-50"
                                title="Preview"
                              >
                                {isPreviewing === item.id ? (
                                  <svg className="animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleEdit(item.id)}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#48484A]
                                  text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                              <button
                                onClick={() => handleCopy(item.id)}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#48484A]
                                  text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
                                title="Copy"
                              >
                                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(item.id)}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#48484A]
                                  text-red-600 hover:text-red-700"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {history.length === 0 && (
                    <div className="py-8 text-center text-gray-500 dark:text-[#98989D]">
                      No records found
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closePreview}>
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
                预览
              </h3>
              <button
                onClick={closePreview}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-gray-100 dark:bg-[#3A3A3C]
                  text-gray-900 dark:text-[#F5F5F7]
                  hover:bg-gray-200 dark:hover:bg-[#48484A] transition-colors"
              >
                关闭
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={previewUrl} className="w-full h-full border-none rounded-lg" title="PDF Preview" />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 dark:text-[#98989D] mb-6">
              Are you sure you want to delete this record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-gray-100 dark:bg-[#3A3A3C]
                  text-gray-900 dark:text-[#F5F5F7]
                  hover:bg-gray-200 dark:hover:bg-[#48484A]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-red-600 hover:bg-red-700
                  text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch delete confirmation dialog */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] mb-4">
              Confirm Batch Delete
            </h3>
            <p className="text-gray-600 dark:text-[#98989D] mb-6">
              Are you sure you want to delete {selectedIds.size} selected records? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-gray-100 dark:bg-[#3A3A3C]
                  text-gray-900 dark:text-[#F5F5F7]
                  hover:bg-gray-200 dark:hover:bg-[#48484A]"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-red-600 hover:bg-red-700
                  text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS文件输入组件 */}
      {showIOSFileInput && (
        <IOSFileInput
          onFileSelect={handleIOSFileSelect}
          onCancel={handleIOSFileCancel}
          _accept=".json"
          _buttonText="选择JSON文件"
        />
      )}

      <Footer />
    </div>
  );
} 