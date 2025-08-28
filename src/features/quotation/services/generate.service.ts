import type { QuotationData } from '@/types/quotation';
import { monitorPdfGeneration } from '@/utils/performance';
import { sanitizeQuotation } from '@/utils/sanitizeQuotation';

export const generatePdf = async (
  tab: 'quotation' | 'confirmation', 
  rawData: any,
  notesConfig: any[],
  setProgress: (progress: number) => void,
  opts?: { 
    mode?: 'preview' | 'final'; 
    descriptionMergeMode?: 'auto' | 'manual';
    remarksMergeMode?: 'auto' | 'manual';
    manualMergedCells?: {
      description: Array<{
        startRow: number;
        endRow: number;
        content: string;
        isMerged: boolean;
      }>;
      remarks: Array<{
        startRow: number;
        endRow: number;
        content: string;
        isMerged: boolean;
      }>;
    };
    savedVisibleCols?: string[]; // 🆕 新增参数，用于传递保存时的列显示设置
  }
): Promise<Blob> => {
  // 数据准备阶段（不计入生成监控）
  setProgress(20);
  
  try {
    // 净化数据
    const data = sanitizeQuotation(rawData);
    setProgress(40);
    
    // 根据notesConfig过滤和排序notes
    const visibleNotes = notesConfig
      .filter(note => note.visible)
      .sort((a, b) => a.order - b.order)
      .map(note => {
        // 使用note.content作为主要内容
        if (note.content && note.content.trim()) {
          return note.content;
        }
        
        // 如果没有content，使用默认值
        const defaultTitles: Record<string, string> = {
          'delivery_time': 'Delivery Time',
          'price_based_on': 'Price Basis',
          'delivery_terms': 'Delivery Terms',
          'payment_terms': 'Payment Term',
          'validity': 'Validity'
        };
        
        const title = defaultTitles[note.id];
        return title ? `${title}: [待填写]` : 'Custom Note: [待填写]';
      })
      .filter(content => content && typeof content === 'string' && content.trim() !== ''); // 过滤空内容和无效内容

    // 创建包含配置后notes的数据副本
    const dataWithConfiguredNotes = {
      ...data,
      notes: visibleNotes
    };

    setProgress(80);
    
    // 只在这里监控真正的PDF生成核心
    const blob = await monitorPdfGeneration(`${tab}`, async () => {
      if (tab === 'quotation') {
        const { generateQuotationPDF } = await import('@/utils/quotationPdfGenerator');
        return await generateQuotationPDF(
          dataWithConfiguredNotes, 
          opts?.mode === 'preview' ? 'preview' : 'export', 
          opts?.descriptionMergeMode,
          opts?.remarksMergeMode,
          opts?.manualMergedCells,
          opts?.savedVisibleCols // 🆕 传递保存时的列显示设置
        );
      } else {
        const { generateOrderConfirmationPDF } = await import('@/utils/orderConfirmationPdfGenerator');
        return await generateOrderConfirmationPDF(
          dataWithConfiguredNotes, 
          opts?.mode === 'preview', 
          opts?.descriptionMergeMode,
          opts?.remarksMergeMode,
          opts?.manualMergedCells,
          opts?.savedVisibleCols // 🆕 传递保存时的列显示设置
        );
      }
    }, { mode: opts?.mode === 'preview' ? 'preview' : 'export', operation: tab });
    
    setProgress(100);
    return blob;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// PDF生成服务Hook
export function useGenerateService() {
  return { generatePdf };
}

// 下载PDF文件
export function downloadPdf(blob: Blob, tab: 'quotation' | 'confirmation', data: QuotationData): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const fileName = tab === 'confirmation' 
    ? `SC_${data.contractNo || data.quotationNo || 'draft'}.pdf`
    : `QTN_${data.quotationNo || 'draft'}.pdf`;
    
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
