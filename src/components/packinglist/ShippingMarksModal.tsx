import React, { useState, useRef } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { generateShippingMarksPDF } from '@/utils/shippingMarksPdfGenerator';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

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
  const { showToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [fontSize, setFontSize] = useState<number>(12);

  const richTextRef = useRef<HTMLTextAreaElement>(null);



  if (!isOpen) return null;

  const handleSaveAndClose = () => {
    // 文本已经通过 onChange 同步，直接关闭即可
    onClose();
  };

  const handleExportPDF = async () => {
    if (!value.trim()) return;
    
    setIsGenerating(true);
    try {
      const pdfBlob = await generateShippingMarksPDF(value, false, pdfOrientation, fontSize, 'bold', '#000000');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SC_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Shipping marks PDF generation failed:', error);
      showToast('PDF生成失败，请重试', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePDFPreview = async () => {
    if (!value.trim()) return;
    
    setIsGeneratingPreview(true);
    try {
      const pdfBlob = await generateShippingMarksPDF(value, true, pdfOrientation, fontSize, 'bold', '#000000');
      const previewUrl = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl(previewUrl);
      setShowPDFPreview(true);
    } catch (error) {
      console.error('Shipping marks PDF preview failed:', error);
      showToast('PDF预览生成失败，请重试', 'error');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const closePDFPreview = () => {
    setShowPDFPreview(false);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl('');
    }
  };



  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#3A3A3C]">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]">
              Shipping Marks
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {value.length} 字符
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
          </button>
        </div>



        {/* PDF设置栏 */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PDF方向:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPdfOrientation('portrait')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      pdfOrientation === 'portrait'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    📄 纵向
                  </button>
                  <button
                    onClick={() => setPdfOrientation('landscape')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      pdfOrientation === 'landscape'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    📃 横向
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PDF字号:</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {[8, 10, 12, 14, 16, 18, 20, 22, 24].map(size => (
                    <option key={size} value={size}>{size}pt</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePDFPreview}
                disabled={!value.trim() || isGeneratingPreview}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isGeneratingPreview ? (
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                PDF预览
              </button>
              
              <Button
                onClick={handleExportPDF}
                disabled={!value.trim() || isGenerating}
              >
                {isGenerating ? (
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Download className="w-4 h-4" />
                )}
                导出PDF
              </Button>
            </div>
          </div>
        </div>

        {/* 文本编辑区域 */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 400px)' }}>
          <div className="space-y-4">
            <textarea
              ref={richTextRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-96 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1C1C1E] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none font-mono text-sm leading-relaxed"
              placeholder="输入运输标记、标识号码或特殊运输说明...

示例:
FRAGILE - HANDLE WITH CARE
THIS SIDE UP
Made in China
Export to: USA
Order No: ORD-2024-001"
            />
            
            <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <p className="font-medium mb-2">💡 使用提示:</p>
              <ul className="space-y-1">
                <li>• 直接输入运输标记内容</li>
                <li>• 使用换行分隔不同的标记</li>
                <li>• PDF字号通过下方设置调整</li>
                <li>• PDF导出使用统一的粗体黑色格式</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-[#3A3A3C] bg-gray-50 dark:bg-[#1C1C1E]">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3A3C] rounded-lg transition-colors"
          >
            取消
          </button>
          <Button
            onClick={handleSaveAndClose}
          >
            保存并关闭
          </Button>
        </div>
      </div>
      
      {/* PDF 预览模态框 */}
      {showPDFPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">PDF预览</h3>
                <div className="flex gap-2">
                  <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                    {pdfOrientation === 'portrait' ? '📄 纵向' : '📃 横向'}
                  </span>
                  <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                    {fontSize}pt
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExportPDF}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isGenerating ? '下载中...' : '下载PDF'}
                </Button>
                <button
                  onClick={closePDFPreview}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-black p-4">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full rounded-lg bg-white shadow-lg"
                title="PDF预览"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 
