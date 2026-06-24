/** 供应商报价状态 */
export type SupplierStatus = 'pending' | 'quoted' | 'unavailable' | 'need_info';

/** 订单附加标记：辙销C / 悬挂P / 善后S */
export type OrderSubStatus = 'cancelled' | 'suspended' | 'followup';

export interface SupplierQuoteStatus {
  id: string;
  supplierShortName: string;
  quoteDate?: string;
  status?: SupplierStatus;
}

/** 'quoted'=已报价（默认）；'unavailable'=已回复客户无法报价；'supplemented'=已补充信息给供应商；'closed'=询价已关闭 */
export type CustomerQuoteType = 'quoted' | 'unavailable' | 'supplemented' | 'closed';

export interface CustomerQuoteStatus {
  id: string;
  quoteDate: string;
  supplierShortName: string;
  version: string;
  type?: CustomerQuoteType;
}

export interface InquiryRecord {
  id: string;
  inquiryDate: string;
  inquiryNo: string;
  inquirer: string;
  customerNo: string;
  description: string;
  orderNo?: string;
  /** 辙销C / 悬挂P / 善后S — 仅在有订单编号时有意义 */
  orderSubStatus?: OrderSubStatus;
  supplierStatuses: SupplierQuoteStatus[];
  quotedStatuses: CustomerQuoteStatus[];
  createdAt: string;
  updatedAt: string;
  /** D1 软删除标记；'deleted' 表示已被删除，不应在 UI 中显示 */
  status?: 'active' | 'deleted';
}

export type InquiryBasicInput = Pick<
  InquiryRecord,
  'inquiryDate' | 'inquiryNo' | 'inquirer' | 'customerNo' | 'description' | 'orderNo' | 'orderSubStatus'
>;

export type InquiryRecordDraft = Omit<InquiryRecord, 'id' | 'createdAt' | 'updatedAt'>;
