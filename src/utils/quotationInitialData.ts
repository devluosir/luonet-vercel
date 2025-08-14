import { format } from 'date-fns';
import { getLocalStorageJSON, getLocalStorageString } from '@/utils/safeLocalStorage';
import { getDefaultNotes } from './getDefaultNotes';
import type { QuotationData } from '@/types/quotation';
import { calculatePaymentDate } from './quotationCalculations';

export function getInitialQuotationData(): QuotationData {
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

  return {
    to: '',
    inquiryNo: '',
    quotationNo: '',
    contractNo: '',
    date: currentDate,
    from: username,
    currency: 'USD',
    paymentDate: calculatePaymentDate(currentDate),
    items: [{ 
      id: 1, 
      partName: '', 
      description: '', 
      quantity: 0, 
      unit: 'pc', 
      unitPrice: 0, 
      amount: 0, 
      remarks: '' 
    }],
    notes: getDefaultNotes(username, 'quotation'),
    amountInWords: { 
      dollars: '', 
      cents: '', 
      hasDecimals: false 
    },
    showDescription: true,
    showRemarks: false,
    showBank: false,
    showStamp: false,
    otherFees: [],
    customUnits: [],
    showMainPaymentTerm: false, // 统一控制付款条款显示
    showInvoiceReminder: false,
    additionalPaymentTerms: '',
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