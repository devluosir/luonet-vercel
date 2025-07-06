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
  showPaymentTerms?: boolean;
  showInvoiceReminder?: boolean;
  additionalPaymentTerms?: string;
  templateConfig?: {
    headerType: 'none' | 'bilingual' | 'english';
    stampType?: 'none' | 'shanghai' | 'hongkong';
  };
}

export interface CustomWindow extends Window {
  __QUOTATION_DATA__?: QuotationData | null;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
  __QUOTATION_TYPE__?: 'quotation' | 'confirmation';
} 