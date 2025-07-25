export interface LineItem {
  lineNo: number;
  hsCode: string;
  partname: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  highlight?: {
    hsCode?: boolean;
    partname?: boolean;
    description?: boolean;
    quantity?: boolean;
    unit?: boolean;
    unitPrice?: boolean;
    amount?: boolean;
  };
}

export interface OtherFee {
  id: number;
  description: string;
  amount: number;
}

export interface InvoiceTemplateConfig {
  headerType: 'none' | 'bilingual' | 'english';
  invoiceType: 'invoice' | 'commercial' | 'proforma';
  stampType: 'none' | 'stamp' | 'signature' | 'shanghai' | 'hongkong';
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
  amountInWords: {
    dollars: string;
    cents: string;
    hasDecimals: boolean;
  };
  remarks?: string;
  showHsCode: boolean;
  showDescription: boolean;
  showBank: boolean;
  showInvoiceReminder: boolean;
  currency: 'USD' | 'CNY';
  templateConfig: InvoiceTemplateConfig;
  customUnits?: string[];
  otherFees: Array<{
    id: number;
    description: string;
    amount: number;
    highlight?: {
      description?: boolean;
      amount?: boolean;
    };
  }>;
} 