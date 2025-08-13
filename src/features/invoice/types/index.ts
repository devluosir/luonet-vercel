export interface LineItem {
  lineNo: number;
  hsCode: string;
  partname: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  remarks?: string;
  highlight?: {
    hsCode?: boolean;
    partname?: boolean;
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

export interface InvoiceTemplateConfig {
  headerType: 'none' | 'bilingual' | 'english';
  invoiceType: 'invoice' | 'commercial' | 'proforma';
  stampType: 'none' | 'stamp' | 'signature' | 'shanghai' | 'hongkong';
}

export interface AmountInWords {
  dollars: string;
  cents: string;
  hasDecimals: boolean;
}

export interface InvoiceData {
  invoiceNo: string;
  date: string;
  to: string;
  customerPO: string;
  items: LineItem[];
  bankInfo: string;
  paymentDate: string;
  showPaymentTerms: boolean;
  additionalPaymentTerms: string;
  amountInWords: AmountInWords;
  remarks?: string;
  showHsCode: boolean;
  showPartName: boolean;
  showDescription: boolean;
  showRemarks: boolean;
  showBank: boolean;
  showInvoiceReminder: boolean;
  currency: 'USD' | 'CNY';
  templateConfig: InvoiceTemplateConfig;
  customUnits?: string[];
  otherFees: OtherFee[];
  depositPercentage?: number;
  depositAmount?: number;
  showBalance?: boolean;
  balanceAmount?: number;
}

export interface InvoiceHistoryItem {
  id: string;
  customerName: string;
  invoiceNo: string;
  totalAmount: number;
  currency: 'USD' | 'CNY';
  data: InvoiceData;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFormState {
  data: InvoiceData;
  isEditMode: boolean;
  editId: string | null;
  isSaving: boolean;
  saveSuccess: boolean;
  saveMessage: string;
  showSettings: boolean;
  showPreview: boolean;
  previewItem: InvoiceHistoryItem | null;
  customUnit: string;
  showUnitSuccess: boolean;
  focusedCell: {
    row: number;
    column: string;
  } | null;
}

export interface InvoiceFormActions {
  updateData: (updates: Partial<InvoiceData>) => void;
  updateLineItem: (index: number, field: keyof LineItem, value: string | number) => void;
  addLineItem: () => void;
  removeLineItem: (index: number) => void;
  addOtherFee: () => void;
  removeOtherFee: (id: number) => void;
  updateOtherFee: (id: number, field: keyof OtherFee, value: string | number) => void;
  addCustomUnit: (unit: string) => void;
  removeCustomUnit: (index: number) => void;
  setFocusedCell: (cell: { row: number; column: string } | null) => void;
  toggleSettings: () => void;
  togglePreview: () => void;
  setPreviewItem: (item: InvoiceHistoryItem | null) => void;
  resetForm: () => void;
  previewPDF: () => Promise<string>;
}
