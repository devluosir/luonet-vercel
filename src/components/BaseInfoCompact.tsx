import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface BaseInfoCompactValue {
  customer?: string;
  inquiryNo?: string;
  contractNo?: string;
  quotationNo?: string;
  date?: string;
  // 扩展字段支持不同页面的特殊需求
  customerPO?: string;
  supplierInfo?: string;
  yourRef?: string;
  supplierQuoteDate?: string;
  orderNo?: string;
  invoiceNo?: string;
  consigneeName?: string;
}

export interface BaseInfoCompactConfig {
  type: 'quotation' | 'confirmation' | 'purchase' | 'invoice' | 'packing';
  showFields?: {
    customer?: boolean;
    inquiryNo?: boolean;
    contractNo?: boolean;
    quotationNo?: boolean;
    date?: boolean;
    customerPO?: boolean;
    supplierInfo?: boolean;
    yourRef?: boolean;
    supplierQuoteDate?: boolean;
    orderNo?: boolean;
    invoiceNo?: boolean;
    consigneeName?: boolean;
  };
  labels?: Partial<Record<keyof BaseInfoCompactValue, string>>;
  required?: (keyof BaseInfoCompactValue)[];
}

interface BaseInfoCompactProps {
  value: BaseInfoCompactValue;
  onChange: (value: BaseInfoCompactValue) => void;
  config: BaseInfoCompactConfig;
  className?: string;
  compact?: boolean;
}

export default function BaseInfoCompact({ 
  value, 
  onChange, 
  config, 
  className = '',
  compact = true 
}: BaseInfoCompactProps) {
  const set = (key: keyof BaseInfoCompactValue) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ ...value, [key]: e.target.value });
    };

  // 默认显示字段配置
  const defaultShowFields = {
    customer: true,
    inquiryNo: true,
    contractNo: true,
    quotationNo: true,
    date: true,
    customerPO: false,
    supplierInfo: false,
    yourRef: false,
    supplierQuoteDate: false,
    orderNo: false,
    invoiceNo: false,
    consigneeName: false,
  };

  const showFields = { ...defaultShowFields, ...config.showFields };

  // 默认标签配置
  const defaultLabels: Record<keyof BaseInfoCompactValue, string> = {
    customer: 'Customer Information',
    inquiryNo: 'Inquiry No.',
    contractNo: 'Contract No.',
    quotationNo: 'Quotation No.',
    date: 'Date',
    customerPO: 'Customer P/O',
    supplierInfo: 'Supplier Information',
    yourRef: 'Your Ref',
    supplierQuoteDate: 'Quote Date',
    orderNo: 'Order No.',
    invoiceNo: 'Invoice No.',
    consigneeName: 'Consignee',
  };

  const labels = { ...defaultLabels, ...config.labels };

  // 根据页面类型动态调整字段配置
  const getFieldsForType = () => {
    switch (config.type) {
      case 'quotation':
        return {
          ...showFields,
          customer: true,
          inquiryNo: true,
          quotationNo: true,
          date: true,
          contractNo: false,
        };
      case 'confirmation':
        return {
          ...showFields,
          customer: true,
          inquiryNo: true,
          contractNo: true,
          quotationNo: true,
          date: true,
        };
      case 'purchase':
        return {
          ...showFields,
          supplierInfo: true,
          yourRef: true,
          supplierQuoteDate: true,
          customer: false,
          inquiryNo: false,
          quotationNo: false,
        };
      case 'invoice':
        return {
          ...showFields,
          customer: true,
          customerPO: true,
          invoiceNo: true,
          date: true,
          inquiryNo: false,
          quotationNo: false,
        };
      case 'packing':
        return {
          ...showFields,
          consigneeName: true,
          orderNo: true,
          invoiceNo: true,
          date: true,
          customer: false,
          inquiryNo: false,
          quotationNo: false,
        };
      default:
        return showFields;
    }
  };

  const fields = getFieldsForType();

  if (!compact) {
    // 非紧凑模式，使用传统布局（后续可以实现）
    return <div>Traditional layout (to be implemented)</div>;
  }

  return (
    <section className={`rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/30 shadow-sm p-4 ${className || ''}`}>
      {/* 行1：左大右小 */}
      <div className="grid grid-cols-12 gap-3">
        {/* 客户信息 */}
        {fields.customer && (
          <div className="col-span-12 lg:col-span-7">
            <CustomerField
              label={labels.customer!}
              value={value.customer || ''}
              onChange={(newValue) => onChange({ ...value, customer: newValue })}
              placeholder={''}
            />
          </div>
        )}

        {/* 供应商信息 */}
        {fields.supplierInfo && (
          <div className="col-span-12 lg:col-span-7">
            <Field label={labels.supplierInfo!}>
              <textarea
                rows={2}
                placeholder={' '}
                value={value.supplierInfo || ''}
                onChange={set('supplierInfo')}
                className="fi-multiline h-[90px] resize-y"
              />
            </Field>
          </div>
        )}

        {/* 收货人信息 */}
        {fields.consigneeName && (
          <div className="col-span-12 lg:col-span-7">
            <Field label={labels.consigneeName!}>
              <textarea
                rows={2}
                placeholder={' '}
                value={value.consigneeName || ''}
                onChange={set('consigneeName')}
                className="fi-multiline h-[90px] resize-y"
              />
            </Field>
          </div>
        )}

        {/* 右侧：根据页面类型显示不同布局 */}
        <div className="col-span-12 lg:col-span-5 space-y-[10px]">
          {/* 报价单模式 */}
          {config.type === 'quotation' && (
            <>
              {/* 第一行：报价号 + 日期并排 */}
              <div className="grid grid-cols-12 gap-2">
                {fields.quotationNo && (
                  <div className="col-span-7">
                    <Field label={`${labels.quotationNo!}${config.required?.includes('quotationNo') ? ' *' : ''}`}>
                      <input
                        placeholder={''}
                        value={value.quotationNo || ''}
                        onChange={set('quotationNo')}
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
              {/* 第二行：询价号 */}
              {fields.inquiryNo && (
                <Field label={labels.inquiryNo!}>
                  <input
                    placeholder={''}
                    value={value.inquiryNo || ''}
                    onChange={set('inquiryNo')}
                    className="fi"
                  />
                </Field>
              )}
            </>
          )}

          {/* 销售确认模式 */}
          {config.type === 'confirmation' && (
            <>
              {/* 第一行：合同号 + 日期并排 */}
              <div className="grid grid-cols-12 gap-2">
                {fields.contractNo && (
                  <div className="col-span-7">
                    <Field label={`${labels.contractNo!}${config.required?.includes('contractNo') ? ' *' : ''}`}>
                      <input
                        placeholder={''}
                        value={value.contractNo || ''}
                        onChange={set('contractNo')}
                        className={`fi ${value.contractNo && value.contractNo.trim() ? 'text-red-600 dark:text-red-400' : ''}`}
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
              {/* 第二行：询价号 + 报价号并排 */}
              <div className="grid grid-cols-12 gap-2">
                {fields.inquiryNo && (
                  <div className="col-span-7">
                    <Field label={labels.inquiryNo!}>
                      <input
                        placeholder={''}
                        value={value.inquiryNo || ''}
                        onChange={set('inquiryNo')}
                        className="fi"
                      />
                    </Field>
                  </div>
                )}
                {fields.quotationNo && (
                  <div className="col-span-5">
                    <Field label={labels.quotationNo!}>
                      <input
                        placeholder={''}
                        value={value.quotationNo || ''}
                        onChange={set('quotationNo')}
                        className="fi"
                      />
                    </Field>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 其他页面类型的默认布局 */}
          {!['quotation', 'confirmation'].includes(config.type) && (
            <>
              {/* 日期 */}
              {fields.date && (
                <Field label={labels.date!}>
                  <input
                    type="date"
                    value={value.date?.replaceAll('/', '-') || ''}
                    onChange={set('date')}
                    className="fi"
                  />
                </Field>
              )}

              {/* 重要单据号 */}
              {fields.invoiceNo && (
                <Field label={`${labels.invoiceNo!}${config.required?.includes('invoiceNo') ? ' *' : ''}`}>
                  <input
                    placeholder={''}
                    value={value.invoiceNo || ''}
                    onChange={set('invoiceNo')}
                    className="fi"
                  />
                </Field>
              )}
            </>
          )}
        </div>

        {/* 行2：其他字段（仅在非quotation/confirmation类型时显示） */}
        {!['quotation', 'confirmation'].includes(config.type) && (
          <div className="col-span-12 grid grid-cols-12 gap-3">
            {fields.yourRef && (
              <div className="col-span-12 md:col-span-6">
                <Field label={labels.yourRef!}>
                  <input
                    placeholder={''}
                    value={value.yourRef || ''}
                    onChange={set('yourRef')}
                    className="fi"
                  />
                </Field>
              </div>
            )}

            {fields.customerPO && (
              <div className="col-span-12 md:col-span-6">
                <Field label={labels.customerPO!}>
                  <input
                    placeholder={''}
                    value={value.customerPO || ''}
                    onChange={set('customerPO')}
                    className="fi"
                  />
                </Field>
              </div>
            )}

            {fields.orderNo && (
              <div className="col-span-12 md:col-span-6">
                <Field label={labels.orderNo!}>
                  <input
                    placeholder={''}
                    value={value.orderNo || ''}
                    onChange={set('orderNo')}
                    className="fi"
                  />
                </Field>
              </div>
            )}

            {fields.supplierQuoteDate && (
              <div className="col-span-6 md:col-span-6">
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
        )}
      </div>
    </section>
  );
}

// 客户选择字段组件
function CustomerField({ 
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
  const [savedCustomers, setSavedCustomers] = useState<Array<{name: string; to: string}>>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Array<{name: string; to: string}>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizeKey = (name: string, to: string) => `${(name || '').trim().toLowerCase()}__${(to || '').trim().toLowerCase()}`;

  // 从多来源加载保存的客户信息（与宽松模式保持一致的来源集合）
  useEffect(() => {
    try {
      const aggregate: Array<{name: string; to: string}> = [];

      // 1) 新版保存的客户
      const saved = typeof window !== 'undefined' ? localStorage.getItem('savedCustomers') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          for (const c of parsed) {
            const name = String(c?.name || '');
            const to = String(c?.to || '');
            if (name || to) aggregate.push({ name, to });
          }
        }
      }

      // 2) 兼容旧键 customerHistory
      const legacy = typeof window !== 'undefined' ? localStorage.getItem('customerHistory') : null;
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (Array.isArray(parsedLegacy)) {
          for (const c of parsedLegacy) {
            const name = String(c?.name || '');
            const to = String(c?.to || '');
            if (name || to) aggregate.push({ name, to });
          }
        }
      }

      // 3) 历史列表聚合（quotation/invoice/packing）
      const historyKeys = ['quotation_history', 'invoice_history', 'packing_history'];
      for (const key of historyKeys) {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (!raw) continue;
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            for (const item of arr) {
              const name = String(item?.customerName || item?.consigneeName || item?.name || '');
              const to = String(item?.to || item?.data?.to || '');
              if (name || to) aggregate.push({ name, to });
            }
          }
        } catch {
          // ignore parse error for this key
        }
      }

      // 去重
      const map = new Map<string, {name: string; to: string}>();
      for (const c of aggregate) {
        const k = normalizeKey(c.name, c.to);
        if (!map.has(k)) map.set(k, c);
      }
      const unique = Array.from(map.values());

      setSavedCustomers(unique);
      setFilteredCustomers(unique);
    } catch (error) {
      console.warn('Failed to load customers from localStorage sources:', error);
      setSavedCustomers([]);
      setFilteredCustomers([]);
    }
  }, []);

  // 根据输入实时过滤（名称或地址包含）
  useEffect(() => {
    const input = (value || '').trim().toLowerCase();
    if (!input) {
      setFilteredCustomers(savedCustomers);
      return;
    }
    const filtered = savedCustomers.filter(c =>
      c.name.toLowerCase().includes(input) || c.to.toLowerCase().includes(input)
    );
    setFilteredCustomers(filtered);
  }, [value, savedCustomers]);

  // 处理客户选择（mousedown 避免 blur 提前关闭）
  const handleCustomerSelect = useCallback(
    (customer: {name: string; to: string}, e?: React.MouseEvent) => {
      if (e) e.preventDefault();
      onChange(customer.to);
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

      {/* 客户选择下拉菜单（与宽松模式一致：支持过滤、显示名称 + 地址） */}
      {showDropdown && filteredCustomers.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1
          bg-white dark:bg-gray-800 rounded-xl shadow-lg
          border border-gray-200 dark:border-gray-700
          max-h-[220px] overflow-y-auto">
          <div className="text-xs text-gray-500 dark:text-gray-400 p-2 border-b border-gray-100 dark:border-gray-700">
            选择客户（{filteredCustomers.length}）
          </div>
          {filteredCustomers.map((customer, index) => (
            <div
              key={`${customer.name}-${index}`}
              className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              onMouseDown={(e) => handleCustomerSelect(customer, e)}
            >
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {customer.name || '未命名客户'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {customer.to}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
