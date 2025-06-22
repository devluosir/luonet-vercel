'use client';

import { PurchaseOrderData } from '@/types/purchase';

interface SettingsPanelProps {
  data: PurchaseOrderData;
  onDataChange: (data: PurchaseOrderData) => void;
}

export function SettingsPanel({ data, onDataChange }: SettingsPanelProps) {
  const fromOptions = ['Roger', 'Sharon', 'Emily', 'Summer', 'Nina'];
  if (data.from && !fromOptions.includes(data.from)) {
    fromOptions.unshift(data.from);
  }

  return (
    <div className="bg-gray-50 dark:bg-[#3A3A3C] rounded-xl border border-gray-200 dark:border-gray-600">
      <div className="p-4 sm:p-6">
        <div className="space-y-4">
          {/* From 和 印章设置 - 响应式布局 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center lg:justify-end gap-4 lg:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">From:</span>
              <select
                value={data.from}
                onChange={(e) => onDataChange({ ...data, from: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                {fromOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stamp:</span>
              <div className="flex gap-2">
                {[
                  { value: 'none', label: 'None' },
                  { value: 'shanghai', label: 'Shanghai' },
                  { value: 'hongkong', label: 'Hongkong' }
                ].map((stamp) => (
                  <button
                    key={stamp.value}
                    type="button"
                    onClick={() => onDataChange({ ...data, stampType: stamp.value as 'none' | 'shanghai' | 'hongkong' })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      data.stampType === stamp.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {stamp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 