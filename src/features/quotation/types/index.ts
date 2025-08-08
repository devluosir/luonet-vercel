// 复用现有类型定义
export type { QuotationData, LineItem, OtherFee, CustomWindow } from '@/types/quotation';

// 导出标签页类型
export type Tab = 'quotation' | 'confirmation';

// 导出预览项类型
export interface PreviewItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  quotationNo: string;
  totalAmount: number;
  currency: string;
  type: 'quotation' | 'confirmation';
  data: import('@/types/quotation').QuotationData;
}
