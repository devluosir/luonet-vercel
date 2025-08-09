import React from 'react';
import { Upload } from 'lucide-react';

export function ImportButtonWithIndicator({ 
  lowConfidence, 
  onClick,
  children 
}: { 
  lowConfidence: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button 
      type="button"
      className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] 
                 bg-white/90 dark:bg-[#1C1C1E]/90 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]
                 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 transition-colors"
      onClick={onClick}
    >
      <Upload className="h-4 w-4" />
      {children || '导入'}
      {lowConfidence && (
        <span 
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#1C1C1E]"
          title="检测到低置信度或混合格式数据，建议预览后插入"
        />
      )}
    </button>
  );
}
