'use client';

import { PurchaseOrderData } from '@/types/purchase';

interface SettingsPanelProps {
  data: PurchaseOrderData;
  onDataChange: (data: PurchaseOrderData) => void;
}

export function SettingsPanel({ data, onDataChange }: SettingsPanelProps) {
  const currencies = [
    { value: 'USD', label: 'USD', symbol: '$' },
    { value: 'EUR', label: 'EUR', symbol: '€' },
    { value: 'CNY', label: 'CNY', symbol: '¥' }
  ];

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        {/* 币种选择 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">币种:</span>
          <div className="flex gap-1">
            {currencies.map((currency) => (
              <button
                key={currency.value}
                onClick={() => onDataChange({ ...data, currency: currency.value as any })}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  data.currency === currency.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {currency.symbol} {currency.label}
              </button>
            ))}
          </div>
        </div>

        {/* 印章和开票资料设置 */}
        <div className="flex items-center gap-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.showStamp}
              onChange={e => onDataChange({ ...data, showStamp: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">显示印章</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.showBank}
              onChange={e => onDataChange({ ...data, showBank: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">显示开票资料</span>
          </label>
        </div>
      </div>
    </div>
  );
} 