'use client';

import { useState, useEffect, useRef } from 'react';
import { recordCustomerUsage } from '@/utils/customerUsageTracker';

interface SavedCustomer {
  name: string;
  to: string;
  customerPO: string;
}

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

  // 加载保存的客户信息
  useEffect(() => {
    // 从客户管理页面加载数据
    const customerRecords = localStorage.getItem('customerRecords');
    if (customerRecords) {
      const records = JSON.parse(customerRecords);
      const formattedCustomers = records.map((record: any) => ({
        name: record.name,
        to: record.content,
        customerPO: ''
      }));
      setSavedCustomers(formattedCustomers);
    } else {
      // 兼容旧的保存格式
      const saved = localStorage.getItem('savedInvoiceCustomers');
      if (saved) {
        setSavedCustomers(JSON.parse(saved));
      }
    }
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
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSavedCustomers]);

  // 保存客户信息
  const handleSave = () => {
    if (!to.trim()) return;

    const customerName = to.split('\n')[0].trim(); // 使用第一行作为客户名称
    
    // 从客户管理页面获取现有数据
    const customerRecords = localStorage.getItem('customerRecords');
    let records = customerRecords ? JSON.parse(customerRecords) : [];
    
    // 查找现有记录，使用智能匹配
    const existingIndex = findBestCustomerMatch(customerName, records);
    
    const newRecord = {
      id: existingIndex >= 0 ? records[existingIndex].id : Date.now().toString(),
      name: customerName,
      content: to,
      createdAt: existingIndex >= 0 ? records[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageRecords: existingIndex >= 0 ? records[existingIndex].usageRecords : []
    };
    
    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
    }
    
    // 保存到客户管理页面
    localStorage.setItem('customerRecords', JSON.stringify(records));
    
    // 更新本地状态
    const formattedCustomers = records.map((record: any) => ({
      name: record.name,
      to: record.content,
      customerPO: ''
    }));
    setSavedCustomers(formattedCustomers);
    
    setShowSavedCustomers(false);
  };

  // 删除保存的客户信息
  const handleDelete = (customerName: string) => {
    // 从客户管理页面获取现有数据
    const customerRecords = localStorage.getItem('customerRecords');
    if (!customerRecords) return;
    
    let records = JSON.parse(customerRecords);
    
    // 删除指定记录，使用智能匹配
    const recordIndex = findBestCustomerMatch(customerName, records);
    if (recordIndex !== -1) {
      records.splice(recordIndex, 1);
    }
    
    // 保存到客户管理页面
    localStorage.setItem('customerRecords', JSON.stringify(records));
    
    // 更新本地状态
    const formattedCustomers = records.map((record: any) => ({
      name: record.name,
      to: record.content,
      customerPO: ''
    }));
    setSavedCustomers(formattedCustomers);
  };

  // 加载客户信息
  const handleLoad = (customer: SavedCustomer) => {
    onChange({
      to: customer.to,
      customerPO: customer.customerPO
    });
    
    // 记录使用情况（这里需要从父组件传入invoiceNo）
    // recordCustomerUsage(customer.name, 'invoice', invoiceNo);
    
    setShowSavedCustomers(false);
  };



  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div>
        <div className="relative">
          <textarea
            value={to}
            onChange={e => onChange({ ...{ to, customerPO }, to: e.target.value })}
            placeholder="Enter customer name and address"
            rows={3}
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
                {savedCustomers.map((customer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg"
                  >
                    <button
                      type="button"
                      onClick={() => handleLoad(customer)}
                      className="flex-1 text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {customer.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(customer.name)}
                      className="px-2 py-1 text-xs text-red-500 hover:text-red-600
                        hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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