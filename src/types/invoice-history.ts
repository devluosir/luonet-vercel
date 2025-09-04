import { InvoiceData } from '@/features/invoice';

export interface InvoiceHistory {
  id: string;
  customerName: string;
  invoiceNo: string;
  totalAmount: number;
  currency: 'USD' | 'CNY' | 'EUR';
  createdAt: string;
  updatedAt: string;
  data: InvoiceData;
}

export interface InvoiceHistoryFilters {
  search: string;
} 