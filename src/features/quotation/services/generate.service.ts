import { usePdfGenerator } from '@/hooks/usePdfGenerator';
import type { QuotationData } from '@/types/quotation';
import { NOTES_CONTENT_MAP, PAYMENT_TERMS_OPTIONS, DELIVERY_TERMS_OPTIONS, NOTES_TEMPLATES_BILINGUAL, extractEnglishContent } from '../types/notes';
import { sanitizeQuotation } from '@/utils/sanitizeQuotation';

// PDF生成服务Hook
export function useGenerateService() {
  const { generate } = usePdfGenerator();

  const generatePdf = async (
    tab: 'quotation' | 'confirmation', 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawData: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notesConfig: any[],
    setProgress: (progress: number) => void
  ): Promise<Blob> => {
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
          // 特殊Notes（付款方式和交货时间）
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (note.id === 'payment_terms' && (note as any).selectedOption) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const selectedOptionId = (note as any).selectedOption;
            // 检查是否为自定义编辑的内容
            if (selectedOptionId.startsWith('custom_')) {
              return `Payment Terms: ${selectedOptionId.replace('custom_', '')}`;
            }
            const selectedOption = PAYMENT_TERMS_OPTIONS.find(opt => opt.id === selectedOptionId);
            return selectedOption ? `Payment Terms: ${selectedOption.english}` : '';
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (note.id === 'delivery_time' && (note as any).selectedOption) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const selectedOptionId = (note as any).selectedOption;
            // 检查是否为自定义编辑的内容
            if (selectedOptionId.startsWith('custom_')) {
              return `Delivery Time: ${selectedOptionId.replace('custom_', '')}`;
            }
            const selectedOption = DELIVERY_TERMS_OPTIONS.find(opt => opt.id === selectedOptionId);
            return selectedOption ? `Delivery Time: ${selectedOption.english}` : '';
          }
          
          // 自定义Notes从data中获取
          if (note.id === 'custom_note_1' && data.notes && data.notes[0]) {
            return data.notes[0];
          }
          if (note.id === 'custom_note_2' && data.notes && data.notes[1]) {
            return data.notes[1];
          }
          
          // 新增的Notes类型处理
          if (note.id === 'delivery_time') {
            return NOTES_CONTENT_MAP[note.id] || extractEnglishContent(NOTES_TEMPLATES_BILINGUAL.fob[0]);
          }
          if (note.id === 'price_based_on') {
            return NOTES_CONTENT_MAP[note.id] || extractEnglishContent(NOTES_TEMPLATES_BILINGUAL.fob[1]);
          }
          if (note.id === 'validity') {
            return NOTES_CONTENT_MAP[note.id] || extractEnglishContent(NOTES_TEMPLATES_BILINGUAL.fob[4]);
          }
          if (note.id === 'quality_terms') {
            return NOTES_CONTENT_MAP[note.id] || 'Quality Terms: According to customer requirements';
          }
          if (note.id === 'warranty_terms') {
            return NOTES_CONTENT_MAP[note.id] || 'Warranty: 12 months from delivery date';
          }
          
          // 默认Notes从映射中获取
          return NOTES_CONTENT_MAP[note.id] || '';
        })
        .filter(content => content && typeof content === 'string' && content.trim() !== ''); // 过滤空内容和无效内容

      // 创建包含配置后notes的数据副本
      const dataWithConfiguredNotes = {
        ...data,
        notes: visibleNotes
      };

      setProgress(80);
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
