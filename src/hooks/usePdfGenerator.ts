import { useCallback } from 'react';
import type { QuotationData } from '@/types/quotation';
import type { PurchaseOrderData } from '@/types/purchase';

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

export function usePurchasePdfGenerator() {
  const generate = useCallback(async (data: PurchaseOrderData) => {
    // 动态导入PDF生成函数
    const { generatePurchaseOrderPDF } = await import('@/utils/purchasePdfGenerator');
    return await generatePurchaseOrderPDF(data, false);
  }, []);
  
  return { generate };
} 