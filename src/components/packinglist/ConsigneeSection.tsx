'use client';

import { useState, useEffect, useRef } from 'react';
import { getCustomersForDropdown, customerService } from '@/features/customer/services/customerService';

interface SavedConsignee {
  name: string;
  to: string;
}

interface ConsigneeSectionProps {
  consigneeName: string;
  orderNo: string;
  onChange: (data: { consigneeName: string; orderNo: string }) => void;
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
  // 使用统一的客户数据服务，从客户管理页面获取数据
  const loadCustomerData = async () => {
    try {
      if (typeof window !== 'undefined') {
        // 使用统一的客户数据服务
        const allCustomers = await getCustomersForDropdown('consignee');
        
        console.log('从客户管理服务加载的客户数据:', {
          totalCustomers: allCustomers.length,
          customers: allCustomers
        });
        
        // 转换为装箱单格式
        const consignees: SavedConsignee[] = allCustomers.map(customer => ({
          name: customer.name,
          to: customer.to
        }));
        
        setSavedConsignees(consignees);
      }
    } catch (error) {
      console.error('加载客户数据失败:', error);
      setSavedConsignees([]);
    }
  };

  // 加载保存的客户信息
  useEffect(() => {
    void loadCustomerData();
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
  const handleSave = async () => {
    if (!consigneeName.trim()) return;

    const consigneeNameFirstLine = consigneeName.split('\n')[0].trim(); // 使用第一行作为收货人名称

    try {
      await customerService.saveCustomerProfile({
        type: 'consignee',
        name: consigneeNameFirstLine,
        address: consigneeName,
        contacts: [],
      });
      await loadCustomerData();
      setShowSavedConsignees(false);
    } catch (error) {
      console.error('保存收货人失败:', error);
    }
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
                {savedConsignees.map((consignee, index) => {
                  const title = consignee.name; // 使用提取的标题
                  const content = consignee.to; // 完整信息作为内容
                  
                  return (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg"
                    >
                      <button
                        type="button"
                        onClick={() => handleLoad(consignee)}
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
