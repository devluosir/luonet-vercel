'use client';

import { Download, Save, Eye, FileSpreadsheet } from 'lucide-react';
import { ActionButtonsProps } from '../types';

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  data,
  isGenerating,
  isSaving,
  saveMessage,
  onGenerate,
  onPreview,
  onSave,
  onExportExcel
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/30 shadow-sm p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 生成按钮 */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0056CC] disabled:bg-gray-400 text-white font-medium rounded-xl transition-all duration-200 ease-out shadow-sm hover:shadow-md disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {isGenerating ? '生成中...' : '生成装箱单'}
        </button>

        {/* 预览按钮 */}
        <button
          type="button"
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all duration-200 ease-out shadow-sm hover:shadow-md"
        >
          <Eye className="w-4 h-4" />
          预览
        </button>

        {/* 保存按钮 */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-xl transition-all duration-200 ease-out shadow-sm hover:shadow-md disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isSaving ? '保存中...' : '保存'}
        </button>

        {/* 导出Excel按钮 */}
        <button
          type="button"
          onClick={onExportExcel}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-all duration-200 ease-out shadow-sm hover:shadow-md"
        >
          <FileSpreadsheet className="w-4 h-4" />
          导出Excel
        </button>
      </div>

      {/* 保存消息 */}
      {saveMessage && (
        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-xs text-green-700 dark:text-green-300 text-center">
            {saveMessage}
          </p>
        </div>
      )}

      {/* 文档类型提示 */}
      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
          当前文档类型: {
            data.documentType === 'proforma' ? '形式发票 Proforma Invoice' :
            data.documentType === 'packing' ? '装箱单 Packing List' : '形式发票 + 装箱单 Proforma Invoice & Packing List'
          }
        </p>
      </div>
    </section>
  );
};
