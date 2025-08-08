import type { QuotationData } from '@/types/quotation';

// 构建预览数据
export function buildPreviewPayload(
  tab: 'quotation' | 'confirmation', 
  data: QuotationData, 
  editId?: string, 
  totalAmount?: number
) {
  return {
    id: editId || 'preview',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customerName: data.to || 'Unknown',
    quotationNo: tab === 'confirmation' 
      ? (data.contractNo || data.quotationNo || 'N/A') 
      : (data.quotationNo || 'N/A'),
    totalAmount: totalAmount ?? 0,
    currency: data.currency,
    type: tab,
    data,
  };
}
