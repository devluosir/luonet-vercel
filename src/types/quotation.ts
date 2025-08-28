import type { NoteConfig } from '@/features/quotation/types/notes';

export interface LineItem {
  id: number;
  partName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  remarks?: string;
  highlight?: {
    partName?: boolean;
    description?: boolean;
    quantity?: boolean;
    unit?: boolean;
    unitPrice?: boolean;
    amount?: boolean;
    remarks?: boolean;
  };
}

export interface OtherFee {
  id: number;
  description: string;
  amount: number;
  remarks?: string;
  highlight?: {
    description?: boolean;
    amount?: boolean;
    remarks?: boolean;
  };
}

export interface QuotationData {
  quotationNo: string;
  contractNo: string;
  date: string;
  notes: string[];
  from: string;
  to: string;
  inquiryNo: string;
  currency: 'USD' | 'EUR' | 'CNY';
  paymentDate: string;
  items: LineItem[];
  amountInWords: {
    dollars: string;
    cents: string;
    hasDecimals: boolean;
  };
  showDescription: boolean;
  showRemarks: boolean;
  showBank: boolean;
  showStamp: boolean;
  otherFees?: OtherFee[];
  customUnits?: string[];
  showMainPaymentTerm?: boolean; // 统一控制付款条款显示
  showInvoiceReminder?: boolean;
  additionalPaymentTerms?: string;
  paymentMethod?: 'T/T' | 'L/C' | 'D/P' | 'D/A' | 'Open Account';
  templateConfig?: {
    headerType: 'none' | 'bilingual' | 'english';
    stampType?: 'none' | 'shanghai' | 'hongkong';
  };
  // Notes配置
  notesConfig?: NoteConfig[];
  // 解析器提供的合并单元格信息
  mergedRemarks?: { startRow: number; endRow: number; content: string; column: 'remarks' }[];
  mergedDescriptions?: { startRow: number; endRow: number; content: string; column: 'description' }[];
  // 定金和尾款功能
  depositPercentage?: number;
  depositAmount?: number;
  showBalance?: boolean;
  balanceAmount?: number;
  // 时间戳
  updatedAt?: string;
  // 🆕 保存时的列显示设置
  savedVisibleCols?: string[] | null;
}

export interface CustomWindow extends Window {
  __QUOTATION_DATA__?: QuotationData | null;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
  __QUOTATION_TYPE__?: 'quotation' | 'confirmation';
  __NOTES_CONFIG__?: NoteConfig[];
} 