import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { isQuotationUpgraded } from '@/utils/dashboardUtils';

// 统一的文档计数工具函数
export const getAllDocuments = (): { type: string, id: string, createdAt: string, [key: string]: any }[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = [
      ...getLocalStorageJSON('quotation_history', []),
      ...getLocalStorageJSON('invoice_history', []),
      ...getLocalStorageJSON('packing_history', []),
      ...getLocalStorageJSON('purchase_history', [])
    ];
    return data;
  } catch (error) {
    console.error('获取所有文档失败:', error);
    return [];
  }
};

// 获取各类单据数量 - 使用统一的缓存读取方式
export const getQuotationCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const quotationHistory = getLocalStorageJSON('quotation_history', []);
    
    // 获取所有confirmation记录，用于过滤
    const confirmationRecords = quotationHistory.filter((item: any) => 
      'type' in item && item.type === 'confirmation'
    );
    
    // 只获取type为'quotation'且未升级的记录
    return quotationHistory.filter((item: any) => {
      // 只保留type为'quotation'的记录
      if (!('type' in item) || item.type !== 'quotation') return false;
      
      // 检查这个报价单是否已经升级为confirmation
      const isUpgraded = isQuotationUpgraded(item, confirmationRecords);
      
      // 如果已升级，则不计入报价单数量
      return !isUpgraded;
    }).length;
  } catch (error) {
    console.error('获取报价单数量失败:', error);
    return 0;
  }
};

export const getConfirmationCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const quotationHistory = getLocalStorageJSON('quotation_history', []);
    // 只获取type为'confirmation'的记录
    return quotationHistory.filter((item: any) => 
      'type' in item && item.type === 'confirmation'
    ).length;
  } catch (error) {
    console.error('获取销售确认数量失败:', error);
    return 0;
  }
};

export const getInvoiceCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const invoiceHistory = getLocalStorageJSON('invoice_history', []);
    return invoiceHistory.length;
  } catch (error) {
    console.error('获取发票数量失败:', error);
    return 0;
  }
};

export const getPackingCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const packingHistory = getLocalStorageJSON('packing_history', []);
    return packingHistory.length;
  } catch (error) {
    console.error('获取装箱单数量失败:', error);
    return 0;
  }
};

export const getPurchaseCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const purchaseHistory = getLocalStorageJSON('purchase_history', []);
    return purchaseHistory.length;
  } catch (error) {
    console.error('获取采购订单数量失败:', error);
    return 0;
  }
};

// 获取所有文档计数
export const getAllDocumentCounts = () => {
  return {
    quotation: getQuotationCount(),
    confirmation: getConfirmationCount(),
    invoice: getInvoiceCount(),
    packing: getPackingCount(),
    purchase: getPurchaseCount()
  };
};

// 安全的本地存储访问工具
export const getSafeLocalStorage = (key: string) => {
  return getLocalStorageJSON(key, []);
}; 