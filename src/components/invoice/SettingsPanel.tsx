import { InvoiceTemplateConfig } from '@/types/invoice';

interface SettingsPanelProps {
  config: InvoiceTemplateConfig;
  onChange: (config: InvoiceTemplateConfig) => void;
}

export default function SettingsPanel({ config, onChange }: SettingsPanelProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-3 shadow-sm">
      
      {/* 响应式布局容器 */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        
        {/* 第一组：Header Type */}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Header:</span>
          <div className="flex gap-1">
            {[
              { value: 'bilingual', label: 'CN+EN' },
              { value: 'english', label: 'EN' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...config, headerType: option.value as 'bilingual' | 'english' })}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  config.headerType === option.value 
                    ? 'bg-[#007AFF] text-white shadow-sm' 
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="hidden md:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

        {/* 第二组：Invoice Type */}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Type:</span>
          <div className="flex gap-1">
            {[
              { value: 'commercial', label: 'Commercial' },
              { value: 'proforma', label: 'Proforma' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...config, invoiceType: option.value as 'commercial' | 'proforma' })}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  config.invoiceType === option.value 
                    ? 'bg-[#007AFF] text-white shadow-sm' 
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="hidden md:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

        {/* 第三组：Company Stamp */}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Stamp:</span>
          <div className="flex gap-1">
            {[
              { value: 'shanghai', label: 'SH' },
              { value: 'hongkong', label: 'HK' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...config, stampType: option.value as 'shanghai' | 'hongkong' })}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  config.stampType === option.value 
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