import { useEffect } from 'react';
import { quickSmartParse, type ParseResult } from '../utils/quickSmartParse';
import { useQuotationStore } from '@/features/quotation/state/useQuotationStore';
import { useToast } from '@/components/ui/Toast';

type Opts = {
  // 判断是否允许全局粘贴（例如只在报价页 & 桌面端）
  enabled?: boolean;
  maxDirectInsert?: number; // 直接插入阈值（行数）
  minConfidence?: number; // 最小置信度阈值
  onFallbackPreview?: (raw: string, parsed: ParseResult) => void;
};

export function useGlobalPasteImport(opts: Opts = {}) {
  const { 
    enabled = true, 
    maxDirectInsert = 80, 
    minConfidence = 0.7,
    onFallbackPreview 
  } = opts;
  
  const updateItems = useQuotationStore(s => s.updateItems);
  const updateFromParse = useQuotationStore(s => s.updateFromParse);
  const items = useQuotationStore(s => s.data.items);
  const { showToast } = useToast();

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: ClipboardEvent) => {
      // 1) 若当前聚焦在输入控件，放行
      const ae = document.activeElement as HTMLElement | null;
      if (ae) {
        const tag = ae.tagName?.toLowerCase();
        const isEditable = (ae as any).isContentEditable;
        const isInput = tag === 'input' || tag === 'textarea' || isEditable;
        
        // 特殊情况：如果是我们自己的快速导入文本框，也放行
        const isQuickImportTextarea = ae.closest('.quick-import-textarea');
        
        if (isInput && !isQuickImportTextarea) return;
      }

      const text = e.clipboardData?.getData('text') || '';
      if (!text.trim()) return;

      // 简单过滤：太短的文本可能不是表格数据
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 1) return;

      // 2) 解析
      const parsed = quickSmartParse(text);
      if (parsed.rows.length === 0) return;

      // 3) 默认替换模式（避免空行干扰合并检测）
      const replace = true;

      // 4) 决策：直接插入 or 预览
      const confident = parsed.confidence >= minConfidence;
      const smallEnough = parsed.rows.length <= maxDirectInsert;

      if (confident && smallEnough) {
        e.preventDefault(); // 阻止默认粘贴到页面
        
        let maxId = items.reduce((m, it) => Math.max(m, it.id), 0);

        const mapped = parsed.rows.map(r => {
          const q = Number(r.quantity) || 0;
          const p = Number(r.unitPrice) || 0;
          return {
            id: ++maxId,
            partName: r.partName || '',
            description: r.description || '',
            quantity: q,
            unit: r.unit || 'pc',
            unitPrice: p,
            amount: q * p,
            remarks: '',
          };
        });

        if (replace) {
          // 使用解析器的完整结果，包括合并信息
          updateFromParse({
            rows: mapped,
            mergedRemarks: parsed.mergedRemarks,
            mergedDescriptions: parsed.mergedDescriptions
          });
        } else {
          // 追加模式：需要处理合并信息的偏移
          const next = [...items, ...mapped];
          updateItems(next);
          // TODO: 如果需要追加模式下的合并信息，需要在这里处理偏移
        }

        // Toast 提示
        const action = replace ? '已替换' : '已追加';
        const summary = `${action} ${mapped.length} 行${parsed.skipped ? `，跳过 ${parsed.skipped} 行` : ''}`;
        const formatInfo = parsed.detectedFormat ? ` (${parsed.detectedFormat})` : '';
        
        showToast(summary + formatInfo, 'success');

        if (process.env.NODE_ENV === 'development') {
          console.log('[Global Paste]', {
            action,
            inserted: mapped.length,
            skipped: parsed.skipped,
            confidence: parsed.confidence,
            format: parsed.detectedFormat,
          });
        }
      } else if (onFallbackPreview) {
        // 不够自信或数据太多，回退到预览模式
        e.preventDefault();
        onFallbackPreview(text, parsed);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Global Paste] Fallback to preview', {
            confident,
            smallEnough,
            confidence: parsed.confidence,
            rows: parsed.rows.length,
          });
        }
      }
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [enabled, maxDirectInsert, minConfidence, onFallbackPreview, items, updateItems, showToast]);
}
