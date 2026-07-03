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
  customerId?: string;
  contactId?: string;
  description: string;
  orderNo?: string;
  /** 辙销C / 悬挂P / 善后S — 仅在有订单编号时有意义 */
  orderSubStatus?: OrderSubStatus;
  /** 订单附加标记的情况备注 — 仅在 orderSubStatus 存在时有意义 */
  orderSubStatusRemark?: string;

  // ── 订单状态表追踪字段（仅在有 orderNo 时使用，无需 D1 迁移）──────────
  /** 交货日期，[m.D] 格式，如 [7.15] */
  orderDeliveryDate?: string;
  /** 确认日，[m.D] 格式 */
  orderConfirmDate?: string;
  /** 客户方订单号；为空时界面 fallback 显示 customerNo */
  orderCustomerNo?: string;
  /** 交货执行情况，自由文本 */
  orderDeliveryStatus?: string;
  /** 订单金额（需要 order.financials 权限），含币种符号自由录入，如 ¥120000 / $15000 */
  orderAmount?: string;
  /** 回款月份，m 或 m.D 格式（需要 order.financials 权限） */
  orderPaymentDate?: string;
  /** 到账金额（需要 order.financials 权限），含币种符号，如 ¥120000 / $15000 */
  orderReceivedAmount?: string;
  // ─────────────────────────────────────────────────────────────────────

  supplierStatuses: SupplierQuoteStatus[];
  quotedStatuses: CustomerQuoteStatus[];
  createdAt: string;
  updatedAt: string;
  /** D1 软删除标记；'deleted' 表示已被删除，不应在 UI 中显示 */
  status?: 'active' | 'deleted';
}

export type InquiryBasicInput = Pick<
  InquiryRecord,
  | 'inquiryDate'
  | 'inquiryNo'
  | 'inquirer'
  | 'customerNo'
  | 'customerId'
  | 'contactId'
  | 'description'
  | 'orderNo'
  | 'orderSubStatus'
  | 'orderSubStatusRemark'
>;

export type InquiryRecordDraft = Omit<InquiryRecord, 'id' | 'createdAt' | 'updatedAt'>;
