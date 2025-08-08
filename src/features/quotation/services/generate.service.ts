import { usePdfGenerator } from '@/hooks/usePdfGenerator';
import type { QuotationData } from '@/types/quotation';

// PDF生成服务Hook
export function useGenerateService() {
  const { generate } = usePdfGenerator();

  const generatePdf = async (
    tab: 'quotation' | 'confirmation', 
    data: QuotationData, 
    setProgress: (progress: number) => void
  ): Promise<Blob> => {
    setProgress(50);
    
    try {
      const blob = await generate(tab, data);
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
