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
export const getQuotationHistory = (filters?: QuotationHistoryFilters): QuotationHistory[] => {
  try {
    let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    if (filters) {
      // 搜索
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        history = history.filter((item: QuotationHistory) => 
          item.customerName.toLowerCase().includes(searchLower) ||
          item.quotationNo.toLowerCase().includes(searchLower)
        );
      }

      // 类型筛选
      if (filters.type && filters.type !== 'all') {
        history = history.filter((item: QuotationHistory) => item.type === filters.type);
      }
    }

    return history;
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

// 导出历史记录
export const exportQuotationHistory = (): string => {
  try {
    const history = getQuotationHistory();
    return JSON.stringify(history, null, 2);
  } catch (error) {
    console.error('Error exporting quotation history:', error);
    return '';
  }
};

// 导入历史记录
export const importQuotationHistory = (jsonData: string, mergeStrategy: 'replace' | 'merge' = 'merge'): boolean => {
  try {
    const importedHistory = JSON.parse(jsonData) as QuotationHistory[];
    
    // 验证导入的数据格式
    if (!Array.isArray(importedHistory) || !importedHistory.every(item => 
      typeof item.id === 'string' &&
      typeof item.createdAt === 'string' &&
      typeof item.updatedAt === 'string' &&
      (item.type === 'quotation' || item.type === 'confirmation') &&
      typeof item.customerName === 'string' &&
      typeof item.quotationNo === 'string' &&
      typeof item.totalAmount === 'number' &&
      typeof item.currency === 'string' &&
      typeof item.data === 'object'
    )) {
      throw new Error('Invalid data format');
    }

    if (mergeStrategy === 'replace') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(importedHistory));
    } else {
      // 合并策略：保留现有记录，添加新记录（根据 id 去重）
      const existingHistory = getQuotationHistory();
      const existingIds = new Set(existingHistory.map(item => item.id));
      const newHistory = [
        ...existingHistory,
        ...importedHistory.filter(item => !existingIds.has(item.id))
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    }
    
    return true;
  } catch (error) {
    console.error('Error importing quotation history:', error);
    return false;
  }
}; 