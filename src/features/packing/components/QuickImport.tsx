import { useState, useEffect, useRef, useCallback } from 'react';

// 简单的数据解析函数
const parsePackingData = (text: string) => {
  const lines = text.trim().split('\n');
  const rows: any[] = [];
  
  for (const line of lines) {
    const columns = line.split('\t');
    if (columns.length >= 2) {
      const row: any = {
        description: columns[0]?.trim() || '',
        quantity: parseFloat(columns[1]) || 0,
        unit: columns[2]?.trim() || 'pc',
        unitPrice: parseFloat(columns[3]) || 0,
        netWeight: parseFloat(columns[4]) || 0,
        grossWeight: parseFloat(columns[5]) || 0,
        packageQty: parseInt(columns[6]) || 0,
        dimensions: columns[7]?.trim() || '',
      };
      rows.push(row);
    }
  }
  
  return rows;
};

export function QuickImport({ 
  onInsert,
  presetRaw,
  presetParsed,
  onClosePreset,
}: { 
  onInsert: (items: any[], replaceMode?: boolean) => void;
  presetRaw?: string;
  presetParsed?: any;
  onClosePreset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  
  // 拖拽相关状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setOpen(false); 
    setInputText('');
    setParsedData([]);
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
        setInputText(text);
        const parsed = parsePackingData(text);
        setParsedData(parsed);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      // 尝试从剪贴板读取数据
      navigator.clipboard.readText().then(text => {
        if (text.trim()) {
          setInputText(text);
          const parsed = parsePackingData(text);
          setParsedData(parsed);
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
  }, [open]);

  // 处理预设数据（从全局粘贴回退而来）
  useEffect(() => {
    if (presetRaw || presetParsed) {
      setOpen(true);
      if (presetRaw) {
        setInputText(presetRaw);
        const parsed = parsePackingData(presetRaw);
        setParsedData(parsed);
      } else if (presetParsed) {
        setParsedData(presetParsed.rows || []);
      }
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

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 处理文本变化
  const handleTextChange = (text: string) => {
    setInputText(text);
    if (text.trim()) {
      const parsed = parsePackingData(text);
      setParsedData(parsed);
    } else {
      setParsedData([]);
    }
  };

  // 处理插入
  const handleInsert = (replaceMode = false) => {
    if (parsedData.length > 0) {
      onInsert(parsedData, replaceMode);
      closeAll();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="relative max-w-2xl w-full mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* 拖拽区域 */}
        <div
          className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            快速导入数据
          </h3>
          <button
            onClick={closeAll}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-4">
          {/* 输入区域 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              粘贴数据 (支持制表符分隔)
            </label>
            <textarea
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="粘贴数据，格式：描述\t数量\t单位\t单价\t净重\t毛重\t包装数\t尺寸"
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         resize-none"
            />
          </div>

          {/* 预览区域 */}
          {parsedData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                预览 ({parsedData.length} 行)
              </h4>
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="p-2 text-left">描述</th>
                      <th className="p-2 text-center">数量</th>
                      <th className="p-2 text-center">单位</th>
                      <th className="p-2 text-center">单价</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-t border-gray-100 dark:border-gray-600">
                        <td className="p-2">{row.description}</td>
                        <td className="p-2 text-center">{row.quantity}</td>
                        <td className="p-2 text-center">{row.unit}</td>
                        <td className="p-2 text-center">{row.unitPrice}</td>
                      </tr>
                    ))}
                    {parsedData.length > 5 && (
                      <tr>
                        <td colSpan={4} className="p-2 text-center text-gray-500">
                          ... 还有 {parsedData.length - 5} 行
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={closeAll}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                         bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 
                         transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => handleInsert(false)}
              disabled={parsedData.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg 
                         hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed 
                         transition-colors"
            >
              追加导入
            </button>
            <button
              onClick={() => handleInsert(true)}
              disabled={parsedData.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg 
                         hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed 
                         transition-colors"
            >
              替换导入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
