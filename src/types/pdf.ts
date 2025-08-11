import { jsPDF } from 'jspdf';

export interface PDFGeneratorData {
  templateConfig: {
    headerType: string;
    stampType: string;
    invoiceType?: 'invoice' | 'commercial' | 'proforma';
  };
  items: {
    hsCode?: string;
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
  }[];
  otherFees?: {
    description: string;
    amount: number;
    remarks?: string;
    highlight?: {
      description?: boolean;
      amount?: boolean;
      remarks?: boolean;
    };
  }[];
  to: string;
  customerPO: string;
  invoiceNo: string;
  date: string;
  currency: string;
  showHsCode: boolean;
  showPartName: boolean;
  showDescription: boolean;
  showRemarks: boolean;
  amountInWords: {
    dollars: string;
    cents: string;
    hasDecimals: boolean;
  };
  showBank: boolean;
  bankInfo: string;
  showPaymentTerms: boolean;
  paymentDate: string;
  additionalPaymentTerms?: string;
  showInvoiceReminder: boolean;
}

export interface PdfType {
  doc: jsPDF;
  didDrawPage?: () => void;
} 