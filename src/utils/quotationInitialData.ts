import { format } from 'date-fns';
import { getLocalStorageJSON, getLocalStorageString } from '@/utils/safeLocalStorage';
import { getDefaultNotes } from './getDefaultNotes';
import type { QuotationData } from '@/types/quotation';
import { calculatePaymentDate } from './quotationCalculations';
import { OUR_COMPANY_PROFILE } from './domesticCompanyProfile';
import { DOMESTIC_DEFAULT_UNITS } from './unitUtils';

export function getInitialQuotationData(pageType: 'quotation' | 'confirmation' | 'domestic' = 'quotation'): QuotationData {
  const username = (() => {
    // 在服务器端渲染时，返回默认值避免水合错误
    if (typeof window === 'undefined') {
      return 'Roger';
    }
    
    try {
      const userInfo = getLocalStorageJSON('userInfo', null) as { username?: string } | null;
      if (userInfo) return userInfo.username || 'Roger';
      
      // 使用安全的字符串获取函数
      const name = getLocalStorageString('username');
      return name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : 'Roger';
    } catch { 
      return 'Roger' 
    }
  })();

  // 在服务器端渲染时，使用固定的默认日期避免水合错误
  const currentDate = typeof window === 'undefined' ? '2024-01-01' : format(new Date(), 'yyyy-MM-dd');

  const isDomestic = pageType === 'domestic';
  const notesType = pageType === 'confirmation' ? 'confirmation' : 'quotation';

  return {
    mode: isDomestic ? 'domestic' : 'export',
    to: '',
    domesticSeller: isDomestic ? { ...OUR_COMPANY_PROFILE } : undefined,
    domesticBuyer: isDomestic ? {} : undefined,
    inquiryNo: '',
    quotationNo: '',
    contractNo: '',
    date: currentDate,
    from: username,
    currency: isDomestic ? 'CNY' : 'USD',
    paymentDate: calculatePaymentDate(currentDate),
    items: [{
      id: 1,
      partName: '',
      description: '',
      quantity: 0,
      // 内销单据首行默认单位应为中文（与后续手动添加行的默认单位口径一致），避免出现 "pc" 混在 "只/套/节" 里
      unit: isDomestic ? DOMESTIC_DEFAULT_UNITS[0] : 'pc',
      unitPrice: 0,
      amount: 0,
      remarks: ''
    }],
    notes: getDefaultNotes(username, notesType),
    amountInWords: { 
      dollars: '', 
      cents: '', 
      hasDecimals: false 
    },
    showDescription: true,
    showRemarks: false,
    showBank: false,
    showStamp: pageType === 'confirmation', // 销售确认页面默认开启HK印章
    otherFees: [],
    customUnits: [],
    showMainPaymentTerm: false, // 统一控制付款条款显示
    showInvoiceReminder: false,
    additionalPaymentTerms: '',
    domesticTotalRemark: isDomestic ? '价格含13个点专票及运费' : undefined,
    showDomesticRemark: isDomestic ? false : undefined,
    domesticDocType: isDomestic ? 'quotation' : undefined,
    paymentMethod: 'T/T',
    templateConfig: { 
      headerType: 'bilingual', 
      stampType: 'none' 
    },
    // 定金和尾款功能默认值
    depositPercentage: undefined,
    depositAmount: undefined,
    showBalance: false,
    balanceAmount: undefined
  };
} 
