'use client';

import { useState, useEffect, useRef } from 'react';
import { getPurchaseHistory } from '@/utils/purchaseHistory';
import { format } from 'date-fns';

interface SupplierInfoSectionProps {
  data: {
    attn: string;
    yourRef: string;
    supplierQuoteDate: string;
  };
  onChange: (data: any) => void;
}

interface SavedSupplier {
  name: string;
  attn: string;
  yourRef: string; // 保持兼容性，但实际不使用
  supplierQuoteDate: string; // 保持兼容性，但实际不使用
}

const inputClassName = `
  w-full px-4 py-3 border border-gray-200 dark:border-gray-600 
  rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
  focus:ring-2 focus:ring-blue-500 focus:border-transparent 
  transition-all duration-200 text-sm
`;

const labelClassName = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

export function SupplierInfoSection({ data, onChange }: SupplierInfoSectionProps) {
  const [savedSuppliers, setSavedSuppliers] = useState<SavedSupplier[]>([]);
  const [showSavedSuppliers, setShowSavedSuppliers] = useState(false);
  
  // 添加 ref 用于检测点击外部区域
  const savedSuppliersRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  // 统一处理供应商名称格式
  const normalizeSupplierName = (name: string) => {
    if (!name || typeof name !== 'string') {
      return '未命名供应商';
    }
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  };

  // 加载供应商数据的通用函数
  const loadSupplierData = () => {
    try {
      const purchaseHistory = getPurchaseHistory();
      
      // 从采购历史中提取供应商信息
      const supplierMap = new Map<string, SavedSupplier>();
      
      purchaseHistory.forEach((record: any) => {
        if (record.data && record.data.attn) {
          const supplierName = normalizeSupplierName(record.data.attn);
          
          if (!supplierMap.has(supplierName)) {
            supplierMap.set(supplierName, {
              name: record.data.attn,
              attn: record.data.attn || '',
              yourRef: '', // 不保存报价号码
              supplierQuoteDate: '' // 不保存报价日期
            });
          } else {
            // 如果已存在，使用最新的数据
            const existing = supplierMap.get(supplierName)!;
            const recordDate = new Date(record.updatedAt || record.createdAt);
            const existingDate = new Date(existing.supplierQuoteDate || '1970-01-01');
            
            if (recordDate > existingDate) {
              supplierMap.set(supplierName, {
                name: record.data.attn,
                attn: record.data.attn || '',
                yourRef: '', // 不保存报价号码
                supplierQuoteDate: '' // 不保存报价日期
              });
            }
          }
        }
      });
      
      setSavedSuppliers(Array.from(supplierMap.values()));
    } catch (error) {
      console.error('加载供应商数据失败:', error);
    }
  };

  // 加载保存的供应商信息
  useEffect(() => {
    loadSupplierData();
  }, []);

  // 添加点击外部区域关闭弹窗的功能
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // 检查是否点击了保存的供应商列表弹窗外部
      if (showSavedSuppliers && 
          savedSuppliersRef.current && 
          !savedSuppliersRef.current.contains(target) &&
          buttonsRef.current &&
          !buttonsRef.current.contains(target)) {
        setShowSavedSuppliers(false);
      }
    };

    // 只在弹窗显示时添加事件监听器
    if (showSavedSuppliers) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSavedSuppliers]);

  // 保存供应商信息
  const handleSave = () => {
    if (!data.attn.trim()) return;

    const supplierName = data.attn.split('\n')[0].trim(); // 使用第一行作为供应商名称
    
    // 保存到历史记录中，这样客户页面就能读取到
    const purchaseHistory = JSON.parse(localStorage.getItem('purchase_history') || '[]');
    
    // 创建新的历史记录
    const newRecord = {
      id: Date.now().toString(),
      supplierName: supplierName,
      attn: data.attn,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'purchase',
      data: {
        attn: data.attn
        // 只保存供应商基本信息，不保存报价号码和报价日期
      }
    };
    
    // 添加到历史记录
    purchaseHistory.push(newRecord);
    localStorage.setItem('purchase_history', JSON.stringify(purchaseHistory));
    
    // 重新加载供应商数据
    loadSupplierData();
    setShowSavedSuppliers(false);
  };

  // 加载供应商信息
  const handleLoad = (supplier: SavedSupplier) => {
    onChange({
      ...data,
      attn: supplier.attn
      // 只加载供应商基本信息，不加载报价号码和报价日期
    });
    
    setShowSavedSuppliers(false);
  };

  return (
    <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
      <div className="space-y-3">
        {/* 供应商 Attn */}
        <div className="relative">
          <label className={labelClassName}>供应商 Attn:</label>
          <textarea
            value={data.attn}
            onChange={e => onChange({ ...data, attn: e.target.value })}
            placeholder="Enter supplier name and address"
            rows={2}
            className={`${inputClassName} min-h-[80px]`}
          />
          <div className="absolute right-2 bottom-2 flex gap-2" ref={buttonsRef}>
            <button
              type="button"
              onClick={() => setShowSavedSuppliers(true)}
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

          {/* 保存的供应商列表弹窗 */}
          {showSavedSuppliers && savedSuppliers.length > 0 && (
            <div 
              ref={savedSuppliersRef}
              className="absolute z-10 right-0 top-full mt-1 w-full max-w-md
                bg-white dark:bg-[#2C2C2E] rounded-xl shadow-lg
                border border-gray-200/50 dark:border-gray-700/50
                p-2"
            >
              <div className="max-h-[200px] overflow-y-auto">
                {savedSuppliers.map((supplier, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg"
                  >
                    <button
                      type="button"
                      onClick={() => handleLoad(supplier)}
                      className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {supplier.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 报价号码 Your ref */}
        <div>
          <label className={labelClassName}>报价号码 Your ref:</label>
          <input
            className={inputClassName}
            value={data.yourRef}
            onChange={e => onChange({ ...data, yourRef: e.target.value })}
          />
        </div>

        {/* 报价日期 Quote Date */}
        <div>
          <label className={labelClassName}>报价日期 Quote Date:</label>
          <input
            type="date"
            className={inputClassName}
            value={data.supplierQuoteDate}
            onChange={e => onChange({ ...data, supplierQuoteDate: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
} 