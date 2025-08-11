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
    <div className="bg-white dark:bg-[#2C2C2E] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#3A3A3C]">
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {/* 生成按钮 */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#007AFF] hover:bg-[#0056CC] disabled:bg-gray-400 text-white font-medium rounded-2xl transition-all duration-300 ease-out shadow-sm hover:shadow-md disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          {isGenerating ? '生成中...' : '生成装箱单'}
        </button>

        {/* 预览按钮 */}
        <button
          type="button"
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-[#3A3A3C] dark:hover:bg-[#4A4A4C] text-gray-700 dark:text-gray-300 font-medium rounded-2xl transition-all duration-300 ease-out shadow-sm hover:shadow-md"
        >
          <Eye className="w-5 h-5" />
          预览
        </button>

        {/* 保存按钮 */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-2xl transition-all duration-300 ease-out shadow-sm hover:shadow-md disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {isSaving ? '保存中...' : '保存'}
        </button>

        {/* 导出Excel按钮 */}
        <button
          type="button"
          onClick={onExportExcel}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-2xl transition-all duration-300 ease-out shadow-sm hover:shadow-md"
        >
          <FileSpreadsheet className="w-5 h-5" />
          导出Excel
        </button>
      </div>

      {/* 保存消息 */}
      {saveMessage && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
          <p className="text-sm text-green-700 dark:text-green-300 text-center">
            {saveMessage}
          </p>
        </div>
      )}

      {/* 文档类型提示 */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
        <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
          当前文档类型: {
            data.documentType === 'proforma' ? '形式发票' :
            data.documentType === 'packing' ? '装箱单' : '形式发票 + 装箱单'
          }
        </p>
      </div>
    </div>
  );
};
