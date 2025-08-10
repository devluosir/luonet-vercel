'use client';
import React from 'react';
import { useTotals } from '../../state/purchase.selectors';
import { usePurchaseStore } from '../../state/purchase.store';

export default function TotalsSection() {
  const { subtotal, count } = useTotals();
  const currency = usePurchaseStore(s => s.draft.settings.currency ?? 'USD');

  return (
    <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7] mb-4">订单汇总</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-300">商品数量</span>
          <span className="text-gray-800 dark:text-[#F5F5F7] font-medium">{count}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-300">小计</span>
          <span className="text-gray-800 dark:text-[#F5F5F7] font-semibold">
            {currency} {subtotal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
