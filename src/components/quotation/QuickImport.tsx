import { useState, useEffect } from 'react';
import { quickParseTSV } from '@/features/quotation/utils/quickParse';
import { quickSmartParse, type ParseResult } from '@/features/quotation/utils/quickSmartParse';

export function QuickImport({ 
  onInsert,
  presetRaw,
  presetParsed,
  onClosePreset,
}: { 
  onInsert: (items: any[]) => void;
  presetRaw?: string;
  presetParsed?: ParseResult;
  onClosePreset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<any[]|null>(null);
  const [skipped, setSkipped] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [detectedFormat, setDetectedFormat] = useState('');

  // 处理预设数据（从全局粘贴回退而来）
  useEffect(() => {
    if (presetRaw || presetParsed) {
      setRaw(presetRaw || '');
      setPreview(presetParsed?.rows || null);
      setSkipped(presetParsed?.skipped || 0);
      setConfidence(presetParsed?.confidence || 0);
      setDetectedFormat(presetParsed?.detectedFormat || '');
      setOpen(true);
    }
  }, [presetRaw, presetParsed]);

  const handlePreview = () => {
    // 优先使用新的智能解析器
    const smartResult = quickSmartParse(raw);
    if (smartResult.rows.length > 0) {
      setPreview(smartResult.rows);
      setSkipped(smartResult.skipped);
      setConfidence(smartResult.confidence);
      setDetectedFormat(smartResult.detectedFormat || '');
    } else {
      // 回退到原解析器
      const res = quickParseTSV(raw);
      setPreview(res);
      // @ts-ignore
      setSkipped(res.skipped || 0);
      setConfidence(0.5); // 中等置信度
      setDetectedFormat('legacy');
    }
  };

  const closeAll = () => {
    setOpen(false); 
    setRaw(''); 
    setPreview(null); 
    setSkipped(0);
    setConfidence(0);
    setDetectedFormat('');
    onClosePreset?.();
  };

  const handleInsert = () => {
    if (preview?.length) onInsert(preview);
    closeAll();
  };

  return (
    <div className="relative">
      <button 
        type="button"
        className="px-3 py-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] 
                   bg-white/90 dark:bg-[#1C1C1E]/90 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]
                   hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 transition-colors"
        onClick={()=>setOpen(true)}
      >
        导入
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[28rem] rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] 
                        bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl shadow-lg p-4 z-20">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">快速导入数据</h3>
            <textarea
              value={raw}
              onChange={e=>setRaw(e.target.value)}
              placeholder={'支持多种格式:\n名称\t数量\t单价\n名称\t数量\t单位\t单价\n名称\t描述\t数量\t单位\t单价\n\n也支持逗号、分号分隔'}
              className="quick-import-textarea w-full h-32 p-3 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                         bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7]
                         text-sm placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                         focus:outline-none focus:ring-2 focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] 
                         focus:border-transparent resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              className="px-3 py-1.5 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg text-sm
                         text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50"
              onClick={handlePreview}
            >
              预览
            </button>
            {preview && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-[#86868B] dark:text-[#86868B]">
                    将插入 {preview.length} 行
                  </span>
                  {skipped > 0 && (
                    <span className="text-sm text-amber-600 dark:text-amber-400">
                      跳过 {skipped} 行
                    </span>
                  )}
                  {confidence > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`${confidence >= 0.7 ? 'text-green-600' : confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                        置信度: {Math.round(confidence * 100)}%
                      </span>
                      {detectedFormat && detectedFormat !== 'unknown' && (
                        <span className="text-[#86868B] dark:text-[#86868B]">
                          格式: {detectedFormat}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button 
                  type="button"
                  className="ml-auto px-4 py-1.5 rounded-lg bg-[#007AFF] dark:bg-[#0A84FF] text-white text-sm
                             hover:bg-[#0056CC] dark:hover:bg-[#0870DD] transition-colors"
                  onClick={handleInsert}
                >
                  插入
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* 点击外部关闭 */}
      {open && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={closeAll}
        />
      )}
    </div>
  );
}
