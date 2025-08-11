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
    };

    // 只在弹窗显示时添加事件监听器
    if (showSavedCustomers) {
      if (typeof window !== 'undefined') {
        document.addEventListener('mousedown', handleClickOutside);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [showSavedCustomers]);

  // 保存客户信息
  const handleSave = () => {
    if (!to.trim()) return;

    const customerName = to.split('\n')[0].trim(); // 使用第一行作为客户名称
    const normalizedCustomerName = normalizeCustomerName(customerName);
    
    // 保存到历史记录中，这样客户页面就能读取到
    if (typeof window !== 'undefined') {
      const invoiceHistory = JSON.parse(localStorage.getItem('invoice_history') || '[]');
      
      // 检查是否已经存在相同的客户信息
      const existingIndex = invoiceHistory.findIndex((record: any) => {
        if (!record.customerName) return false;
        const recordNormalizedName = normalizeCustomerName(record.customerName);
        return recordNormalizedName === normalizedCustomerName;
      });
      
      if (existingIndex !== -1) {
        // 如果已存在，更新现有记录
        invoiceHistory[existingIndex] = {
          ...invoiceHistory[existingIndex],
          to: to,
          customerPO: customerPO,
          updatedAt: new Date().toISOString(),
          data: {
            ...invoiceHistory[existingIndex].data,
            to: to,
            customerName: customerName,
            customerPO: customerPO
          }
        };
      } else {
        // 如果不存在，创建新的历史记录
        const newRecord = {
          id: Date.now().toString(),
          customerName: customerName,
          to: to,
          customerPO: customerPO,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          type: 'invoice',
          data: {
            to: to,
            customerName: customerName,
            customerPO: customerPO
          }
        };
        
        // 添加到历史记录
        invoiceHistory.push(newRecord);
      }
      
      localStorage.setItem('invoice_history', JSON.stringify(invoiceHistory));
    }
    
    // 重新加载客户数据
    loadCustomerData();
    setShowSavedCustomers(false);
  };

  // 加载客户信息
  const handleLoad = (customer: SavedCustomer) => {
    onChange({
      to: customer.to,
      customerPO: customerPO // 保持现有的 customerPO 值不变
    });
    
    // 记录使用情况（这里需要从父组件传入invoiceNo）
    // recordCustomerUsage(customer.name, 'invoice', invoiceNo);
    
    setShowSavedCustomers(false);
  };

  return (
    <div className="space-y-4">
      {/* 客户信息 */}
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Customer Information
        </label>
        <div className="relative">
          <textarea
            value={to}
            onChange={e => onChange({ ...{ to, customerPO }, to: e.target.value })}
            placeholder="Enter customer name and address"
            rows={4}
            className={inputClassName}
          />
          <div className="absolute right-2 bottom-2 flex gap-2" ref={buttonsRef}>
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
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1 rounded-lg text-xs font-medium
                bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                text-[#007AFF] dark:text-[#0A84FF]
                transition-all duration-200"
            >
              Save
            </button>
          </div>

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
                {savedCustomers.map((customer, index) => {
                  const title = customer.name; // 使用提取的标题
                  const content = customer.to; // 完整信息作为内容
                  
                  return (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg"
                    >
                      <button
                        type="button"
                        onClick={() => handleLoad(customer)}
                        className="w-full text-left px-2 py-1"
                      >
                        {/* 标题部分，使用醒目的样式 */}
                        <div className="text-base font-bold text-gray-900 dark:text-white mb-1">
                          {title}
                        </div>
                        {/* 完整信息作为内容 */}
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {content}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 客户 PO */}
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Customer P/O No.
        </label>
        <input
          type="text"
          value={customerPO}
          onChange={e => onChange({ ...{ to, customerPO }, customerPO: e.target.value })}
          placeholder="Enter customer P/O number"
          className={inputClassName}
        />
      </div>
    </div>
  );
} 