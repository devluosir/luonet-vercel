import type { BaseDocument, BaseCustomer, BaseLineItem, BaseSettings } from '@/features/core';

// 报价单特有字段
export interface QuotationData extends BaseDocument {
  // 基础信息
  inquiryNo: string;
  quotationNo: string;
  contractNo: string;
  
  // 客户信息
  to: BaseCustomer;
  from: BaseCustomer;
  
  // 商品信息
  items: LineItem[];
  otherFees: OtherFee[];
  
  // 条款信息
  notes: NoteItem[];
  notesConfig: NotesConfig;
  
  // 支付信息
  paymentTerms: string;
  deliveryTerms: string;
  validity: string;
  paymentDate: string;
  
  // 显示设置
  showBank: boolean;
  showStamp: boolean;
  
  // 金额信息
  amountInWords: {
    dollars: string;
    cents: string;
    hasDecimals: boolean;
  };
  additionalPaymentTerms: string;
  
  // 定金和尾款功能
  depositPercentage?: number;
  depositAmount?: number;
  showBalance?: boolean;
  balanceAmount?: number;
}

// 商品项
export interface LineItem extends BaseLineItem {
  // 继承基础字段
  // id, name, description, quantity, unit, unitPrice, totalPrice
  
  // 报价单特有字段
  model?: string;
  brand?: string;
  origin?: string;
  package?: string;
}

// 其他费用
export interface OtherFee {
  id: string;
  name: string;
  amount: number;
  description?: string;
}

// 条款项
export interface NoteItem {
  id: string;
  type: NoteType;
  content: string;
  order: number;
  isVisible: boolean;
}

// 条款类型
export type NoteType = 
  | 'quality'
  | 'warranty'
  | 'delivery'
  | 'payment'
  | 'packing'
  | 'inspection'
  | 'shipping'
  | 'insurance'
  | 'other';

// 条款配置
export interface NotesConfig {
  [key: string]: {
    enabled: boolean;
    defaultContent: string;
    order: number;
  };
}

// 报价单状态
export interface QuotationState {
  // 基础状态
  data: QuotationData;
  isLoading: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  error: string | null;
  
  // 报价单特有状态
  activeTab: 'quotation' | 'confirmation';
  showSettings: boolean;
  showPreview: boolean;
  isPasteDialogOpen: boolean;
  previewItem: any;
  generatingProgress: number;
  previewProgress: number;
  
  // 操作状态
  isDirty: boolean;
  lastSaved: string | null;
}

// 报价单操作
export interface QuotationActions {
  // 基础操作
  setData: (data: Partial<QuotationData>) => void;
  reset: () => void;
  save: () => Promise<void>;
  load: (id: string) => Promise<void>;
  
  // 报价单特有操作
  setTab: (tab: 'quotation' | 'confirmation') => void;
  setShowSettings: (show: boolean) => void;
  setShowPreview: (show: boolean) => void;
  setPasteDialogOpen: (open: boolean) => void;
  setPreviewItem: (item: any) => void;
  setGenerating: (generating: boolean) => void;
  setGeneratingProgress: (progress: number) => void;
  setPreviewing: (previewing: boolean) => void;
  setPreviewProgress: (progress: number) => void;
  
  // 商品操作
  updateItems: (items: LineItem[]) => void;
  updateOtherFees: (fees: OtherFee[]) => void;
  
  // 条款操作
  updateNotes: (notes: NoteItem[]) => void;
  updateNotesConfig: (config: NotesConfig) => void;
  
  // 高级操作
  generatePDF: () => Promise<void>;
  previewPDF: () => Promise<void>;
  exportData: () => Promise<void>;
}

// 报价单Store
export interface QuotationStore extends QuotationState, QuotationActions {}

// 重新导出核心类型
export type { DocumentPermission } from '@/features/core';
