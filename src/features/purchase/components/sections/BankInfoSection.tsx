'use client';
import React from 'react';
import { usePurchaseForm } from '../../hooks/usePurchaseForm';

export default function BankInfoSection() {
  const { field, boolField } = usePurchaseForm();
  
  return (
    <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7] mb-4">银行信息</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm text-gray-500 mb-1">银行名称</label>
          <input 
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            {...field('bank.bankName')} 
            placeholder="银行名称"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">账户名称</label>
          <input 
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            {...field('bank.accountName')} 
            placeholder="账户名称"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">账号</label>
          <input 
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            {...field('bank.accountNo')} 
            placeholder="银行账号"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">SWIFT</label>
          <input 
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            {...field('bank.swift')} 
            placeholder="SWIFT代码"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">税号</label>
          <input 
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            {...field('bank.taxNo')} 
            placeholder="税务登记号"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input 
            type="checkbox"
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            {...boolField('bank.invoiceRequired')}
          />
          需要开票资料
        </label>
      </div>
    </div>
  );
}
