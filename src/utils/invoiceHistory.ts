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
    
    const history = getInvoiceHistory();
    const merged = [...data, ...history];
    const uniqueHistory = Array.from(new Map(merged.map(item => [item.id, item])).values());
    
    return saveInvoiceHistory(uniqueHistory);
  } catch (error) {
    console.error('Error importing invoice history:', error);
    return false;
  }
}; 