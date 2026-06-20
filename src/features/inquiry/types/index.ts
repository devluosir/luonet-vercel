/** 供应商报价状态 */
export type SupplierStatus = 'pending' | 'quoted' | 'unavailable' | 'need_info';

export interface SupplierQuoteStatus {
  id: string;
  supplierShortName: string;
  quoteDate?: string;
  status?: SupplierStatus;
}

export interface CustomerQuoteStatus {
  id: string;
  quoteDate: string;
  supplierShortName: string;
  version: string;
}

export interface InquiryRecord {
  id: string;
  inquiryDate: string;
  inquiryNo: string;
  inquirer: string;
  customerNo: string;
  description: string;
  supplierStatuses: SupplierQuoteStatus[];
  quotedStatuses: CustomerQuoteStatus[];
  createdAt: string;
  updatedAt: string;
}

export type InquiryBasicInput = Pick<
  InquiryRecord,
  'inquiryDate' | 'inquiryNo' | 'inquirer' | 'customerNo' | 'description'
>;

export type InquiryRecordDraft = Omit<InquiryRecord, 'id' | 'createdAt' | 'updatedAt'>;
