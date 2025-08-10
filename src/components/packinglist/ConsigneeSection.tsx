'use client';

import { useState, useEffect, useRef } from 'react';
import { recordCustomerUsage } from '@/utils/customerUsageTracker';
import { getLocalStorageJSON } from '@/utils/safeLocalStorage';

interface SavedConsignee {
  name: string;
  to: string;
}

interface ConsigneeSectionProps {
  consigneeName: string;
  orderNo: string;
  onChange: (data: { consigneeName: string; orderNo: string }) => void;
}

/**
 * 标准化客户名称，用于匹配
 * @param name 客户名称
 * @returns 标准化后的客户名称
 */
function normalizeCustomerName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '未命名客户';
  }
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
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

export function ConsigneeSection({ consigneeName, orderNo, onChange }: ConsigneeSectionProps) {
  const [savedConsignees, setSavedConsignees] = useState<SavedConsignee[]>([]);
  const [showSavedConsignees, setShowSavedConsignees] = useState(false);

  // 添加 ref 用于检测点击外部区域
  const savedConsigneesRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  // 加载客户数据的通用函数
  // 注意：这里只加载客户相关的历史记录，不包含供应商信息
  // 供应商信息来自 purchase_history，只在客户页面的供应商tab中显示
  const loadCustomerData = () => {
    try {
      if (typeof window !== 'undefined') {
        // 从localStorage加载客户相关的历史记录
        const quotationHistory = getLocalStorageJSON('quotation_history', []);
        const packingHistory = getLocalStorageJSON('packing_history', []);
        const invoiceHistory = getLocalStorageJSON('invoice_history', []);
        
        // 不加载 purchase_history，因为它包含的是供应商信息，不是客户信息

        // 过滤掉无效的记录
        const validQuotationHistory = quotationHistory.filter((doc: any) => {
          const isValid = doc && 
            typeof doc === 'object' && 
            (doc.customerName || doc.quotationNo);
          return isValid;
        });

        // 合并所有历史记录
        const allRecords = [
          ...validQuotationHistory.map((doc: any) => {
            const isConfirmation = doc.type === 'confirmation' || (doc.data && doc.data.type === 'confirmation');
            return {
              ...doc,
              type: isConfirmation ? 'confirmation' : 'quotation'
            };
          }),
          ...packingHistory.map((doc: any) => ({ ...doc, type: 'packing' })),
          ...invoiceHistory.map((doc: any) => ({ ...doc, type: 'invoice' }))
        ];

        // 统计客户数据
        const customerMap = new Map<string, any>();
        
        // 处理所有记录
        allRecords.forEach((doc: any) => {
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
              lastUpdated: new Date(doc.date || doc.updatedAt || doc.createdAt),
              documents: []
            });
          }

          const customer = customerMap.get(customerName)!;
          
          // 更新最后更新时间
          const docDate = new Date(doc.date || doc.updatedAt || doc.createdAt);
          if (docDate > customer.lastUpdated) {
            customer.lastUpdated = docDate;
            customer.name = rawCustomerName;
          }

          // 添加文档信息
          customer.documents.push({
            id: doc.id || '',
            type: doc.type,
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
          
          const matchingRecord = allHistory.find((record: any) => {
            let recordCustomerName;
            if (record.type === 'packing') {
              recordCustomerName = record.consigneeName || record.customerName;
            } else {
              recordCustomerName = record.customerName;
            }
            return normalizeCustomerName(recordCustomerName) === normalizeCustomerName(customer.name);
          });
          
          if (matchingRecord) {
            // 如果是报价单或确认单，使用data.to字段
            if (matchingRecord.data && matchingRecord.data.to) {
              customerInfo = matchingRecord.data.to;
            } else if (matchingRecord.to) {
              customerInfo = matchingRecord.to;
            }
            // 如果是装箱单，使用consignee信息
            else if (matchingRecord.type === 'packing' && matchingRecord.data && matchingRecord.data.consignee) {
              customerInfo = matchingRecord.data.consignee.name;
            }
          }
          
          return {
            name: customer.name.split('\n')[0].trim(), // 只取第一行作为显示名称
            to: customerInfo
          };
        });

        setSavedConsignees(formattedCustomers);
      }
    } catch (error) {
      // 兼容旧的保存格式
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('savedPackingConsignees');
        if (saved) {
          setSavedConsignees(JSON.parse(saved));
        }
      }
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
      
      // 检查是否点击了保存的收货人列表弹窗外部
      if (showSavedConsignees && 
          savedConsigneesRef.current && 
          !savedConsigneesRef.current.contains(target) &&
          buttonsRef.current &&
          !buttonsRef.current.contains(target)) {
        setShowSavedConsignees(false);
      }
    };

    // 只在弹窗显示时添加事件监听器
    if (showSavedConsignees) {
      if (typeof window !== 'undefined') {
        document.addEventListener('mousedown', handleClickOutside);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [showSavedConsignees]);

  // 保存收货人信息
  const handleSave = () => {
    if (!consigneeName.trim()) return;

    const consigneeNameFirstLine = consigneeName.split('\n')[0].trim(); // 使用第一行作为收货人名称
    const normalizedConsigneeName = normalizeCustomerName(consigneeNameFirstLine);
    
    // 保存到历史记录中，这样客户页面就能读取到
    if (typeof window !== 'undefined') {
      const packingHistory = JSON.parse(localStorage.getItem('packing_history') || '[]');
      
      // 检查是否已经存在相同的收货人信息
      const existingIndex = packingHistory.findIndex((record: any) => {
        if (!record.consigneeName) return false;
        const recordNormalizedName = normalizeCustomerName(record.consigneeName);
        return recordNormalizedName === normalizedConsigneeName;
      });
      
      if (existingIndex !== -1) {
        // 如果已存在，更新现有记录
        packingHistory[existingIndex] = {
          ...packingHistory[existingIndex],
          consigneeName: consigneeNameFirstLine,
          customerName: consigneeNameFirstLine, // 兼容性字段
          updatedAt: new Date().toISOString(),
          data: {
            ...packingHistory[existingIndex].data,
            consignee: {
              name: consigneeName
            },
            consigneeName: consigneeNameFirstLine
          }
        };
      } else {
        // 如果不存在，创建新的历史记录
        const newRecord = {
          id: Date.now().toString(),
          consigneeName: consigneeNameFirstLine,
          customerName: consigneeNameFirstLine, // 兼容性字段
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          type: 'packing',
          data: {
            consignee: {
              name: consigneeName
            },
            consigneeName: consigneeNameFirstLine
          }
        };
        
        // 添加到历史记录
        packingHistory.push(newRecord);
      }
      
      localStorage.setItem('packing_history', JSON.stringify(packingHistory));
    }
    
    // 重新加载客户数据
    loadCustomerData();
    setShowSavedConsignees(false);
  };

  // 加载收货人信息
  const handleLoad = (consignee: SavedConsignee) => {
    onChange({
      consigneeName: consignee.to, // 使用完整的收货人信息
      orderNo: orderNo // 保持现有的 orderNo 值不变
    });
    
    // 记录使用情况（这里需要从父组件传入invoiceNo）
    // recordCustomerUsage(consignee.name, 'packing', invoiceNo);
    
    setShowSavedConsignees(false);
  };

  return (
    <div className="bg-gray-50 dark:bg-[#1C1C1E] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Consignee</h3>
      <div className="space-y-4">
        {/* 收货人信息 */}
        <div className="relative">
          <textarea
            value={consigneeName}
            onChange={e => onChange({ ...{ consigneeName, orderNo }, consigneeName: e.target.value })}
            className={`${inputClassName} min-h-[120px] resize-none`}
            placeholder="Enter consignee information including company name, address, contact details..."
          />
          <div className="absolute right-2 bottom-2 flex gap-2" ref={buttonsRef}>

            <button
              type="button"
              onClick={() => setShowSavedConsignees(true)}
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

          {/* 保存的收货人列表弹窗 */}
          {showSavedConsignees && savedConsignees.length > 0 && (
            <div 
              ref={savedConsigneesRef}
              className="absolute z-10 right-0 top-full mt-1 w-full max-w-md
                bg-white dark:bg-[#2C2C2E] rounded-xl shadow-lg
                border border-gray-200/50 dark:border-gray-700/50
                p-2"
            >
              <div className="max-h-[200px] overflow-y-auto">
                {savedConsignees.map((consignee, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg"
                  >
                    <button
                      type="button"
                      onClick={() => handleLoad(consignee)}
                      className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {consignee.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* 订单号 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D] mb-2">
            Customer Order No.
          </label>
          <input
            type="text"
            value={orderNo}
            onChange={e => onChange({ ...{ consigneeName, orderNo }, orderNo: e.target.value })}
            className={inputClassName}
            placeholder="Enter order number"
          />
        </div>
      </div>
    </div>
  );
} 