'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import type { InvoiceData } from '../types';

interface InvoiceInfoCompactProps {
  data: InvoiceData;
  onChange: (data: Partial<InvoiceData>) => void;
}

interface CustomerSuggestion {
  name: string;
  address: string;
  usage: number;
}

export const InvoiceInfoCompact = React.memo(({ data, onChange }: InvoiceInfoCompactProps) => {
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const customerInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 模拟客户建议数据
  const customerSuggestions: CustomerSuggestion[] = [
    { name: 'ABC Company Ltd.', address: '123 Business St, New York, NY 10001', usage: 15 },
    { name: 'XYZ Corporation', address: '456 Commerce Ave, Los Angeles, CA 90210', usage: 8 },
    { name: 'Global Industries', address: '789 Trade Blvd, Chicago, IL 60601', usage: 23 },
  ];

  const filteredSuggestions = customerSuggestions.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.address.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  const set = (key: keyof InvoiceData) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [key]: e.target.value });
    };

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowCustomerSuggestions(false);
      }
    };

    if (showCustomerSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCustomerSuggestions]);

  const handleCustomerSelect = (customer: CustomerSuggestion) => {
    onChange({ to: customer.name });
    setCustomerSearchTerm(customer.name);
    setShowCustomerSuggestions(false);
  };

  const handleCustomerInputFocus = () => {
    setShowCustomerSuggestions(true);
    setCustomerSearchTerm(data.to || '');
  };

  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange({ to: value });
    setCustomerSearchTerm(value);
    setShowCustomerSuggestions(true);
  };

  return (
    <div className="space-y-4">
      {/* 客户信息区域 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Information</h3>
        </div>
        
        <div className="relative">
          <div className="relative">
            <input
              ref={customerInputRef}
              type="text"
              value={data.to || ''}
              onChange={handleCustomerInputChange}
              onFocus={handleCustomerInputFocus}
              placeholder="Enter customer name or company"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] dark:focus:border-[#0A84FF]
                placeholder-gray-400 dark:placeholder-gray-500"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          
          {/* 客户建议下拉框 */}
          {showCustomerSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              {filteredSuggestions.map((customer, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                  onClick={() => handleCustomerSelect(customer)}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {customer.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {customer.address}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Used {customer.usage} times
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 发票信息区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Invoice No.
          </label>
          <input
            type="text"
            value={data.invoiceNo || ''}
            onChange={set('invoiceNo')}
            placeholder="Enter invoice number"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
              focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] dark:focus:border-[#0A84FF]
              placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Date
          </label>
          <input
            type="date"
            value={data.date || ''}
            onChange={set('date')}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
              focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] dark:focus:border-[#0A84FF]"
            required
          />
        </div>
      </div>

      {/* 客户PO号 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Customer P/O
        </label>
        <input
          type="text"
          value={data.customerPO || ''}
          onChange={set('customerPO')}
          placeholder="Enter customer purchase order number"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
            bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
            focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] dark:focus:border-[#0A84FF]
            placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>
    </div>
  );
});

InvoiceInfoCompact.displayName = 'InvoiceInfoCompact';
