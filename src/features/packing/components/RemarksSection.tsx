'use client';

import { RemarksSectionProps } from '../types';

export const RemarksSection: React.FC<RemarksSectionProps & {
  inputClassName: string;
  iosCaretStyle: React.CSSProperties;
}> = ({ 
  data, 
  onDataChange,
  inputClassName,
  iosCaretStyle
}) => {
  return (
    <div className="bg-white dark:bg-[#2C2C2E] rounded-3xl p-6 mb-6 shadow-sm border border-gray-100 dark:border-[#3A3A3C]">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-[#F5F5F7] mb-6">
        备注信息
      </h2>
      
      <div className="space-y-6">
        {/* 备注选项 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            备注选项
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.remarkOptions.shipsSpares}
                onChange={(e) => onDataChange({
                  ...data,
                  remarkOptions: {
                    ...data.remarkOptions,
                    shipsSpares: e.target.checked
                  }
                })}
                className="w-4 h-4 text-[#007AFF] bg-gray-100 border-gray-300 rounded focus:ring-[#007AFF] focus:ring-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">船用备件</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.remarkOptions.customsPurpose}
                onChange={(e) => onDataChange({
                  ...data,
                  remarkOptions: {
                    ...data.remarkOptions,
                    customsPurpose: e.target.checked
                  }
                })}
                className="w-4 h-4 text-[#007AFF] bg-gray-100 border-gray-300 rounded focus:ring-[#007AFF] focus:ring-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">海关用途</span>
            </label>
          </div>
        </div>

        {/* 备注内容 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            备注内容
          </label>
          <textarea
            value={data.remarks}
            onChange={(e) => onDataChange({ ...data, remarks: e.target.value })}
            className={`${inputClassName} min-h-[120px] resize-none`}
            style={iosCaretStyle}
            placeholder="请输入备注内容..."
            rows={4}
          />
        </div>

        {/* 自动生成的备注预览 */}
        {(data.remarkOptions.shipsSpares || data.remarkOptions.customsPurpose) && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              自动备注预览
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              {data.remarkOptions.shipsSpares && (
                <p>• 本货物为船用备件，仅供船舶维修使用</p>
              )}
              {data.remarkOptions.customsPurpose && (
                <p>• 本货物仅用于海关申报，不得用于商业用途</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
