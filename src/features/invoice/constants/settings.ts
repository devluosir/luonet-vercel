// 默认单位列表（需要单复数变化的单位）
export const DEFAULT_UNITS = ['pc', 'set', 'length'] as const;

// 币种选项
export const CURRENCY_OPTIONS = [
  { value: 'USD', label: '$' },
  { value: 'CNY', label: '¥' }
] as const;

// Header类型选项
export const HEADER_TYPE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'bilingual', label: 'CN+EN' },
  { value: 'english', label: 'EN' }
] as const;

// 发票类型选项
export const INVOICE_TYPE_OPTIONS = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'proforma', label: 'Proforma' }
] as const;

// 印章类型选项
export const STAMP_TYPE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'shanghai', label: 'SH' },
  { value: 'hongkong', label: 'HK' }
] as const;

// 显示选项
export const DISPLAY_OPTIONS = [
  { key: 'showBank', label: 'Bank' },
  { key: 'showHsCode', label: 'HS Code' },
  { key: 'showDescription', label: 'Description' }
] as const;

// 输入框样式类名
export const INPUT_CLASSNAMES = {
  base: `w-full px-4 py-2.5 rounded-2xl
    bg-white/95 dark:bg-[#1c1c1e]/95
    border border-[#007AFF]/10 dark:border-[#0A84FF]/10
    focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
    placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
    text-[15px] leading-relaxed text-gray-800 dark:text-gray-100
    transition-all duration-300 ease-out
    hover:border-[#007AFF]/20 dark:hover:border-[#0A84FF]/20
    shadow-sm hover:shadow-md`,
  
  date: `w-full min-w-0 px-4 py-2.5 rounded-2xl
    bg-white/95 dark:bg-[#1c1c1e]/95
    border border-[#007AFF]/10 dark:border-[#0A84FF]/10
    focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
    placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
    text-[15px] leading-relaxed text-gray-800 dark:text-gray-100
    transition-all duration-300 ease-out
    hover:border-[#007AFF]/20 dark:hover:border-[#0A84FF]/20
    shadow-sm hover:shadow-md`,
  
  table: `w-full px-3 py-2 rounded-xl
    bg-transparent backdrop-blur-sm
    border border-transparent
    focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20
    text-[14px] leading-relaxed text-gray-800 dark:text-gray-100
    placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
    transition-all duration-300 ease-out
    hover:bg-[#007AFF]/5 dark:hover:bg-[#0A84FF]/5
    text-center whitespace-pre-wrap
    ios-optimized-input`,
  
  number: `w-full px-3 py-2 rounded-xl
    bg-transparent backdrop-blur-sm
    border border-transparent
    focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20
    text-[14px] leading-relaxed text-gray-800 dark:text-gray-100
    placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
    transition-all duration-300 ease-out
    hover:bg-[#007AFF]/5 dark:hover:bg-[#0A84FF]/5
    text-center whitespace-pre-wrap
    ios-optimized-input
    [appearance:textfield] 
    [&::-webkit-outer-spin-button]:appearance-none 
    [&::-webkit-inner-spin-button]:appearance-none`
} as const;

// 高亮样式类名
export const HIGHLIGHT_CLASS = 'text-red-500 dark:text-red-400 font-medium';

// 默认发票数据
export const DEFAULT_INVOICE_DATA = {
  to: '',
  invoiceNo: '',
  date: new Date().toISOString().split('T')[0],
  customerPO: '',
  items: [{
    lineNo: 1,
    hsCode: '',
    partname: '',
    description: '',
    quantity: 0,
    unit: 'pc',
    unitPrice: 0,
    amount: 0
  }],
  bankInfo: '',
  paymentDate: '',
  showPaymentTerms: false,
  additionalPaymentTerms: '',
  amountInWords: {
    dollars: '',
    cents: '',
    hasDecimals: false
  },
  showHsCode: false,
  showDescription: true,
  showBank: false,
  showInvoiceReminder: false,
  currency: 'USD' as const,
  templateConfig: {
    headerType: 'bilingual' as const,
    invoiceType: 'invoice' as const,
    stampType: 'none' as const
  },
  customUnits: [],
  otherFees: []
};
