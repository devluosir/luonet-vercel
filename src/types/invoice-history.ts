import { InvoiceData } from '@/types/invoice';

export interface InvoiceHistory {
  id: string;
  customerName: string;
  invoiceNo: string;
  totalAmount: number;
  currency: 'USD' | 'CNY';
  createdAt: string;
  data: InvoiceData;
}

export interface InvoiceHistoryFilters {
  search: string;
} 