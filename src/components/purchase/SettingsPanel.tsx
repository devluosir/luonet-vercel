'use client';

import { PurchaseOrderData } from '@/types/purchase';

interface SettingsPanelProps {
  data: PurchaseOrderData;
  onDataChange: (data: PurchaseOrderData) => void;
}

export function SettingsPanel({ data, onDataChange }: SettingsPanelProps) {
  const fromOptions = ['Roger', 'Sharon', 'Emily', 'Summer', 'Nina'];
  // 大小写不敏感的重复检查
  if (data.from && !fromOptions.some(option => option.toLowerCase() === data.from.toLowerCase())) {
    fromOptions.unshift(data.from);
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-3 shadow-sm">
      
      {/* 响应式布局容器 */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        
        {/* 第一组：From */}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">From:</span>
          <select
            value={data.from}
            onChange={(e) => onDataChange({ ...data, from: e.target.value })}
            className="px-2 py-1 rounded text-[11px] font-medium
              bg-white/90 dark:bg-[#1c1c1e]/90
              border border-gray-200/30 dark:border-[#2c2c2e]/50
              focus:outline-none focus:ring-1
              focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
              text-gray-800 dark:text-gray-200"
          >
            {fromOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* 分隔线 */}
        <div className="hidden lg:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

        {/* 第二组：Stamp */}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Stamp:</span>
          <div className="flex gap-1">
            {[
              { value: 'none', label: 'None' },
              { value: 'shanghai', label: 'SH' },
              { value: 'hongkong', label: 'HK' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onDataChange({ ...data, stampType: option.value as 'none' | 'shanghai' | 'hongkong' })}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  data.stampType === option.value 
                    ? 'bg-[#007AFF] text-white shadow-sm' 
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 