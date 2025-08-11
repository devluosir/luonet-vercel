// 发票功能模块入口文件

// 导出主页面组件
export { InvoicePage } from './app/InvoicePage';

// 导出组件
export { SettingsPanel } from './components/SettingsPanel';
export { InvoiceActions } from './components/InvoiceActions';
export { PaymentTermsSection } from './components/PaymentTermsSection';

// 导出hooks
export { useInvoiceForm } from './hooks/useInvoiceForm';
export { usePasteImport } from './hooks/usePasteImport';

// 导出状态管理
export { useInvoiceStore } from './state/invoice.store';

// 导出服务
export { InvoiceService } from './services/invoice.service';
export { PDFService } from './services/pdf.service';

// 导出类型
export type {
  InvoiceData,
  LineItem,
  OtherFee,
  InvoiceTemplateConfig,
  AmountInWords,
  InvoiceHistoryItem,
  InvoiceFormState,
  InvoiceFormActions
} from './types';

// 导出工具函数
export {
  calculateAmount,
  getTotalAmount,
  calculatePaymentDate,
  numberToWords,
  processUnitPlural
} from './utils/calculations';

export {
  parsePastedData,
  processQuotationData,
  createManualInputModal
} from './utils/importUtils';

export {
  handleTableKeyDown,
  getNavigableColumns
} from './utils/keyboardNavigation';

// 导出常量
export {
  DEFAULT_UNITS,
  CURRENCY_OPTIONS,
  HEADER_TYPE_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  STAMP_TYPE_OPTIONS,
  DISPLAY_OPTIONS,
  INPUT_CLASSNAMES,
  HIGHLIGHT_CLASS,
  DEFAULT_INVOICE_DATA
} from './constants/settings';
