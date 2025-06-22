'use client';

import { PurchaseOrderData } from '@/types/purchase';

interface SettingsPanelProps {
  data: PurchaseOrderData;
  onDataChange: (data: PurchaseOrderData) => void;
}

export function SettingsPanel({ data, onDataChange }: SettingsPanelProps) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">印章:</span>
        <div className="flex gap-1">
          {[
            { value: 'none', label: 'None' },
            { value: 'shanghai', label: 'Shanghai' },
            { value: 'hongkong', label: 'Hong Kong' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onDataChange({ ...data, stampType: value as any })}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                data.stampType === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 