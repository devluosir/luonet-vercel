'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { InvoiceData } from '../types';

interface InvoiceInfoCompactProps {
  data: InvoiceData;
  onChange: (data: Partial<InvoiceData>) => void;
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

  // 从多来源加载保存的客户信息
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

      // 3) 历史列表聚合（quotation/invoice - 不包含packing的收货人数据）
      const historyKeys = ['quotation_history', 'invoice_history'];
      for (const key of historyKeys) {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (!raw) continue;
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            for (const item of arr) {
              const name = String(item?.customerName || item?.name || '');
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
        placeholder=""
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

      {/* 客户选择下拉菜单 */}
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

export const InvoiceInfoCompact = React.memo(({ data, onChange }: InvoiceInfoCompactProps) => {
  const set = (key: keyof InvoiceData) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [key]: e.target.value });
    };

  return (
    <div className="grid grid-cols-12 gap-3">
      {/* 左侧：客户信息 */}
      <div className="col-span-12 md:col-span-6 lg:col-span-6">
        <CustomerField
          label="Customer Information"
          value={data.to || ''}
          onChange={(newValue) => onChange({ to: newValue })}
          placeholder="Enter customer name and address"
        />
      </div>

      {/* 右侧：发票号、日期和客户PO */}
      <div className="col-span-12 md:col-span-6 lg:col-span-6 flex flex-col h-full">
        {/* 第一行：发票号和日期 */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Invoice No.">
            <input
              placeholder=""
              value={data.invoiceNo || ''}
              onChange={set('invoiceNo')}
              className="fi font-bold text-red-600 dark:text-red-400"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={data.date || ''}
              onChange={set('date')}
              className="fi"
              required
            />
          </Field>
        </div>
        {/* 第二行：客户PO */}
        <Field label="Customer P/O">
          <input
            placeholder=""
            value={data.customerPO || ''}
            onChange={set('customerPO')}
            className="fi"
          />
        </Field>
      </div>
    </div>
  );
});

InvoiceInfoCompact.displayName = 'InvoiceInfoCompact';
