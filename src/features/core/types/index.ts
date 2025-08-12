// 核心业务类型定义
export interface BaseDocument {
  id: string;
  documentNo: string;
  date: string;
  currency: string;
  totalAmount: number;
  status: 'draft' | 'confirmed' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface BaseCustomer {
  name: string;
  address: string;
  contact: string;
  email: string;
  phone: string;
}

export interface BaseLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface BaseSettings {
  showBank: boolean;
  showStamp: boolean;
  language: 'zh' | 'en';
  theme: 'colorful' | 'classic';
}

// 单据操作类型
export type DocumentAction = 
  | 'create' 
  | 'edit' 
  | 'copy' 
  | 'delete' 
  | 'export' 
  | 'preview';

// 权限类型
export interface DocumentPermission {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canPreview: boolean;
}

// 通用状态管理接口
export interface BaseDocumentStore<T extends BaseDocument> {
  data: T;
  isLoading: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  error: string | null;
  
  // 基础操作
  setData: (data: Partial<T>) => void;
  reset: () => void;
  save: () => Promise<void>;
  load: (id: string) => Promise<void>;
  
  // 高级操作
  generatePDF: () => Promise<void>;
  previewPDF: () => Promise<void>;
  exportData: () => Promise<void>;
}
