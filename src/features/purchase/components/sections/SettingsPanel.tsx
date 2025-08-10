'use client';
import React from 'react';
import { usePurchaseForm } from '../../hooks/usePurchaseForm';

export default function SettingsPanel() {
  const { field, selectField } = usePurchaseForm();
  
  return (
    <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7] mb-4">订单设置</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-500 mb-1">订单号</label>
          <input 
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            {...field('settings.poNo')} 
            placeholder="PO-2025-001"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">日期</label>
          <input 
            type="date" 
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            {...field('settings.date')} 
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">货币</label>
          <select 
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            {...selectField('settings.currency')}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="CNY">CNY</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">印章</label>
          <select 
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            {...selectField('settings.stamp')}
          >
            <option value="none">无印章</option>
            <option value="company">公司印章</option>
            <option value="finance">财务印章</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-gray-500 mb-1">采购员</label>
          <input 
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            {...field('settings.purchaser')} 
            placeholder="您的姓名"
          />
        </div>
      </div>
    </div>
  );
}
