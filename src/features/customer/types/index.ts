export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

export interface Consignee {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
}

export type TabType = 'customers' | 'suppliers' | 'consignees';

// 历史记录文档的通用类型
export interface HistoryDocument {
  id?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  type?: string;
  [key: string]: any;
}
