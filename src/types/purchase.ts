export interface PurchaseOrderData {
  // 基本信息
  attn: string;
  ourRef: string;
  yourRef: string;
  orderNo: string;
  date: string;
  supplierQuoteDate: string; // 供应商报价日期
  
  // 供货范围和成交价格
  contractAmount: string;
  projectSpecification: string;
  
  // 付款条件
  paymentTerms: string;
  
  // 发票要求
  invoiceRequirements: string;
  
  // 交货信息
  deliveryInfo: string;
  
  // 订单号码
  orderNumbers: string;
  
  // 其他设置
  showStamp: boolean;
  showBank: boolean;
  currency: 'USD' | 'EUR' | 'CNY';
  stampType: 'none' | 'shanghai' | 'hongkong'; // 印章类型
}

export interface CustomWindow extends Window {
  __PURCHASE_DATA__?: PurchaseOrderData | null;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
} 