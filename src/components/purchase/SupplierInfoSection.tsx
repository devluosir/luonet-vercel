'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getPurchaseHistory, PurchaseHistory } from '@/utils/purchaseHistory';

interface SupplierInfoSectionProps {
  data: {
    attn: string;
    yourRef: string;
    supplierQuoteDate: string;
  };
  onChange: (data: {
    attn: string;
    yourRef: string;
    supplierQuoteDate: string;
  }) => void;
}

interface SavedSupplier {
  name: string;
  attn: string;
}

const inputClassName = `
  w-full px-4 py-3 border border-gray-200 dark:border-gray-600 
  rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
  focus:ring-2 focus:ring-blue-500 focus:border-transparent 
  transition-all duration-200 text-sm
`;

const dateInputClassName = `
  w-full min-w-0 px-4 py-3 border border-gray-200 dark:border-gray-600 
  rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
  focus:ring-2 focus:ring-blue-500 focus:border-transparent 
  transition-all duration-200 text-sm
`;

const labelClassName = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

// 统一处理供应商名称格式 - 移到组件外部避免重新创建
const normalizeSupplierName = (name: string) => {
  if (!name || typeof name !== 'string') {
    return '未命名供应商';
  }
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
};

export function SupplierInfoSection({ data, onChange }: SupplierInfoSectionProps) {
  const [savedSuppliers, setSavedSuppliers] = useState<SavedSupplier[]>([]);
  const [showSavedSuppliers, setShowSavedSuppliers] = useState(false);
  const [filteredSuppliers, setFilteredSuppliers] = useState<SavedSupplier[]>([]);
  const [hasSelectedSupplier, setHasSelectedSupplier] = useState(false);
  
  // 添加 ref 用于检测点击外部区域
  const savedSuppliersRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  // 加载供应商数据的通用函数
  const loadSupplierData = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        // 从localStorage加载采购历史记录
        const purchaseHistory = getPurchaseHistory();
        
        // 过滤掉无效的记录
        const validPurchaseHistory = purchaseHistory.filter((doc: PurchaseHistory) => {
          const isValid = doc && 
            typeof doc === 'object' && 
            (doc.supplierName || doc.data?.attn);
          return isValid;
        });

        // 统计供应商数据
        const supplierMap = new Map<string, { name: string; lastUpdated: Date; documents: Array<{ id: string; type: string; number: string; date: Date }> }>();
        
        // 处理所有记录
        validPurchaseHistory.forEach((doc: PurchaseHistory) => {
          if (!doc || typeof doc !== 'object') {
            return;
          }

          let rawSupplierName = doc.supplierName || doc.data?.attn || '未命名供应商';
          
          if (!rawSupplierName || rawSupplierName === '未命名供应商') {
            return;
          }

          const supplierName = normalizeSupplierName(rawSupplierName);
          
          if (!supplierMap.has(supplierName)) {
            supplierMap.set(supplierName, {
              name: rawSupplierName,
              lastUpdated: new Date(doc.updatedAt || doc.createdAt || Date.now()),
              documents: []
            });
          }

          const supplier = supplierMap.get(supplierName)!;
          
          // 更新最后更新时间
          const docDate = new Date(doc.updatedAt || doc.createdAt || Date.now());
          if (docDate > supplier.lastUpdated) {
            supplier.lastUpdated = docDate;
            supplier.name = rawSupplierName;
          }

          // 添加文档信息
          supplier.documents.push({
            id: doc.id || '',
            type: 'purchase',
            number: doc.orderNo || doc.data?.orderNo || '-',
            date: docDate
          });
        });

        // 转换为数组并按最后更新时间排序
        const sortedSuppliers = Array.from(supplierMap.values())
          .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

        // 格式化供应商信息，提取完整的供应商信息
        const formattedSuppliers = sortedSuppliers.map((supplier) => {
          let supplierInfo = supplier.name;
          
          // 尝试从历史记录中获取完整的供应商信息
          const matchingRecord = validPurchaseHistory.find((record: PurchaseHistory) => {
            const recordSupplierName = record.supplierName || record.data?.attn;
            return recordSupplierName && normalizeSupplierName(recordSupplierName) === normalizeSupplierName(supplier.name);
          });
          
          if (matchingRecord) {
            // 使用data.attn字段
            if (matchingRecord.data && matchingRecord.data.attn) {
              supplierInfo = matchingRecord.data.attn;
            } else if (matchingRecord.supplierName) {
              supplierInfo = matchingRecord.supplierName;
            }
          }
          
          return {
            name: (supplier.name || '').split('\n')[0].trim() || '未命名供应商', // 只取第一行作为显示名称，添加安全检查
            attn: supplierInfo || ''
          };
        });

        setSavedSuppliers(formattedSuppliers);
      }
    } catch (error) {
      console.error('加载供应商数据失败:', error);
    }
  }, []); // 移除所有依赖项，因为函数内部不依赖任何props或state

  // 加载保存的供应商信息
  useEffect(() => {
    loadSupplierData();
  }, [loadSupplierData]);

  // 根据输入内容过滤供应商
  useEffect(() => {
    // 安全检查：确保 data.attn 存在且为字符串
    const attnValue = data.attn || '';
    
    if (!attnValue.trim()) {
      // 如果输入框为空，显示所有供应商
      setFilteredSuppliers(savedSuppliers);
      setShowSavedSuppliers(false);
      setHasSelectedSupplier(false);
    } else {
      // 根据输入内容过滤供应商
      const filtered = savedSuppliers.filter(supplier => {
        // 安全检查：确保所有字段都存在且为字符串
        const inputLower = attnValue.toLowerCase();
        const nameLower = (supplier.name || '').toLowerCase();
        const attnLower = (supplier.attn || '').toLowerCase();
        
        return nameLower.includes(inputLower) || attnLower.includes(inputLower);
      });
      setFilteredSuppliers(filtered);
      
      // 如果有筛选结果，自动显示弹窗
      if (filtered.length > 0) {
        setShowSavedSuppliers(true);
      } else {
        setShowSavedSuppliers(false);
      }
    }
  }, [data.attn, savedSuppliers]);

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

  // 加载供应商信息
  const handleLoad = useCallback((supplier: SavedSupplier) => {
    onChange({
      ...data,
      attn: supplier.attn
      // 只加载供应商基本信息，不加载报价号码和报价日期
    });
    
    setShowSavedSuppliers(false);
    setHasSelectedSupplier(true);
  }, [data, onChange]);

  return (
    <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
      <div className="space-y-3">
        {/* 供应商 Attn */}
        <div className="relative">
          <label className={labelClassName}>供应商 Attn:</label>
          <textarea
            value={data.attn || ''}
            onChange={e => {
              onChange({ ...data, attn: e.target.value });
              // 当用户开始输入时，重置选择状态
              if (e.target.value !== (data.attn || '')) {
                setHasSelectedSupplier(false);
              }
            }}
            onFocus={() => {
              // 只有当用户没有选择过供应商，或者正在输入内容时才显示弹窗
              if (filteredSuppliers.length > 0 && !hasSelectedSupplier) {
                setShowSavedSuppliers(true);
              }
            }}
            onBlur={() => {
              // 延迟关闭，让用户有时间点击列表项
              setTimeout(() => {
                setShowSavedSuppliers(false);
              }, 200);
            }}
            placeholder="Enter supplier name and address"
            rows={2}
            className={`${inputClassName} min-h-[80px]`}
          />
          {/* 移除Load按钮，改为自动显示筛选结果 */}

          {/* 保存的供应商列表弹窗 */}
          {showSavedSuppliers && filteredSuppliers.length > 0 && (
            <div 
              ref={savedSuppliersRef}
              className="absolute z-50 right-0 top-full mt-1 w-full max-w-md
                bg-white dark:bg-[#2C2C2E] rounded-xl shadow-lg
                border border-gray-200/50 dark:border-gray-700/50
                p-2"
            >
              <div className="text-xs text-gray-500 mb-2 px-2">
                找到 {filteredSuppliers.length} 个匹配的供应商
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {filteredSuppliers.map((supplier, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg"
                  >
                    <button
                      type="button"
                      onClick={() => handleLoad(supplier)}
                      className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {supplier.attn}
                      </div>
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
            value={data.yourRef || ''}
            onChange={e => onChange({ ...data, yourRef: e.target.value })}
          />
        </div>

        {/* 报价日期 Quote Date */}
        <div>
          <label className={labelClassName}>报价日期 Quote Date:</label>
          <input
            type="date"
            className={dateInputClassName}
            value={data.supplierQuoteDate || ''}
            onChange={e => onChange({ ...data, supplierQuoteDate: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
} 