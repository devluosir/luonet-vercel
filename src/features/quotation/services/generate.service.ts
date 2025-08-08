import { usePdfGenerator } from '@/hooks/usePdfGenerator';
import type { QuotationData } from '@/types/quotation';
import { NOTES_CONTENT_MAP } from '../types/notes';

// PDF生成服务Hook
export function useGenerateService() {
  const { generate } = usePdfGenerator();

  const generatePdf = async (
    tab: 'quotation' | 'confirmation', 
    data: QuotationData,
    notesConfig: any[],
    setProgress: (progress: number) => void
  ): Promise<Blob> => {
    setProgress(50);
    
    try {
      // 根据notesConfig过滤和排序notes
      const visibleNotes = notesConfig
        .filter(note => note.visible)
        .sort((a, b) => a.order - b.order)
        .map(note => {
          // 自定义Notes从data中获取
          if (note.id === 'custom_note_1' && data.notes && data.notes[0]) {
            return data.notes[0];
          }
          if (note.id === 'custom_note_2' && data.notes && data.notes[1]) {
            return data.notes[1];
          }
          // 默认Notes从映射中获取
          return NOTES_CONTENT_MAP[note.id] || '';
        })
        .filter(content => content.trim() !== ''); // 过滤空内容

      // 创建包含配置后notes的数据副本
      const dataWithConfiguredNotes = {
        ...data,
        notes: visibleNotes
      };

      const blob = await generate(tab, dataWithConfiguredNotes);
      setProgress(100);
      return blob;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

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
