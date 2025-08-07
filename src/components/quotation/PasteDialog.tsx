import React, { useState, useRef, useEffect } from 'react';
import { X, Clipboard } from 'lucide-react';

interface PasteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (text: string) => void;
}

export function PasteDialog({ isOpen, onClose, onConfirm }: PasteDialogProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 当对话框打开时，自动聚焦到文本框
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // 处理确认按钮点击
  const handleConfirm = () => {
    if (text.trim()) {
      onConfirm(text.trim());
      setText(''); // 清空文本框
      onClose();
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // 处理粘贴事件
  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setText(clipboardText);
      }
    } catch (error) {
      console.warn('无法访问剪贴板:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#2C2C2E] rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-[#3A3A3C]">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
            粘贴数据
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 文本框 */}
        <div className="space-y-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="请粘贴您的Excel数据..."
            className="w-full h-32 p-3 rounded-lg border border-gray-300 dark:border-[#3A3A3C] 
                     bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-[#F5F5F7]
                     resize-none focus:ring-2 focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] 
                     focus:border-transparent outline-none transition-all"
          />
          
          {/* 提示信息 */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>• 支持Excel表格数据粘贴</p>
            <p>• 使用 Ctrl+Enter 快速导入</p>
            <p>• 按 Esc 取消操作</p>
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handlePaste}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#007AFF] dark:text-[#0A84FF] 
                     hover:bg-[#007AFF]/[0.08] dark:hover:bg-[#0A84FF]/[0.08] 
                     rounded-lg transition-colors"
          >
            <Clipboard className="w-4 h-4" />
            从剪贴板粘贴
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 
                       hover:bg-gray-100 dark:hover:bg-[#3A3A3C] rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!text.trim()}
              className="px-4 py-2 text-sm bg-[#007AFF] dark:bg-[#0A84FF] 
                       text-white rounded-lg font-medium
                       hover:bg-[#0063CC] dark:hover:bg-[#0070E0] 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all"
            >
              导入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 