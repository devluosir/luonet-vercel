import { format } from 'date-fns';
import { getLocalStorageJSON, getLocalStorageString } from '@/utils/safeLocalStorage';
import { getDefaultNotes } from './getDefaultNotes';
import type { QuotationData } from '@/types/quotation';
import { calculatePaymentDate } from './quotationCalculations';

export function getInitialQuotationData(): QuotationData {
  const username = (() => {
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

  const currentDate = format(new Date(), 'yyyy-MM-dd');

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
    showPaymentTerms: true, // 常显，不再通过设置面板控制
    showMainPaymentTerm: false,
    showInvoiceReminder: false,
    additionalPaymentTerms: '',
    templateConfig: { 
      headerType: 'bilingual', 
      stampType: 'none' 
    }
  };
} 