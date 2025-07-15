'use client';

import { useState, useEffect, useRef } from 'react';
import { recordCustomerUsage } from '@/utils/customerUsageTracker';

interface SavedConsignee {
  name: string;
  orderNo: string;
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

  // 加载保存的收货人信息
  useEffect(() => {
    // 从客户管理页面加载数据
    const customerRecords = localStorage.getItem('customerRecords');
    if (customerRecords) {
      const records = JSON.parse(customerRecords);
      const formattedConsignees = records.map((record: any) => ({
        name: record.name,
        orderNo: ''
      }));
      setSavedConsignees(formattedConsignees);
    } else {
      // 兼容旧的保存格式
      const saved = localStorage.getItem('savedPackingConsignees');
      if (saved) {
        setSavedConsignees(JSON.parse(saved));
      }
    }
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
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSavedConsignees]);

  // 保存收货人信息
  const handleSave = () => {
    if (!consigneeName.trim()) return;

    const consigneeNameFirstLine = consigneeName.split('\n')[0].trim(); // 使用第一行作为收货人名称
    
    // 从客户管理页面获取现有数据
    const customerRecords = localStorage.getItem('customerRecords');
    let records = customerRecords ? JSON.parse(customerRecords) : [];
    
    // 查找现有记录
    const existingIndex = records.findIndex((record: any) => record.name === consigneeNameFirstLine);
    
    const newRecord = {
      id: existingIndex >= 0 ? records[existingIndex].id : Date.now().toString(),
      name: consigneeNameFirstLine,
      content: consigneeName,
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
    const formattedConsignees = records.map((record: any) => ({
      name: record.name,
      orderNo: ''
    }));
    setSavedConsignees(formattedConsignees);
    
    setShowSavedConsignees(false);
  };

  // 删除保存的收货人信息
  const handleDelete = (consigneeName: string) => {
    // 从客户管理页面获取现有数据
    const customerRecords = localStorage.getItem('customerRecords');
    if (!customerRecords) return;
    
    let records = JSON.parse(customerRecords);
    
    // 删除指定记录
    records = records.filter((record: any) => record.name !== consigneeName);
    
    // 保存到客户管理页面
    localStorage.setItem('customerRecords', JSON.stringify(records));
    
    // 更新本地状态
    const formattedConsignees = records.map((record: any) => ({
      name: record.name,
      orderNo: ''
    }));
    setSavedConsignees(formattedConsignees);
  };

  // 加载收货人信息
  const handleLoad = (consignee: SavedConsignee) => {
    onChange({
      consigneeName: consignee.name,
      orderNo: consignee.orderNo
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
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg"
                  >
                    <button
                      type="button"
                      onClick={() => handleLoad(consignee)}
                      className="flex-1 text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {consignee.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(consignee.name)}
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