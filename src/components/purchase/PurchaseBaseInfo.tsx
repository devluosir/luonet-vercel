import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAutoResizeTextareas } from '@/hooks/useAutoResizeTextareas';
import { getPurchaseHistory, PurchaseHistory } from '@/utils/purchaseHistory';
import { getLocalStorageJSON, getLocalStorageString } from '@/utils/safeLocalStorage';

export interface PurchaseBaseInfoValue {
  attn?: string;
  yourRef?: string;
  supplierQuoteDate?: string;
  orderNo?: string;
  ourRef?: string;
  date?: string;
  from?: string;
}

export interface PurchaseBaseInfoConfig {
  type: 'create' | 'edit' | 'copy';
  showFields?: {
    attn?: boolean;
    yourRef?: boolean;
    supplierQuoteDate?: boolean;
    orderNo?: boolean;
    ourRef?: boolean;
    date?: boolean;
    from?: boolean;
  };
  labels?: Partial<Record<keyof PurchaseBaseInfoValue, string>>;
  required?: (keyof PurchaseBaseInfoValue)[];
}

export interface PurchaseBaseInfoProps {
  value: PurchaseBaseInfoValue;
  onChange: (value: PurchaseBaseInfoValue) => void;
  config: PurchaseBaseInfoConfig;
  className?: string;
}

// 浮动标签字段组件
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="group block relative">
      {children}
      <span
        className="
          pointer-events-none absolute left-3 top-[14px] text-[13px] text-slate-400 dark:text-gray-400
          transition-all bg-white/80 dark:bg-gray-800/80 px-1 z-10
          group-[&:has(input:focus)]:top-0 group-[&:has(textarea:focus)]:top-0
          group-[&:has(input:not(:placeholder-shown))]:top-0
          group-[&:has(textarea:not(:placeholder-shown))]:top-0
          -translate-y-1/2 group-[&:has(input:focus)]:-translate-y-1/2 group-[&:has(textarea:focus)]:-translate-y-1/2
        "
      >
        {label}
      </span>
    </label>
  );
}

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

interface SavedSupplier {
  name: string;
  attn: string;
}

// 供应商信息字段组件（带浮动标签的textarea和自动完成）
function SupplierField({ 
  label, 
  value, 
  onChange, 
  placeholder 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string; 
}) {
  const [savedSuppliers, setSavedSuppliers] = useState<SavedSupplier[]>([]);
  const [showSavedSuppliers, setShowSavedSuppliers] = useState(false);
  const [filteredSuppliers, setFilteredSuppliers] = useState<SavedSupplier[]>([]);
  const [hasSelectedSupplier, setHasSelectedSupplier] = useState(false);
  
  // 添加 ref 用于检测点击外部区域
  const savedSuppliersRef = useRef<HTMLDivElement>(null);

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
  }, []);

  // 加载保存的供应商信息
  useEffect(() => {
    loadSupplierData();
  }, [loadSupplierData]);

  // 根据输入内容过滤供应商
  useEffect(() => {
    const attnValue = value || '';
    
    if (!attnValue.trim()) {
      // 如果输入框为空，显示所有供应商
      setFilteredSuppliers(savedSuppliers);
      setShowSavedSuppliers(false);
      setHasSelectedSupplier(false);
    } else {
      // 根据输入内容过滤供应商
      const filtered = savedSuppliers.filter(supplier => {
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
  }, [value, savedSuppliers]);

  // 添加点击外部区域关闭弹窗的功能
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // 检查是否点击了保存的供应商列表弹窗外部
      if (showSavedSuppliers && 
          savedSuppliersRef.current && 
          !savedSuppliersRef.current.contains(target)) {
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
    onChange(supplier.attn);
    setShowSavedSuppliers(false);
    setHasSelectedSupplier(true);
  }, [onChange]);

  return (
    <div className="group block relative">
      <textarea
        placeholder={' '}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          // 当用户开始输入时，重置选择状态
          if (e.target.value !== value) {
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
        className="fi h-[36px] resize-y"
        style={{ height: '36px', minHeight: '36px' }}
      />
      <span
        className="
          pointer-events-none absolute left-3 top-[14px] text-[13px] text-slate-400 dark:text-gray-400
          transition-all bg-white/80 dark:bg-gray-800/80 px-1 z-10
          group-[&:has(textarea:focus)]:top-0
          group-[&:has(textarea:not(:placeholder-shown))]:top-0
          -translate-y-1/2 group-[&:has(textarea:focus)]:-translate-y-1/2
        "
      >
        {label}
      </span>

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
  );
}

export default function PurchaseBaseInfo({ 
  value, 
  onChange, 
  config, 
  className = ''
}: PurchaseBaseInfoProps) {
  
  // 使用useCallback优化set函数，避免无限循环
  const set = useCallback((key: keyof PurchaseBaseInfoValue) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      onChange({ ...value, [key]: e.target.value });
    }, [onChange, value]);

  // 使用useCallback优化SupplierField的onChange回调
  const handleAttnChange = useCallback((newValue: string) => {
    onChange({ ...value, attn: newValue });
  }, [onChange, value]);

  // 移除自动设置from字段的useEffect，因为store已经在初始化时正确设置了

  // 默认显示字段配置
  const defaultShowFields = {
    attn: true,
    yourRef: true,
    supplierQuoteDate: true,
    orderNo: true,
    ourRef: true,
    date: true,
    from: true,
  };

  const showFields = { ...defaultShowFields, ...config.showFields };

  // 默认标签配置 - 根据页面类型动态设置
  const getDefaultLabels = (): Record<keyof PurchaseBaseInfoValue, string> => {
    switch (config.type) {
      case 'create':
        return {
          attn: '供应商信息 Supplier Information',
          yourRef: 'Your Ref',
          supplierQuoteDate: '报价日期 Quote Date',
          orderNo: '订单号 Order No.',
          ourRef: '询价号码 Our ref',
          date: '日期 Date',
          from: 'From',
        };
      case 'edit':
        return {
          attn: '供应商信息 Supplier Information',
          yourRef: 'Your Ref',
          supplierQuoteDate: '报价日期 Quote Date',
          orderNo: '订单号 Order No.',
          ourRef: '询价号码 Our ref',
          date: '日期 Date',
          from: 'From',
        };
      case 'copy':
        return {
          attn: '供应商信息 Supplier Information',
          yourRef: 'Your Ref',
          supplierQuoteDate: '报价日期 Quote Date',
          orderNo: '订单号 Order No.',
          ourRef: '询价号码 Our ref',
          date: '日期 Date',
          from: 'From',
        };
      default:
        return {
          attn: '供应商信息 Supplier Information',
          yourRef: 'Your Ref',
          supplierQuoteDate: '报价日期 Quote Date',
          orderNo: '订单号 Order No.',
          ourRef: '询价号码 Our ref',
          date: '日期 Date',
          from: 'From',
        };
    }
  };

  const defaultLabels = getDefaultLabels();
  const labels = { ...defaultLabels, ...config.labels };

  // 根据页面类型动态调整字段配置
  const getFieldsForType = () => {
    switch (config.type) {
      case 'create':
        return {
          ...showFields,
          attn: true,
          yourRef: true,
          supplierQuoteDate: true,
          orderNo: true,
          ourRef: true,
          date: true,
          from: true,
        };
      case 'edit':
        return {
          ...showFields,
          attn: true,
          yourRef: true,
          supplierQuoteDate: true,
          orderNo: true,
          ourRef: true,
          date: true,
          from: true,
        };
      case 'copy':
        return {
          ...showFields,
          attn: true,
          yourRef: true,
          supplierQuoteDate: true,
          orderNo: true,
          ourRef: true,
          date: true,
          from: true,
        };
      default:
        return showFields;
    }
  };

  const fields = getFieldsForType();

  // From选项 - 基于localStorage用户信息
const getFromOptions = useCallback(() => {
  const options = ['Roger', 'Sharon', 'Emily', 'Summer', 'Nina'];
  
  // 在服务器端渲染时，只返回基本选项避免水合错误
  if (typeof window === 'undefined') {
    return options;
  }
  
  // 从localStorage获取当前用户名，与报价页面保持一致
  const currentUser = (() => {
    try {
      const userInfo = getLocalStorageJSON('userInfo', null) as { username?: string } | null;
      if (userInfo) return userInfo.username || '';
      
      // 使用安全的字符串获取函数
      const name = getLocalStorageString('username');
      return name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : '';
    } catch { 
      return '' 
    }
  })();
  
  // 如果当前用户不在预设列表中，将其添加到列表开头
  if (currentUser && !options.some(option => option.toLowerCase() === currentUser.toLowerCase())) {
    options.unshift(currentUser);
  }
  
  // 如果当前值不在列表中，也添加进去
  if (value.from && !options.some(option => option.toLowerCase() === value.from!.toLowerCase())) {
    options.unshift(value.from);
  }
  
  return options;
}, [value.from]);

  // 使用useState和useEffect来避免水合错误
  const [fromOptions, setFromOptions] = useState<string[]>(['Roger', 'Sharon', 'Emily', 'Summer', 'Nina']);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const options = getFromOptions();
    setFromOptions(options);
    
    // 如果当前from值是默认值（Roger），且当前用户不是Roger，则自动更新为当前用户
    if (value.from === 'Roger' && typeof window !== 'undefined') {
      try {
        const userInfo = getLocalStorageJSON('userInfo', null) as { username?: string } | null;
        const currentUser = userInfo?.username || getLocalStorageString('username');
        
        if (currentUser && currentUser.toLowerCase() !== 'roger') {
          const formattedUser = currentUser.charAt(0).toUpperCase() + currentUser.slice(1).toLowerCase();
          // 调用onChange来更新from值
          onChange({
            ...value,
            from: formattedUser
          });
        }
      } catch (error) {
        console.warn('自动更新from字段失败:', error);
      }
    }
  }, [getFromOptions, value.from, onChange, value]);

  return (
    <section className={`rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/30 shadow-sm p-4 ${className || ''}`}>
      {/* 对称布局：左右各6列 */}
      <div className="grid grid-cols-12 gap-3">
        {/* 左侧：供应商信息 */}
        {fields.attn && (
          <div className="col-span-12 md:col-span-6 lg:col-span-6 space-y-3">
            {/* 第一行：供应商信息 */}
            <div>
              <SupplierField
                label={labels.attn!}
                value={value.attn || ''}
                onChange={handleAttnChange}
                placeholder={' '}
              />
            </div>
            {/* 第二行：Your Ref + 报价日期 并排 */}
            <div className="grid grid-cols-12 gap-2">
              {fields.yourRef && (
                <div className="col-span-7">
                  <Field label={labels.yourRef!}>
                    <input
                      placeholder={' '}
                      value={value.yourRef || ''}
                      onChange={set('yourRef')}
                      className="fi"
                    />
                  </Field>
                </div>
              )}
              {fields.supplierQuoteDate && (
                <div className="col-span-5">
                  <Field label={labels.supplierQuoteDate!}>
                    <input
                      type="date"
                      value={value.supplierQuoteDate?.replaceAll('/', '-') || ''}
                      onChange={set('supplierQuoteDate')}
                      className="fi"
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 右侧：订单信息 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-6 space-y-4">
          {/* 第一行：订单号 + From 并排 */}
          <div className="grid grid-cols-12 gap-2">
            {fields.orderNo && (
              <div className="col-span-7">
                <Field label={labels.orderNo!}>
                  <input
                    placeholder={' '}
                    value={value.orderNo || ''}
                    onChange={set('orderNo')}
                    className="fi"
                  />
                </Field>
              </div>
            )}
            {fields.from && (
              <div className="col-span-5">
                <select
                  value={value.from || ''}
                  onChange={set('from')}
                  className="fi"
                  data-type="select"
                  suppressHydrationWarning
                >
                  {isClient ? (
                    fromOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))
                  ) : (
                    // 服务器端渲染时只显示基本选项，避免水合错误
                    ['Roger', 'Sharon', 'Emily', 'Summer', 'Nina'].map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>
          {/* 第二行：询价号 + 日期并排 */}
          <div className="grid grid-cols-12 gap-2">
            {fields.ourRef && (
              <div className="col-span-7">
                <Field label={labels.ourRef!}>
                  <input
                    placeholder={' '}
                    value={value.ourRef || ''}
                    onChange={set('ourRef')}
                    className="fi"
                  />
                </Field>
              </div>
            )}
            {fields.date && (
              <div className="col-span-5">
                <Field label={labels.date!}>
                  <input
                    type="date"
                    value={value.date?.replaceAll('/', '-') || ''}
                    onChange={set('date')}
                    className="fi"
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
