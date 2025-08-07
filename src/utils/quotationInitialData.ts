import { format } from 'date-fns';
import { getDefaultNotes } from '@/utils/getDefaultNotes';
import type { QuotationData } from '@/types/quotation';

// 缓存localStorage数据
const localStorageCache = new Map<string, unknown>();

// 获取缓存的localStorage数据
const getCachedLocalStorage = (key: string) => {
  if (!localStorageCache.has(key)) {
    try {
      const data = localStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : null;
      localStorageCache.set(key, parsed);
      return parsed;
    } catch (error) {
      console.warn(`Failed to parse localStorage key: ${key}`, error);
      return null;
    }
  }
  return localStorageCache.get(key);
};

export function getInitialQuotationData(): QuotationData {
  const username = (() => {
    try {
      const userInfo = getCachedLocalStorage('userInfo');
      if (userInfo) return userInfo.username || 'Roger';
      const name = getCachedLocalStorage('username');
      return name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : 'Roger';
    } catch { 
      return 'Roger' 
    }
  })();

  return {
    to: '',
    inquiryNo: '',
    quotationNo: '',
    contractNo: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    from: username,
    currency: 'USD',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
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
    showRemarks: true,
    showBank: false,
    showStamp: false,
    otherFees: [],
    customUnits: [],
    showPaymentTerms: false,
    showInvoiceReminder: false,
    additionalPaymentTerms: '',
    templateConfig: { 
      headerType: 'none', 
      stampType: 'none' 
    }
  };
} 