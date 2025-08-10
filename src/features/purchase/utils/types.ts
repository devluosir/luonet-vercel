import type { PurchaseOrderData } from '@/types/purchase';

// 扩展原有的采购订单数据，添加新的字段结构
export interface PurchaseItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  unit?: string;
  remark?: string;
}

export interface Supplier {
  name: string;
  email?: string;
  address?: string;
  phone?: string;
  attn?: string;
}

export interface BankInfo {
  bankName?: string;
  accountName?: string;
  accountNo?: string;
  swift?: string;
  taxNo?: string;
  invoiceRequired?: boolean;
}

export interface Settings {
  purchaser?: string;
  stamp?: 'none' | 'company' | 'finance';
  currency?: string;
  date?: string;
  poNo?: string;
}

// 新的采购草稿数据结构
export interface PurchaseDraft {
  supplier: Supplier;
  bank: BankInfo;
  settings: Settings;
  items: PurchaseItem[];
  notes?: string;
}

// 兼容原有的采购订单数据
export interface LegacyPurchaseData extends PurchaseOrderData {
  // 保持向后兼容
}

// 导出原有类型以保持兼容性
export type { PurchaseOrderData };

// 窗口扩展类型
export interface CustomWindow extends Window {
  __PURCHASE_DATA__?: PurchaseOrderData | null;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
}
