import type { QuotationData } from '@/types/quotation';
import type { InvoiceData } from '@/features/invoice';
import type { PurchaseOrderData } from '@/types/purchase';
import type { PackingData } from '@/types/packing-history';

// 历史记录类型
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

export interface PurchaseHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  supplierName: string;
  orderNo: string;
  totalAmount: number;
  currency: string;
  data: PurchaseOrderData;
}

export interface InvoiceHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  invoiceNo: string;
  totalAmount: number;
  currency: string;
  data: InvoiceData;
}

export interface PackingHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  consigneeName: string;
  invoiceNo: string;
  orderNo: string;
  totalAmount: number;
  currency: string;
  documentType: 'proforma' | 'packing' | 'both';
  data: PackingData;
}

// 通用类型
export type HistoryType = 'quotation' | 'confirmation' | 'invoice' | 'purchase' | 'packing';
export type HistoryItem = QuotationHistory | PurchaseHistory | InvoiceHistory | PackingHistory;

// 排序配置
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// 筛选配置
export interface Filters {
  search: string;
  type: HistoryType | 'all';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
}

// 标签页配置
export interface TabConfig {
  id: HistoryType;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
}

// 操作回调
export interface HistoryCallbacks {
  onEdit: (id: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
  onConvert?: (id: string) => void;
  onSort: (key: string) => void;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
}
