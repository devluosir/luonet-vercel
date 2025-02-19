import { QuotationData } from './quotation';

export interface QuotationHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: 'quotation' | 'confirmation';
  customerName: string;
  quotationNo: string;
  totalAmount: number;
  currency: string;
  data: QuotationData;
}

export interface QuotationHistoryFilters {
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  type?: 'quotation' | 'confirmation' | 'all';
} 