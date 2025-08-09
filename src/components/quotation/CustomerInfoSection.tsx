import React from 'react';
import type { QuotationData } from '@/types/quotation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { recordCustomerUsage } from '@/utils/customerUsageTracker';
import { hasStringChanged, normalizeStringInput } from '@/features/quotation/utils/inputUtils';
import { useDebounced } from '@/hooks/useDebounced';
import { useQuotationStore } from '@/features/quotation/state/useQuotationStore';

// 🛡️ 兜底：多行名称 → 单行展示（避免触发清空/过滤判定）
function sanitizeForInput(s: string): string {
  return s.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

interface CustomerInfoSectionProps {
  data: QuotationData;
  onChange: (data: Partial<QuotationData>) => void;
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

// 日期输入框专用样式
const dateInputClassName = `w-full min-w-0 px-4 py-2.5 rounded-2xl
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
  // 🔥 获取store的UI标记控制
  const { setUIFlags } = useQuotationStore();
  
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);
  const [showSavedCustomers, setShowSavedCustomers] = useState(false);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompleteSuggestions, setAutoCompleteSuggestions] = useState<SavedCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<SavedCustomer[]>([]);
  const [hasSelectedCustomer, setHasSelectedCustomer] = useState(() => Boolean(data?.to?.trim()));
  
  // 统一弹窗状态管理 - 确保同时只有一个弹窗显示
  const closeAllPopups = useCallback(() => {
    setShowSavedCustomers(false);
    setShowAutoComplete(false);
  }, []);
  
  const showSavedCustomersPopup = useCallback(() => {
    setShowAutoComplete(false);
    setShowSavedCustomers(true);
  }, []);
  
  const showAutoCompletePopup = useCallback(() => {
    setShowSavedCustomers(false);
    setShowAutoComplete(true);
  }, []);
  
  // 防抖输入状态 - 减少高频更新
  const [inquiryDraft, setInquiryDraft] = useState(data.inquiryNo ?? '');
  const [quotationDraft, setQuotationDraft] = useState(data.quotationNo ?? '');
  const [contractDraft, setContractDraft] = useState(data.contractNo ?? '');
  
  // 防抖处理，320ms延迟（降低输入期频率峰值）
  const debouncedInquiry = useDebounced(inquiryDraft, 320);
  const debouncedQuotation = useDebounced(quotationDraft, 320);
  const debouncedContract = useDebounced(contractDraft, 320);
  
  // 防抖值变化时更新到store
  useEffect(() => {
    if (debouncedInquiry !== (data.inquiryNo ?? '')) {
      onChange({ inquiryNo: debouncedInquiry });
    }
  }, [debouncedInquiry, data.inquiryNo, onChange]);
  
  useEffect(() => {
    if (debouncedQuotation !== (data.quotationNo ?? '')) {
      onChange({ quotationNo: debouncedQuotation });
    }
  }, [debouncedQuotation, data.quotationNo, onChange]);
  
  useEffect(() => {
    if (debouncedContract !== (data.contractNo ?? '')) {
      onChange({ contractNo: debouncedContract });
    }
  }, [debouncedContract, data.contractNo, onChange]);
  
  // 外部数据变化时同步到draft状态
  useEffect(() => {
    setInquiryDraft(data.inquiryNo ?? '');
  }, [data.inquiryNo]);
  
  useEffect(() => {
    setQuotationDraft(data.quotationNo ?? '');
  }, [data.quotationNo]);
  
  useEffect(() => {
    setContractDraft(data.contractNo ?? '');
  }, [data.contractNo]);
  
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

  // 客户信息草稿状态（减少store更新频率）
  const [toDraft, setToDraft] = useState(data.to ?? '');
  const debouncedTo = useDebounced(toDraft, 320);
  
  // 选择状态管理
  const [isSelecting, setIsSelecting] = useState(false);
  const lastSubmittedRef = useRef(data.to);
  
  // 🔥 选择态开合控制（同步到store）
  const onOpenSelect = useCallback(() => {
    setIsSelecting(true);
    setUIFlags({ selectingCustomer: true });
  }, [setUIFlags]);
  
  const onCloseSelect = useCallback(() => {
    setIsSelecting(false);
    setUIFlags({ selectingCustomer: false });
  }, [setUIFlags]);
  
  // 处理客户信息输入变化（只更新草稿状态）
  const handleCustomerInfoChange = useCallback((newTo: string) => {
    // 更新草稿状态
    setToDraft(newTo);
    
    // 如果输入内容变化，显示自动完成建议
    if (newTo.trim() && savedCustomers.length > 0) {
      const suggestions = getAutoCompleteSuggestions(newTo);
      setAutoCompleteSuggestions(suggestions);
      if (suggestions.length > 0) {
        showAutoCompletePopup();
      } else {
        closeAllPopups();
      }
    } else {
      // 输入为空时，如果有客户数据且未选择客户，显示保存客户列表
      if (savedCustomers.length > 0 && !hasSelectedCustomer) {
        showSavedCustomersPopup();
      } else {
        closeAllPopups();
      }
    }
    
    // 当用户开始输入时，重置选择状态
    setHasSelectedCustomer(false);
  }, [savedCustomers, getAutoCompleteSuggestions, hasSelectedCustomer, showAutoCompletePopup, showSavedCustomersPopup, closeAllPopups]);
  
  // 只在确实变更时提交，绝不写入只含空白的值
  const commitTo = useCallback((v: string) => {
    const trimmed = v.replace(/\s+/g, ' ').trim();
    if (lastSubmittedRef.current === trimmed) return;
    lastSubmittedRef.current = trimmed;
    if (trimmed === '') return; // 组件侧也兜底一次
    onChange({ to: trimmed });
  }, [onChange]);

  // 防抖后才提交到store（输入态，选择态时完全不跑）
  useEffect(() => {
    if (isSelecting) return; // 选择态：不把draft同步到store
    const v = debouncedTo;
    if (v !== (data.to ?? '')) commitTo(v);
  }, [debouncedTo, isSelecting, data.to, commitTo]);
  
  // 外部数据变化时同步到草稿状态
  useEffect(() => {
    setToDraft(data.to ?? '');
  }, [data.to]);

  // 🔥 外点抑制机制
  const suppressOutsideRef = useRef(false);
  const ignoreOutsideUntilRef = useRef(0);
  
  // 选择自动完成建议（按正确顺序回填）
  const handleAutoCompleteSelect = useCallback((customer: SavedCustomer, e?: React.MouseEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    if (customer.to === data.to) return; // 相同值不更新
    
    suppressOutsideRef.current = true; // 这一帧忽略外点
    const sanitizedTo = sanitizeForInput(customer.to);
    
    // ① 先让UI立即显示
    setToDraft(sanitizedTo);
    
    // ② 立即提交store（覆盖防抖）
    commitTo(sanitizedTo);
    
    // ③ 微任务里再关弹窗（避开外点）
    queueMicrotask(() => {
      closeAllPopups();
      setHasSelectedCustomer(true);
      onCloseSelect();
      suppressOutsideRef.current = false;
      ignoreOutsideUntilRef.current = Date.now() + 120; // 120ms宽限
    });
    
    // 记录使用情况
    if (data.quotationNo) {
      recordCustomerUsage(customer.name, 'quotation', data.quotationNo);
    }
  }, [data.to, data.quotationNo, commitTo, onCloseSelect]);

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

        // 去重处理 - 根据name和to的组合去重
        const uniqueCustomers = formattedCustomers.filter((customer, index, self) => {
          const key = `${normalizeCustomerName(customer.name)}_${customer.to}`;
          return index === self.findIndex(c => {
            const cKey = `${normalizeCustomerName(c.name)}_${c.to}`;
            return cKey === key;
          });
        });

        if (uniqueCustomers.length > 0) {
          console.log('客户数据统计:', {
            total: formattedCustomers.length,
            unique: uniqueCustomers.length,
            customers: uniqueCustomers.map(c => ({ name: c.name, to: c.to.substring(0, 50) }))
          });
        }

        setSavedCustomers(uniqueCustomers);
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

  // 根据输入内容过滤客户
  useEffect(() => {
    if (!data.to?.trim()) {
      // 如果输入框为空，显示所有客户
      setFilteredCustomers(savedCustomers);
      setHasSelectedCustomer(false);
    } else {
      // 根据输入内容过滤客户
      const filtered = savedCustomers.filter(customer => {
        const inputLower = data.to.toLowerCase();
        const nameLower = customer.name.toLowerCase();
        const toLower = customer.to.toLowerCase();
        
        return nameLower.includes(inputLower) || toLower.includes(inputLower);
      });
      
      console.log('筛选结果:', {
        input: data.to,
        totalCustomers: savedCustomers.length,
        filteredCount: filtered.length,
        filtered: filtered.map(c => ({ name: c.name, to: c.to.substring(0, 50) }))
      });
      
      setFilteredCustomers(filtered);
    }
  }, [data.to, savedCustomers]);

  // 🔥 外点监听：帧节流 + 选择后宽限
  const handleOutside = useCallback((e: MouseEvent) => {
    if (suppressOutsideRef.current) return;
    if (Date.now() < ignoreOutsideUntilRef.current) return;
    
    const target = e.target as Node;
    
    // 统一处理所有弹窗的外点关闭
    const isClickOutsideCustomerArea = customerInputRef.current && !customerInputRef.current.contains(target);
    const isClickOutsideSavedCustomers = savedCustomersRef.current && !savedCustomersRef.current.contains(target);
    const isClickOutsideAutoComplete = autoCompleteRef.current && !autoCompleteRef.current.contains(target);
    const isClickOutsideButtons = buttonsRef.current && !buttonsRef.current.contains(target);
    
    if (isClickOutsideCustomerArea && isClickOutsideButtons) {
      // 关闭所有客户相关弹窗
      if ((showSavedCustomers && isClickOutsideSavedCustomers) || 
          (showAutoComplete && isClickOutsideAutoComplete)) {
        console.log('外点关闭所有弹窗');
        closeAllPopups();
        onCloseSelect();
      }
    }
  }, [showSavedCustomers, showAutoComplete, onCloseSelect, closeAllPopups]);

  // 帧节流的外点处理
  const handleOutsideThrottled = useMemo(() => {
    let ticking = false;
    return (e: MouseEvent) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        handleOutside(e);
      });
    };
  }, [handleOutside]);

  // 添加点击外部区域关闭弹窗的功能
  useEffect(() => {
    // 只在弹窗显示时添加事件监听器
    if (!showSavedCustomers && !showAutoComplete) return;
    
    const now = Date.now();
    ignoreOutsideUntilRef.current = now + 120; // 刚打开的宽限，避免同帧误关
    
    if (typeof window !== 'undefined') {
      document.addEventListener('mousedown', handleOutsideThrottled, true);
      if (process.env.NODE_ENV === 'development') {
        console.log('添加外点监听器');
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('mousedown', handleOutsideThrottled, true);
        if (process.env.NODE_ENV === 'development') {
          console.log('移除外点监听器');
        }
      }
    };
  }, [showSavedCustomers, showAutoComplete, handleOutsideThrottled]);



  // 加载客户信息（按正确顺序回填）
  const handleLoad = useCallback((customer: SavedCustomer, e?: React.MouseEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    if (customer.to === data.to) return; // 相同值不更新
    
    suppressOutsideRef.current = true; // 这一帧忽略外点
    const sanitizedTo = sanitizeForInput(customer.to);
    
    // ① 先让UI立即显示
    setToDraft(sanitizedTo);
    
    // ② 立即提交store（覆盖防抖）
    commitTo(sanitizedTo);
    
    // ③ 微任务里再关弹窗（避开外点）
    queueMicrotask(() => {
      closeAllPopups();
      setHasSelectedCustomer(true);
      onCloseSelect();
      suppressOutsideRef.current = false;
      ignoreOutsideUntilRef.current = Date.now() + 120; // 120ms宽限
    });
    
    // 记录使用情况
    if (data.quotationNo) {
      recordCustomerUsage(customer.name, 'quotation', data.quotationNo);
    }
  }, [data.to, data.quotationNo, commitTo, onCloseSelect]);

  // 弹窗状态日志
  useEffect(() => {
    // ✅ 优化：只在有客户数据时输出日志
    if (filteredCustomers.length > 0 || showSavedCustomers) {
      console.log('弹窗状态:', {
        showSavedCustomers,
        filteredCustomersLength: filteredCustomers.length,
        filteredCustomers: filteredCustomers.map(c => ({ name: c.name, to: c.to.substring(0, 50) }))
      });
    }
  }, [showSavedCustomers, filteredCustomers]);

  // 防抖输入处理函数 - 直接更新draft状态
  const handleInquiryNoChange = useCallback((newInquiryNo: string) => {
    setInquiryDraft(newInquiryNo);
  }, []);

  const handleQuotationNoChange = useCallback((newQuotationNo: string) => {
    setQuotationDraft(newQuotationNo);
  }, []);

  const handleContractNoChange = useCallback((newContractNo: string) => {
    setContractDraft(newContractNo);
  }, []);

  // 使用useMemo优化日期更新
  const handleDateChange = useCallback((newDate: string) => {
    if (newDate === data.date) return;
    onChange({ date: newDate });
  }, [data, onChange]);

  // 使用useMemo优化显示名称
  const displayTitle = useMemo(() => {
    return type === 'quotation' ? 'Customer Information' : 'Customer Information';
  }, [type]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 左列：用户信息和询价单号 */}
      <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {displayTitle}
        </h3>
        <div className="space-y-4">
          {/* 客户信息 */}
          <div className="relative">
            <textarea
              ref={customerInputRef}
              value={toDraft}
              onChange={(e) => handleCustomerInfoChange(e.target.value)}
              onFocus={() => {
                // 聚焦即进入选择态
                onOpenSelect();
                
                // 只在输入框为空且有客户数据时显示客户列表
                if (!toDraft.trim() && savedCustomers.length > 0 && !hasSelectedCustomer) {
                  showSavedCustomersPopup();
                }
              }}
              onBlur={() => {
                // 失焦兜底：确保把最终draft提交一次
                if (toDraft !== (data.to ?? '')) {
                  commitTo(toDraft);
                }
                
                // 延迟关闭，让用户有时间点击列表项
                setTimeout(() => {
                  closeAllPopups();
                  onCloseSelect();
                }, 200);
              }}
              placeholder="Enter customer name and address"
              rows={3}
              className={`${inputClassName} min-h-[100px]`}
              style={iosCaretStyle}
            />
            {/* 移除Load按钮，改为自动显示筛选结果 */}

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
                        onMouseDown={(e) => handleAutoCompleteSelect(customer, e)}
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
            {showSavedCustomers && filteredCustomers.length > 0 && (
              <div 
                ref={savedCustomersRef}
                className="absolute z-50 right-0 top-full mt-1 w-full max-w-md
                  bg-white dark:bg-[#2C2C2E] rounded-xl shadow-lg
                  border border-gray-200/50 dark:border-gray-700/50
                  p-2"
              >
                <div className="text-xs text-gray-500 mb-2 px-2">
                  找到 {filteredCustomers.length} 个匹配的客户
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {filteredCustomers.map((customer, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg"
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => handleLoad(customer, e)}
                        className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {customer.to}
                        </div>
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
              value={inquiryDraft}
              onChange={(e) => handleInquiryNoChange(e.target.value)}
              placeholder="Inquiry No."
              className={inputClassName}
              style={iosCaretStyle}
            />
          </div>
        </div>
      </div>

      {/* 右列：根据类型显示不同内容 */}
      <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
    
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
                  value={quotationDraft}
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
                  value={data.date ?? ''}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={dateInputClassName}
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
                  value={contractDraft}
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
                  value={data.date ?? ''}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={dateInputClassName}
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
                  value={quotationDraft}
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

// 性能调试标记（开发模式下可启用）
if (process.env.NODE_ENV === 'development') {
  // CustomerInfoSection.whyDidYouRender = true;
} 