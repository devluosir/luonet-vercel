import React from 'react';
import type { QuotationData } from '@/types/quotation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { recordCustomerUsage } from '@/utils/customerUsageTracker';

interface CustomerInfoSectionProps {
  data: QuotationData;
  onChange: (data: QuotationData) => void;
  type: 'quotation' | 'confirmation';
}

// 参考invoice页面的简洁样式 - iOS兼容性更好
const inputClassName = `w-full px-4 py-2.5 rounded-2xl
  bg-white/95 dark:bg-[#1c1c1e]/95
  border border-[#007AFF]/10 dark:border-[#0A84FF]/10
  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
  placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
  text-[15px] leading-relaxed text-gray-800 dark:text-gray-100
  transition-all duration-300 ease-out
  hover:border-[#007AFF]/20 dark:hover:border-[#0A84FF]/20
  shadow-sm hover:shadow-md
  ios-optimized-input`;

// iOS光标优化样式 - 简化版本
const iosCaretStyle = {
  caretColor: '#007AFF',
  WebkitCaretColor: '#007AFF',
} as React.CSSProperties;

const labelClassName = `block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5`;

interface SavedCustomer {
  name: string;
  to: string;
}

// 历史记录文档的通用接口
interface HistoryDocument {
  id?: string;
  type?: string;
  customerName?: string;
  consigneeName?: string;
  quotationNo?: string;
  contractNo?: string;
  invoiceNo?: string;
  date?: string;
  updatedAt?: string;
  createdAt?: string;
  data?: {
    to?: string;
    type?: string;
  };
  to?: string;
}

// 缓存localStorage数据
const localStorageCache = new Map<string, unknown>();

// 获取缓存的localStorage数据
const getCachedLocalStorage = (key: string): unknown => {
  if (!localStorageCache.has(key)) {
    try {
      const data = localStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : null;
      localStorageCache.set(key, parsed);
      return parsed;
    } catch (error) {
      console.warn(`Failed to parse localStorage key: ${key}`, error);
      return null;
    }
  }
  return localStorageCache.get(key);
};



export const CustomerInfoSection = React.memo(({ data, onChange, type }: CustomerInfoSectionProps) => {
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);
  const [showSavedCustomers, setShowSavedCustomers] = useState(false);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompleteSuggestions, setAutoCompleteSuggestions] = useState<SavedCustomer[]>([]);
  
  // 添加 ref 用于检测点击外部区域
  const savedCustomersRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const autoCompleteRef = useRef<HTMLDivElement>(null);
  const customerInputRef = useRef<HTMLTextAreaElement>(null);

  // 统一处理客户名称格式
  const normalizeCustomerName = useCallback((name: string) => {
    if (!name || typeof name !== 'string') {
      return '未命名客户';
    }
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }, []);

  // 自动完成匹配函数
  const getAutoCompleteSuggestions = useCallback((input: string) => {
    if (!input.trim()) return [];
    
    const normalizedInput = normalizeCustomerName(input);
    return savedCustomers.filter(customer => {
      const normalizedCustomer = normalizeCustomerName(customer.name);
      return normalizedCustomer.includes(normalizedInput) || 
             customer.name.toLowerCase().includes(input.toLowerCase());
    }).slice(0, 5); // 限制显示5个建议
  }, [savedCustomers, normalizeCustomerName]);

  // 处理客户信息输入变化
  const handleCustomerInfoChange = useCallback((newTo: string) => {
    // 如果输入内容变化，显示自动完成建议
    if (newTo.trim() && savedCustomers.length > 0) {
      const suggestions = getAutoCompleteSuggestions(newTo);
      setAutoCompleteSuggestions(suggestions);
      setShowAutoComplete(suggestions.length > 0);
    } else {
      setShowAutoComplete(false);
    }
    
    onChange({
      ...data,
      to: newTo
    });
  }, [data, onChange, savedCustomers, getAutoCompleteSuggestions]);

  // 选择自动完成建议
  const handleAutoCompleteSelect = useCallback((customer: SavedCustomer) => {
    setShowAutoComplete(false);
    onChange({
      ...data,
      to: customer.to
    });
    
    // 记录使用情况
    if (data.quotationNo) {
      recordCustomerUsage(customer.name, 'quotation', data.quotationNo);
    }
  }, [data, onChange]);

  // 加载客户数据的通用函数
  // 注意：这里只加载客户相关的历史记录，不包含供应商信息
  // 供应商信息来自 purchase_history，只在客户页面的供应商tab中显示
  const loadCustomerData = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        // 从localStorage加载客户相关的历史记录
        const quotationHistory = (getCachedLocalStorage('quotation_history') as HistoryDocument[]) || [];
        const packingHistory = (getCachedLocalStorage('packing_history') as HistoryDocument[]) || [];
        const invoiceHistory = (getCachedLocalStorage('invoice_history') as HistoryDocument[]) || [];
        
        // 不加载 purchase_history，因为它包含的是供应商信息，不是客户信息

        // 过滤掉无效的记录
        const validQuotationHistory = quotationHistory.filter((doc: HistoryDocument) => {
          const isValid = doc && 
            typeof doc === 'object' && 
            (doc.customerName || doc.quotationNo);
          return isValid;
        });

        // 合并所有历史记录
        const allRecords = [
          ...validQuotationHistory.map((doc: HistoryDocument) => {
            const isConfirmation = doc.type === 'confirmation' || (doc.data && doc.data.type === 'confirmation');
            return {
              ...doc,
              type: isConfirmation ? 'confirmation' : 'quotation'
            };
          }),
          ...packingHistory.map((doc: HistoryDocument) => ({ ...doc, type: 'packing' })),
          ...invoiceHistory.map((doc: HistoryDocument) => ({ ...doc, type: 'invoice' }))
        ];

        // 统计客户数据
        const customerMap = new Map<string, { name: string; lastUpdated: Date; documents: Array<{ id: string; type: string; number: string; date: Date }> }>();
        
        // 处理所有记录
        allRecords.forEach((doc: HistoryDocument) => {
          if (!doc || typeof doc !== 'object') {
            return;
          }

          let rawCustomerName;
          if (doc.type === 'packing') {
            rawCustomerName = doc.consigneeName || doc.customerName || '未命名客户';
          } else {
            rawCustomerName = doc.customerName || '未命名客户';
          }
          
          if (!rawCustomerName || rawCustomerName === '未命名客户') {
            return;
          }

          const customerName = normalizeCustomerName(rawCustomerName);
          
          if (!customerMap.has(customerName)) {
            customerMap.set(customerName, {
              name: rawCustomerName,
              lastUpdated: new Date(doc.date || doc.updatedAt || doc.createdAt || Date.now()),
              documents: []
            });
          }

          const customer = customerMap.get(customerName)!;
          
          // 更新最后更新时间
          const docDate = new Date(doc.date || doc.updatedAt || doc.createdAt || Date.now());
          if (docDate > customer.lastUpdated) {
            customer.lastUpdated = docDate;
            customer.name = rawCustomerName;
          }

          // 添加文档信息
          customer.documents.push({
            id: doc.id || '',
            type: doc.type || 'unknown',
            number: doc.quotationNo || doc.contractNo || doc.invoiceNo || '-',
            date: docDate
          });
        });

        // 转换为数组并按最后更新时间排序
        const sortedCustomers = Array.from(customerMap.values())
          .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

        // 格式化客户信息，提取完整的客户信息
        const formattedCustomers = sortedCustomers.map((customer) => {
          let customerInfo = customer.name;
          
          // 尝试从历史记录中获取完整的客户信息
          const allHistory = [
            ...quotationHistory,
            ...packingHistory,
            ...invoiceHistory
          ];
          
          const matchingRecord = allHistory.find((record: HistoryDocument) => {
            let recordCustomerName;
            if (record.type === 'packing') {
              recordCustomerName = record.consigneeName || record.customerName;
            } else {
              recordCustomerName = record.customerName;
            }
            return recordCustomerName && normalizeCustomerName(recordCustomerName) === normalizeCustomerName(customer.name);
          });
          
          if (matchingRecord) {
            // 如果是报价单或确认单，使用data.to字段
            if (matchingRecord.data && matchingRecord.data.to) {
              customerInfo = matchingRecord.data.to;
            } else if (matchingRecord.to) {
              customerInfo = matchingRecord.to;
            }
          }
          
          return {
            name: customer.name.split('\n')[0].trim(), // 只取第一行作为显示名称
            to: customerInfo
          };
        });

        setSavedCustomers(formattedCustomers);
      }
    } catch (error) {
      console.error('加载客户数据失败:', error);
      // 兼容旧的保存格式
      if (typeof window !== 'undefined') {
        const saved = getCachedLocalStorage('savedCustomers') as SavedCustomer[];
        if (saved && Array.isArray(saved)) {
          setSavedCustomers(saved);
        }
      }
    }
  }, [normalizeCustomerName]);

  // 加载保存的客户信息
  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  // 添加点击外部区域关闭弹窗的功能
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // 检查是否点击了保存的客户列表弹窗外部
      if (showSavedCustomers && 
          savedCustomersRef.current && 
          !savedCustomersRef.current.contains(target) &&
          buttonsRef.current &&
          !buttonsRef.current.contains(target)) {
        setShowSavedCustomers(false);
      }
      
      // 检查是否点击了自动完成弹窗外部
      if (showAutoComplete && 
          autoCompleteRef.current && 
          !autoCompleteRef.current.contains(target) &&
          customerInputRef.current &&
          !customerInputRef.current.contains(target)) {
        setShowAutoComplete(false);
      }
    };

    // 只在弹窗显示时添加事件监听器
    if (showSavedCustomers || showAutoComplete) {
      if (typeof window !== 'undefined') {
        document.addEventListener('mousedown', handleClickOutside);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [showSavedCustomers, showAutoComplete]);



  // 加载客户信息
  const handleLoad = useCallback((customer: SavedCustomer) => {
    onChange({
      ...data,
      to: customer.to
    });
    
    // 记录使用情况
    if (data.quotationNo) {
      recordCustomerUsage(customer.name, 'quotation', data.quotationNo);
    }
    
    setShowSavedCustomers(false);
  }, [data, onChange]);

  // 使用useMemo优化询价单号更新
  const handleInquiryNoChange = useCallback((newInquiryNo: string) => {
    onChange({
      ...data,
      inquiryNo: newInquiryNo
    });
  }, [data, onChange]);

  // 使用useMemo优化报价单号更新
  const handleQuotationNoChange = useCallback((newQuotationNo: string) => {
    onChange({
      ...data,
      quotationNo: newQuotationNo
    });
  }, [data, onChange]);

  // 使用useMemo优化合同号更新
  const handleContractNoChange = useCallback((newContractNo: string) => {
    onChange({
      ...data,
      contractNo: newContractNo
    });
  }, [data, onChange]);

  // 使用useMemo优化日期更新
  const handleDateChange = useCallback((newDate: string) => {
    onChange({
      ...data,
      date: newDate
    });
  }, [data, onChange]);

  // 使用useMemo优化显示名称
  const displayTitle = useMemo(() => {
    return type === 'quotation' ? 'Customer Information' : 'Customer Information';
  }, [type]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 左列：用户信息和询价单号 */}
      <div className="bg-gray-50 dark:bg-[#1C1C1E] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {displayTitle}
        </h3>
        <div className="space-y-4">
          {/* 客户信息 */}
          <div className="relative">
            <textarea
              ref={customerInputRef}
              value={data.to}
              onChange={(e) => handleCustomerInfoChange(e.target.value)}
              placeholder="Enter customer name and address"
              rows={3}
              className={`${inputClassName} min-h-[100px]`}
              style={iosCaretStyle}
            />
            <div className="absolute right-2 bottom-2" ref={buttonsRef}>
              <button
                type="button"
                onClick={() => setShowSavedCustomers(true)}
                className="px-3 py-1 rounded-lg text-xs font-medium
                  bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                  hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                  text-[#007AFF] dark:text-[#0A84FF]
                  transition-all duration-200"
              >
                Load
              </button>
            </div>

            {/* 自动完成建议弹窗 */}
            {showAutoComplete && autoCompleteSuggestions.length > 0 && (
              <div 
                ref={autoCompleteRef}
                className="absolute z-20 left-0 right-0 top-full mt-1
                  bg-white dark:bg-[#2C2C2E] rounded-xl shadow-lg
                  border border-gray-200/50 dark:border-gray-700/50
                  max-h-[200px] overflow-y-auto"
              >
                {autoCompleteSuggestions.map((customer, index) => (
                  <div
                    key={index}
                    className="p-3 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] cursor-pointer
                      border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => handleAutoCompleteSelect(customer)}
                      className="w-full text-left"
                    >
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {customer.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {customer.to}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 保存的客户列表弹窗 */}
            {showSavedCustomers && savedCustomers.length > 0 && (
              <div 
                ref={savedCustomersRef}
                className="absolute z-10 right-0 top-full mt-1 w-full max-w-md
                  bg-white dark:bg-[#2C2C2E] rounded-xl shadow-lg
                  border border-gray-200/50 dark:border-gray-700/50
                  p-2"
              >
                <div className="max-h-[200px] overflow-y-auto">
                  {savedCustomers.map((customer, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg"
                    >
                      <button
                        type="button"
                        onClick={() => handleLoad(customer)}
                        className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
                      >
                        {customer.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 询价单号 */}
          <div>
            <label className={labelClassName}>
              Inquiry No.
            </label>
            <input
              type="text"
              value={data.inquiryNo}
              onChange={(e) => handleInquiryNoChange(e.target.value)}
              placeholder="Inquiry No."
              className={inputClassName}
              style={iosCaretStyle}
            />
          </div>
        </div>
      </div>

      {/* 右列：根据类型显示不同内容 */}
      <div className="bg-gray-50 dark:bg-[#1C1C1E] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
    
        <div className="space-y-4">
          {type === 'quotation' ? (
            <>
              {/* 报价单号 */}
              <div>
                <label className={labelClassName}>
                  Quotation No.
                </label>
                <input
                  type="text"
                  value={data.quotationNo}
                  onChange={(e) => handleQuotationNoChange(e.target.value)}
                  placeholder="Quotation No. *"
                  className={`${inputClassName} [&::placeholder]:text-[#007AFF]/60 dark:[&::placeholder]:text-[#0A84FF]/60 font-medium text-[#007AFF] dark:text-[#0A84FF]`}
                  style={iosCaretStyle}
                  required
                />
              </div>
              {/* 日期 */}
              <div>
                <label className={labelClassName}>
                  Date
                </label>
                <input
                  type="date"
                  value={data.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={inputClassName}
                  style={iosCaretStyle}
                  required
                />
              </div>
            </>
          ) : (
            <>
              {/* 合同号 */}
              <div>
                <label className={labelClassName}>
                  Contract No.
                </label>
                <input
                  type="text"
                  value={data.contractNo}
                  onChange={(e) => handleContractNoChange(e.target.value)}
                  placeholder="Contract No."
                  className={`${inputClassName} [&::placeholder]:text-[#007AFF]/60 dark:[&::placeholder]:text-[#0A84FF]/60 font-medium text-[#007AFF] dark:text-[#0A84FF]`}
                  style={iosCaretStyle}
                  required
                />
              </div>
              {/* 日期 */}
              <div>
                <label className={labelClassName}>
                  Date
                </label>
                <input
                  type="date"
                  value={data.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={inputClassName}
                  style={iosCaretStyle}
                  required
                />
              </div>
              {/* 报价单号 */}
              <div>
                <label className={labelClassName}>
                  Quotation No.
                </label>
                <input
                  type="text"
                  value={data.quotationNo}
                  onChange={(e) => handleQuotationNoChange(e.target.value)}
                  placeholder="Quotation No."
                  className={inputClassName}
                  style={iosCaretStyle}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

CustomerInfoSection.displayName = 'CustomerInfoSection'; 