'use client';

import { RemarksSectionProps } from '../types';

// 浮动标签字段组件
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="group block relative">
      {children}
      <span
        className="
          pointer-events-none absolute left-3 top-[14px] text-[13px] text-slate-400 dark:text-gray-400
          transition-all bg-white/80 dark:bg-gray-800/80 px-1 z-10
          group-[&:has(input:focus)]:top-0 group-[&:has(textarea:focus)]:top-0
          group-[&:has(input:not(:placeholder-shown))]:top-0
          group-[&:has(textarea:not(:placeholder-shown))]:top-0
          -translate-y-1/2 group-[&:has(input:focus)]:-translate-y-1/2 group-[&:has(textarea:focus)]:-translate-y-1/2
        "
      >
        {label}
      </span>
    </label>
  );
}

export const RemarksSection: React.FC<RemarksSectionProps> = ({ 
  data, 
  onDataChange
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/30 shadow-sm p-4">
      <div className="space-y-4">
        {/* 备注选项 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            备注选项 Remark Options
          </h4>
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
              <span className="text-sm text-gray-700 dark:text-gray-300">SHIP'S SPARES IN TRANSIT</span>
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
              <span className="text-sm text-gray-700 dark:text-gray-300">FOR CUSTOMS PURPOSE ONLY</span>
            </label>
          </div>
        </div>

        {/* 备注内容 */}
        <div>
          <Field label="备注内容 Remarks">
            <textarea
              rows={3}
              placeholder={' '}
              value={data.remarks || ''}
              onChange={(e) => onDataChange({ ...data, remarks: e.target.value })}
              className="fi-multiline resize-y"
            />
          </Field>
        </div>

        {/* 自动生成的备注预览 */}
        {(data.remarkOptions.shipsSpares || data.remarkOptions.customsPurpose) && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h4 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
              自动备注预览 Auto Remarks Preview
            </h4>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              {data.remarkOptions.shipsSpares && (
                <p>• SHIP'S SPARES IN TRANSIT</p>
              )}
              {data.remarkOptions.customsPurpose && (
                <p>• FOR CUSTOMS PURPOSE ONLY</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
