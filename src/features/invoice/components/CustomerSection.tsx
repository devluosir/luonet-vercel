'use client';

import { useState, useEffect, useRef } from 'react';
import { recordCustomerUsage } from '@/utils/customerUsageTracker';
import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { getCustomersForDropdown, SavedCustomer } from '@/utils/customerDataService';

interface CustomerSectionProps {
  to: string;
  customerPO: string;
  onChange: (data: { to: string; customerPO: string }) => void;
}

/**
 * 标准化客户名称，用于匹配
 * @param name 客户名称
 * @returns 标准化后的客户名称
 */
function normalizeCustomerName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // 将多个空格替换为单个空格
    .replace(/[^\w\s]/g, '') // 移除特殊字符，只保留字母、数字和空格
    .trim();
}

/**
 * 查找最匹配的客户记录
 * @param customerName 客户名称
 * @param records 客户记录数组
 * @returns 匹配的客户记录索引，如果未找到返回-1
 */
function findBestCustomerMatch(customerName: string, records: any[]): number {
  const normalizedSearchName = normalizeCustomerName(customerName);
  
  // 只进行精确匹配，避免错误的匹配
  const exactMatch = records.findIndex(record => 
    normalizeCustomerName(record.name) === normalizedSearchName
  );
  
  return exactMatch;
}

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

export function CustomerSection({ to, customerPO, onChange }: CustomerSectionProps) {
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<SavedCustomer[]>([]);
  const [showSavedCustomers, setShowSavedCustomers] = useState(false);

  // 添加 ref 用于检测点击外部区域
  const savedCustomersRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  // 统一处理客户名称格式
  const normalizeCustomerName = (name: string) => {
    if (!name || typeof name !== 'string') {
      return '未命名客户';
    }
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  };

  // 加载客户数据的通用函数
  // 使用统一的客户数据服务，从客户管理页面获取数据
  const loadCustomerData = () => {
    try {
      if (typeof window !== 'undefined') {
        // 使用统一的客户数据服务
        const allCustomers = getCustomersForDropdown();
        
        console.log('从客户管理服务加载的客户数据:', {
          totalCustomers: allCustomers.length,
          customers: allCustomers
        });
        
        setSavedCustomers(allCustomers);
        setFilteredCustomers(allCustomers);
      }
    } catch (error) {
      console.error('加载客户数据失败:', error);
      setSavedCustomers([]);
      setFilteredCustomers([]);
    }
  };

  // 加载保存的客户信息
  useEffect(() => {
    loadCustomerData();
  }, []);

  // 处理点击外部区域关闭下拉列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        savedCustomersRef.current &&
        !savedCustomersRef.current.contains(event.target as Node) &&
        buttonsRef.current &&
        !buttonsRef.current.contains(event.target as Node)
      ) {
        setShowSavedCustomers(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 处理客户名称输入变化
  const handleCustomerNameChange = (value: string) => {
    onChange({ to: value, customerPO });
    
    // 如果输入框为空，显示所有客户
    if (!value.trim()) {
      setFilteredCustomers(savedCustomers);
      setShowSavedCustomers(false);
      return;
    }

    // 过滤客户列表
    const filtered = savedCustomers.filter(customer =>
      customer.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredCustomers(filtered);
    setShowSavedCustomers(filtered.length > 0);
  };

  // 处理客户PO输入变化
  const handleCustomerPOChange = (value: string) => {
    onChange({ to, customerPO: value });
  };

  // 选择客户
  const handleSelectCustomer = (customer: SavedCustomer) => {
    onChange({ to: customer.name, customerPO: customer.customerPO || '' });
    setShowSavedCustomers(false);
    
    // 记录客户使用情况
    recordCustomerUsage(customer.name, 'invoice', 'draft');
  };

  // 自动匹配客户
  const handleAutoMatch = () => {
    if (!to.trim()) return;
    
    const matchIndex = findBestCustomerMatch(to, savedCustomers);
    if (matchIndex !== -1) {
      const matchedCustomer = savedCustomers[matchIndex];
      onChange({ to: matchedCustomer.name, customerPO: matchedCustomer.customerPO || '' });
      
      // 记录客户使用情况
      recordCustomerUsage(matchedCustomer.name, 'invoice', 'draft');
    }
  };

  return (
    <div className="space-y-4">
      {/* 客户信息标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          客户信息
        </h2>
        <div className="flex items-center space-x-2" ref={buttonsRef}>
          <button
            type="button"
            onClick={handleAutoMatch}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 
                     bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 
                     dark:hover:bg-blue-900/30 transition-colors"
          >
            自动匹配
          </button>
          <button
            type="button"
            onClick={() => setShowSavedCustomers(!showSavedCustomers)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 
                     bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 
                     dark:hover:bg-gray-700 transition-colors"
          >
            选择客户
          </button>
        </div>
      </div>

      {/* 客户名称输入 */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          客户名称 *
        </label>
        <input
          type="text"
          value={to}
          onChange={(e) => handleCustomerNameChange(e.target.value)}
          placeholder="输入客户名称..."
          className={inputClassName}
          required
        />
        
        {/* 保存的客户下拉列表 */}
        {showSavedCustomers && (
          <div
            ref={savedCustomersRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 
                     dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredCustomers.map((customer, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectCustomer(customer)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 
                         border-b border-gray-100 dark:border-gray-600 last:border-b-0
                         transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {customer.name}
                </div>
                {customer.customerPO && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    PO: {customer.customerPO}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 客户PO输入 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          客户PO
        </label>
        <input
          type="text"
          value={customerPO}
          onChange={(e) => handleCustomerPOChange(e.target.value)}
          placeholder="输入客户PO..."
          className={inputClassName}
        />
      </div>
    </div>
  );
}
