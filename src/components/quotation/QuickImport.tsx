import { useState, useEffect, useRef, useCallback } from 'react';
import { quickSmartParse, type ParseResult } from '@/features/quotation/utils/quickSmartParse';

export function QuickImport({ 
  onInsert,
  presetRaw,
  presetParsed,
  onClosePreset,
}: { 
  onInsert: (items: any[], replaceMode?: boolean) => void;
  presetRaw?: string;
  presetParsed?: ParseResult;
  onClosePreset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  
  // 拖拽相关状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setOpen(false); 
    // 重置位置
    setPosition({ x: 0, y: 0 });
    onClosePreset?.();
  }, [onClosePreset]);

  // 设置初始位置到屏幕中央
  useEffect(() => {
    if (open) {
      // 估算浮窗尺寸，在屏幕中央显示
      const estimatedWidth = 672; // max-w-2xl = 672px
      const estimatedHeight = 400; // 估算高度
      const centerX = (window.innerWidth - estimatedWidth) / 2;
      const centerY = (window.innerHeight - estimatedHeight) / 2;
      setPosition({
        x: Math.max(0, centerX),
        y: Math.max(0, centerY)
      });
    }
  }, [open]);

  // 监听粘贴事件
  useEffect(() => {
    if (!open) return;

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') || '';
      if (text.trim()) {
        // 自动处理粘贴的数据
        const smartResult = quickSmartParse(text);
        if (smartResult.rows.length > 0) {
          onInsert(smartResult.rows, true); // 替换模式
          closeAll();
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      // 尝试从剪贴板读取数据
      navigator.clipboard.readText().then(text => {
        if (text.trim()) {
          const smartResult = quickSmartParse(text);
          if (smartResult.rows.length > 0) {
            onInsert(smartResult.rows, true); // 替换模式
            closeAll();
          }
        }
      }).catch(() => {
        // 如果无法读取剪贴板，提示用户
        console.log('无法访问剪贴板，请使用 Ctrl+V');
      });
    };

    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [open, onInsert, closeAll]);

  // 处理预设数据（从全局粘贴回退而来）
  useEffect(() => {
    if (presetRaw || presetParsed) {
      setOpen(true);
    }
  }, [presetRaw, presetParsed]);

  // 拖拽处理函数
  const handleMouseDown = (e: React.MouseEvent) => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      // 直接计算新位置，考虑transform的影响
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // 限制在视窗范围内
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (open) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [open, isDragging, dragOffset]);



  return (
    <div className="relative">
      <button 
        type="button"
        className="relative inline-flex items-center gap-0 px-3 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] 
                   bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 
                   text-sm font-medium text-blue-700 dark:text-blue-300
                   hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/30 dark:hover:to-indigo-800/30 
                   hover:border-blue-300 dark:hover:border-blue-600
                   transition-all duration-200 shadow-sm hover:shadow-md"
        onClick={()=>setOpen(true)}
        title="导入数据"
      >
        {/* 表格图标 */}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {/* 右箭头 */}
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {/* 数据库图标 */}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>

      </button>
      {open && (
        <div className="fixed inset-0 z-50" onClick={closeAll}>
          <div 
            ref={modalRef}
            className="absolute w-full max-w-2xl rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] 
                       bg-white dark:bg-[#1C1C1E] shadow-2xl max-h-[80vh] overflow-hidden cursor-move" 
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 - 可拖拽区域 */}
            <div 
              className="flex items-center justify-between p-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] cursor-move"
              onMouseDown={handleMouseDown}
            >
              <h3 className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">快速导入数据</h3>
              <button
                type="button"
                onClick={closeAll}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">

              
              <div className="text-center space-y-4">
                <div className="text-lg font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                  快速导入数据
                </div>
                <div className="text-sm text-[#86868B] dark:text-[#86868B] space-y-2">
                  <p>已支持报价表有：LC报价表，OMS报价表等等</p>
                  <p>将Excel报价表的内容复制，直接粘贴即可</p>
                  <p>包含表头，序号，备注的区域</p>
                  <p>无序号的行不用复制进来</p>
                </div>
                <div 
                  className="mt-6 p-4 border-2 border-dashed border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg bg-[#F5F5F7]/30 dark:bg-[#2C2C2E]/30 cursor-pointer hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 transition-colors"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <div className="text-sm text-[#86868B] dark:text-[#86868B]">
                    <p>右键点击此处粘贴数据</p>
                    <p className="text-xs mt-1">或按 Ctrl+V 快捷键</p>
                  </div>
                </div>
              </div>
              

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
