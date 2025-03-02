import { InvoiceHistory } from '@/types/invoice-history';

const STORAGE_KEY = 'invoice_history';

// 获取历史记录
export const getInvoiceHistory = (): InvoiceHistory[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading invoice history:', error);
    return [];
  }
};

// 保存历史记录
export const saveInvoiceHistory = (history: InvoiceHistory[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Error saving invoice history:', error);
    return false;
  }
};

// 添加新记录
export const addInvoiceHistory = (data: InvoiceHistory): boolean => {
  try {
    const history = getInvoiceHistory();
    history.unshift(data);
    return saveInvoiceHistory(history);
  } catch (error) {
    console.error('Error adding invoice history:', error);
    return false;
  }
};

// 删除记录
export const deleteInvoiceHistory = (id: string): boolean => {
  try {
    const history = getInvoiceHistory();
    const filtered = history.filter(item => item.id !== id);
    return saveInvoiceHistory(filtered);
  } catch (error) {
    console.error('Error deleting invoice history:', error);
    return false;
  }
};

// 导入历史记录
export const importInvoiceHistory = (jsonData: string): boolean => {
  try {
    const data = JSON.parse(jsonData);
    if (!Array.isArray(data)) throw new Error('Invalid data format');
    
    // 处理从报价单导入的数据
    const processedData = data.map(item => {
      // 如果是报价单数据，进行转换
      if (item.data && item.data.items) {
        const convertedItems = item.data.items.map(lineItem => {
          // @ts-ignore - 处理报价单数据
          if (lineItem.partName && !lineItem.partname) {
            return {
              ...lineItem,
              // @ts-ignore - 转换字段名
              partname: lineItem.partName,
              // @ts-ignore - 删除原字段
              partName: undefined,
              // 添加发票特有字段
              lineNo: lineItem.id || 0,
              hsCode: '',
              highlight: {}
            };
          }
          return lineItem;
        });

        return {
          ...item,
          data: {
            ...item.data,
            items: convertedItems,
            // 添加发票必需字段
            customerPO: item.data.inquiryNo || '',
            showHsCode: false,
            templateConfig: {
              headerType: 'bilingual',
              invoiceType: 'invoice',
              stampType: 'none'
            },
            otherFees: item.data.otherFees || []
          }
        };
      }
      return item;
    });
    
    const history = getInvoiceHistory();
    const merged = [...processedData, ...history];
    const uniqueHistory = Array.from(new Map(merged.map(item => [item.id, item])).values());
    
    return saveInvoiceHistory(uniqueHistory);
  } catch (error) {
    console.error('Error importing invoice history:', error);
    return false;
  }
}; 