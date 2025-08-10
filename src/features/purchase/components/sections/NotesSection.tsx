'use client';
import React from 'react';
import { usePurchaseForm } from '../../hooks/usePurchaseForm';

export default function NotesSection() {
  const { field } = usePurchaseForm();
  
  return (
    <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7] mb-4">备注</h3>
      <textarea 
        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm resize-none"
        rows={4} 
        {...field('notes')} 
        placeholder="付款条件、交货时间、特殊要求等备注信息..."
      />
    </div>
  );
}
