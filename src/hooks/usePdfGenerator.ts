import { useCallback } from 'react';
import type { QuotationData } from '@/types/quotation';
import type { PurchaseOrderData } from '@/types/purchase';

export function usePdfGenerator() {
  const warmUp = useCallback(async () => {
    await Promise.all([
      import('@/utils/quotationPdfGenerator'),
      import('@/utils/orderConfirmationPdfGenerator'),
      import('@/lib/embedded-resources'),
    ]);
  }, []);

  const generate = useCallback(async (type: 'quotation' | 'confirmation', data: QuotationData, opts?: { mode?: 'preview' | 'final' }) => {
    // 动态导入PDF生成函数
    const { generateQuotationPDF } = await import('@/utils/quotationPdfGenerator');
    const { generateOrderConfirmationPDF } = await import('@/utils/orderConfirmationPdfGenerator');

    return type === 'quotation'
      ? await generateQuotationPDF(data, opts?.mode === 'preview')
      : await generateOrderConfirmationPDF(data, opts?.mode === 'preview');
  }, []);
  
  return { generate, warmUp };
}

export function usePurchasePdfGenerator() {
  const generate = useCallback(async (data: PurchaseOrderData) => {
    // 动态导入PDF生成函数
    const { generatePurchaseOrderPDF } = await import('@/utils/purchasePdfGenerator');
    return await generatePurchaseOrderPDF(data, false);
  }, []);
  
  return { generate };
} 