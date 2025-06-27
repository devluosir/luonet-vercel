import React, { useState } from 'react';
import { X, Eye, Download, Printer } from 'lucide-react';

interface ShippingMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
}

export const ShippingMarksModal: React.FC<ShippingMarksModalProps> = ({
  isOpen,
  onClose,
  value,
  onChange
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handlePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  const handlePrint = () => {
    if (value.trim()) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Shipping Marks</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  padding: 20px;
                  line-height: 1.6;
                }
                .shipping-marks {
                  border: 2px solid #000;
                  padding: 20px;
                  white-space: pre-wrap;
                  font-size: 14px;
                  text-align: left;
                }
                @media print {
                  body { margin: 0; }
                  .shipping-marks { border: 2px solid #000; }
                }
              </style>
            </head>
            <body>
              <h2>Shipping Marks</h2>
              <div class="shipping-marks">${value.replace(/\n/g, '<br>')}</div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  const handleExportPDF = async () => {
    if (!value.trim()) return;
    
    setIsGenerating(true);
    try {
      // 这里可以集成PDF生成库，比如jsPDF
      console.log('Exporting Shipping Marks to PDF...', value);
      
      // 模拟PDF生成过程
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 创建简单的PDF下载（实际项目中应该使用专业的PDF库）
      const blob = new Blob([value], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shipping-marks.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#3A3A3C]">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]">
            Shipping Marks
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
          </button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-[#3A3A3C] bg-gray-50 dark:bg-[#1C1C1E]">
          <button
            onClick={handlePreview}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isPreviewMode
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'bg-white dark:bg-[#2C2C2E] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3A3C]'
            }`}
          >
            <Eye className="w-4 h-4" />
            {isPreviewMode ? 'Edit' : 'Preview'}
          </button>
          
          <button
            onClick={handlePrint}
            disabled={!value.trim()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white dark:bg-[#2C2C2E] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3A3C] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          
          <button
            onClick={handleExportPDF}
            disabled={!value.trim() || isGenerating}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[#007AFF] text-white hover:bg-[#0063CC] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isGenerating ? (
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isGenerating ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {isPreviewMode ? (
            /* 预览模式 */
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-[#F5F5F7]">Preview</h3>
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-[#1C1C1E] min-h-[300px]">
                {value ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200 leading-relaxed text-left">
                    {value}
                  </pre>
                ) : (
                  <div className="text-gray-400 dark:text-gray-500 italic text-left">
                    No shipping marks entered
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 编辑模式 */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-800 dark:text-[#F5F5F7]">Edit Shipping Marks</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {value.length} characters
                </span>
              </div>
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-96 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1C1C1E] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30 resize-none font-mono text-sm leading-relaxed"
                placeholder="Enter shipping marks, marking numbers, or any special shipping instructions...

Example:
FRAGILE - HANDLE WITH CARE
THIS SIDE UP
Made in China
Export to: USA
Order No: ORD-2024-001"
              />
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>💡 Tips:</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>Use line breaks to separate different marks</li>
                  <li>Include handling instructions if needed</li>
                  <li>Add order references for tracking</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-[#3A3A3C] bg-gray-50 dark:bg-[#1C1C1E]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3A3C] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-[#007AFF] text-white hover:bg-[#0063CC] rounded-lg transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}; 