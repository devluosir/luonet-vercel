import { useCallback } from 'react';
import type { QuotationData } from '@/types/quotation';

export function usePdfGenerator() {
  const generate = useCallback(async (type: 'quotation' | 'confirmation', data: QuotationData) => {
    // 动态导入PDF生成函数
    const { generateQuotationPDF } = await import('@/utils/quotationPdfGenerator');
    const { generateOrderConfirmationPDF } = await import('@/utils/orderConfirmationPdfGenerator');

    return type === 'quotation'
      ? await generateQuotationPDF(data)
      : await generateOrderConfirmationPDF(data);
  }, []);
  
  return { generate };
} 