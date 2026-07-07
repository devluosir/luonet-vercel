export type PurchaseOrderCurrency = 'CNY' | 'USD' | 'EUR';

export interface PurchaseOrderRecord {
  id: string;
  purchaseNo: string;
  supplier: string;
  amount: string;
  currency: PurchaseOrderCurrency;
  orderDeliveryStatus?: string;
  orderDeliveryConsignee?: string;
  createdAt: string;
  updatedAt: string;
  status?: 'active' | 'deleted';
}

export type PurchaseOrderDraft = Omit<PurchaseOrderRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>;
