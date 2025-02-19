import { QuotationData } from '@/types/quotation';
import { QuotationHistory, QuotationHistoryFilters } from '@/types/quotation-history';

const STORAGE_KEY = 'quotation_history';

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 保存报价历史
export const saveQuotationHistory = (type: 'quotation' | 'confirmation', data: QuotationData) => {
  try {
    const history = getQuotationHistory();
    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0) +
      (data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0);

    const newHistory: QuotationHistory = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type,
      customerName: data.to,
      quotationNo: data.quotationNo,
      totalAmount,
      currency: data.currency,
      data
    };

    history.unshift(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return newHistory;
  } catch (error) {
    console.error('Error saving quotation history:', error);
    return null;
  }
};

// 获取所有历史记录
export const getQuotationHistory = (): QuotationHistory[] => {
  try {
    const history = localStorage.getItem(STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error getting quotation history:', error);
    return [];
  }
};

// 根据ID获取单个历史记录
export const getQuotationHistoryById = (id: string): QuotationHistory | null => {
  try {
    const history = getQuotationHistory();
    return history.find(item => item.id === id) || null;
  } catch (error) {
    console.error('Error getting quotation history by id:', error);
    return null;
  }
};

// 更新历史记录
export const updateQuotationHistory = (id: string, data: QuotationData): boolean => {
  try {
    const history = getQuotationHistory();
    const index = history.findIndex(item => item.id === id);
    if (index === -1) return false;

    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0) +
      (data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0);

    history[index] = {
      ...history[index],
      updatedAt: new Date().toISOString(),
      customerName: data.to,
      quotationNo: data.quotationNo,
      totalAmount,
      currency: data.currency,
      data
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Error updating quotation history:', error);
    return false;
  }
};

// 删除历史记录
export const deleteQuotationHistory = (id: string): boolean => {
  try {
    const history = getQuotationHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting quotation history:', error);
    return false;
  }
};

// 搜索和筛选历史记录
export const searchQuotationHistory = (filters: QuotationHistoryFilters): QuotationHistory[] => {
  try {
    let history = getQuotationHistory();

    // 搜索
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      history = history.filter(item => 
        item.customerName.toLowerCase().includes(searchLower) ||
        item.quotationNo.toLowerCase().includes(searchLower)
      );
    }

    // 日期范围筛选
    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start).getTime();
      const end = new Date(filters.dateRange.end).getTime();
      history = history.filter(item => {
        const date = new Date(item.createdAt).getTime();
        return date >= start && date <= end;
      });
    }

    // 类型筛选
    if (filters.type && filters.type !== 'all') {
      history = history.filter(item => item.type === filters.type);
    }

    return history;
  } catch (error) {
    console.error('Error searching quotation history:', error);
    return [];
  }
}; 