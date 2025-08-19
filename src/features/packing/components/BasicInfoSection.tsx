'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BasicInfoSectionProps } from '../types';
import { getCustomersForDropdown } from '../../../utils/customerDataService';

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

// 收货人选择字段组件
function ConsigneeField({ 
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [savedConsignees, setSavedConsignees] = useState<Array<{name: string; to: string}>>([]);
  const [filteredConsignees, setFilteredConsignees] = useState<Array<{name: string; to: string}>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizeKey = (name: string, to: string) => `${(name || '').trim().toLowerCase()}__${(to || '').trim().toLowerCase()}`;

  // 从客户管理服务加载收货人数据
  useEffect(() => {
    try {
      const allConsignees = getCustomersForDropdown();
      
      console.log('从客户管理服务加载的收货人数据:', {
        totalConsignees: allConsignees.length,
        consignees: allConsignees
      });
      
      setSavedConsignees(allConsignees);
      setFilteredConsignees(allConsignees);
    } catch (error) {
      console.warn('Failed to load consignees from customer service:', error);
      setSavedConsignees([]);
      setFilteredConsignees([]);
    }
  }, []);

  // 根据输入实时过滤
  useEffect(() => {
    const input = (value || '').trim().toLowerCase();
    if (!input) {
      setFilteredConsignees(savedConsignees);
      return;
    }
    const filtered = savedConsignees.filter(c =>
      c.name.toLowerCase().includes(input) || c.to.toLowerCase().includes(input)
    );
    setFilteredConsignees(filtered);
  }, [value, savedConsignees]);

  // 处理收货人选择
  const handleConsigneeSelect = useCallback(
    (consignee: {name: string; to: string}, e?: React.MouseEvent) => {
      if (e) e.preventDefault();
      onChange(consignee.to);
      setShowDropdown(false);
    },
    [onChange]
  );

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showDropdown]);

  return (
    <div ref={containerRef} className="group block relative">
      <textarea
        rows={2}
        placeholder={' '}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        className="fi-multiline h-[90px] resize-y"
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

      {/* 收货人选择下拉菜单 */}
      {showDropdown && filteredConsignees.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1
          bg-white dark:bg-gray-800 rounded-xl shadow-lg
          border border-gray-200 dark:border-gray-700
          max-h-[220px] overflow-y-auto">
          <div className="text-xs text-gray-500 dark:text-gray-400 p-2 border-b border-gray-100 dark:border-gray-700">
            选择收货人（{filteredConsignees.length}）
          </div>
          {filteredConsignees.map((consignee, index) => (
            <div
              key={`${consignee.name}-${index}`}
              className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              onMouseDown={(e) => handleConsigneeSelect(consignee, e)}
            >
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {consignee.name || '未命名收货人'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {consignee.to}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps & {
  onShowShippingMarks: () => void;
}> = ({ data, onDataChange, onShowShippingMarks }) => {

  const handleConsigneeChange = (consigneeName: string) => {
    onDataChange({ ...data, consignee: { ...data.consignee, name: consigneeName } });
  };

  const handleOrderNoChange = (orderNo: string) => {
    onDataChange({ ...data, orderNo });
  };

  return (
    <section>
      {/* 对称布局：左右各6列 */}
      <div className="grid grid-cols-12 gap-3">
        {/* 左侧：收货人信息 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-6">
          <div className="space-y-3">
            <div>
              <ConsigneeField
                label="收货人信息 Consignee Information"
                value={data.consignee.name || ''}
                onChange={handleConsigneeChange}
                placeholder={' '}
              />
            </div>
            {/* 订单号 */}
            <div>
              <Field label="订单号 Order No.">
                <input
                  placeholder={' '}
                  value={data.orderNo || ''}
                  onChange={(e) => handleOrderNoChange(e.target.value)}
                  className="fi"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* 右侧：单据信息 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-6 space-y-[10px]">
          {/* 第一行：发票号 + 日期并排 */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-7">
              <Field label="发票号 Invoice No.">
                <input
                  placeholder={' '}
                  value={data.invoiceNo || ''}
                  onChange={(e) => onDataChange({ ...data, invoiceNo: e.target.value })}
                  className="fi"
                />
              </Field>
            </div>
            <div className="col-span-5">
              <Field label="日期 Date">
                <input
                  type="date"
                  value={data.date || ''}
                  onChange={(e) => onDataChange({ ...data, date: e.target.value })}
                  className="fi"
                />
              </Field>
            </div>
          </div>
          
          {/* 第二行：唛头号 */}
          <div>
            <div className="relative">
              <Field label="唛头号 Shipping Marks">
                <input
                  placeholder={' '}
                  value={data.markingNo || ''}
                  onChange={(e) => onDataChange({ ...data, markingNo: e.target.value })}
                  className="fi pr-10"
                />
              </Field>
              <button
                type="button"
                onClick={onShowShippingMarks}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#007AFF] hover:text-[#0056CC] transition-colors"
                title="编辑唛头"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
