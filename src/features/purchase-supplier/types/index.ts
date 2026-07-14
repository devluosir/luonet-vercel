import type { PurchaseSupplierQuoteStatus } from '@/features/inquiry/types';

export interface PurchaseSupplierContact {
  id: string;
  name: string;
  shortName?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface PurchaseSupplierData {
  supplyScope?: string;
  supplierType?: string;
  paymentTerms?: string;
  defaultCurrency?: string;
  remark?: string;
}

export interface PurchaseSupplier {
  id: string;
  code?: string;
  name: string;
  shortName?: string;
  address: string;
  contacts: PurchaseSupplierContact[];
  data: PurchaseSupplierData;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseSupplierInput {
  id?: string;
  code?: string;
  name: string;
  shortName?: string;
  address?: string;
  contacts: PurchaseSupplierContact[];
  data: PurchaseSupplierData;
}

export interface PurchaseSupplierSelection {
  id?: string;
  name: string;
  supplier?: PurchaseSupplier;
}

export interface PurchaseSupplierActivityItem {
  id: string;
  inquiryNo: string;
  description: string;
  inquiryDate: string;
  updatedAt: string;
  orderNo?: string;
  quoteStatus: PurchaseSupplierQuoteStatus;
}
