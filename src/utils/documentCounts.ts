// 统一的文档计数工具函数
export const getAllDocuments = (): { type: string, id: string, createdAt: string, [key: string]: any }[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = [
      ...JSON.parse(localStorage.getItem('quotation_history') || '[]'),
      ...JSON.parse(localStorage.getItem('invoice_history') || '[]'),
      ...JSON.parse(localStorage.getItem('packing_history') || '[]'),
      ...JSON.parse(localStorage.getItem('purchase_history') || '[]')
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
    const quotationHistory = JSON.parse(localStorage.getItem('quotation_history') || '[]');
    // 只获取type为'quotation'的记录
    return quotationHistory.filter((item: any) => 
      'type' in item && item.type === 'quotation'
    ).length;
  } catch (error) {
    console.error('获取报价单数量失败:', error);
    return 0;
  }
};

export const getConfirmationCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const quotationHistory = JSON.parse(localStorage.getItem('quotation_history') || '[]');
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
    const invoiceHistory = JSON.parse(localStorage.getItem('invoice_history') || '[]');
    return invoiceHistory.length;
  } catch (error) {
    console.error('获取发票数量失败:', error);
    return 0;
  }
};

export const getPackingCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const packingHistory = JSON.parse(localStorage.getItem('packing_history') || '[]');
    return packingHistory.length;
  } catch (error) {
    console.error('获取装箱单数量失败:', error);
    return 0;
  }
};

export const getPurchaseCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const purchaseHistory = JSON.parse(localStorage.getItem('purchase_history') || '[]');
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
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return null;
  }
}; 