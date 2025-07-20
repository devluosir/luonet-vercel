import { PurchaseOrderData } from '@/types/purchase';

export interface PurchaseHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  supplierName: string;
  orderNo: string;
  totalAmount: number;
  currency: string;
  data: PurchaseOrderData;
}

export interface PurchaseHistoryFilters {
  search?: string;
}

const STORAGE_KEY = 'purchase_history';

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 保存采购历史
export const savePurchaseHistory = (data: PurchaseOrderData, existingId?: string) => {
  try {
    const history = getPurchaseHistory();
    const totalAmount = parseFloat(data.contractAmount) || 0;

    // 如果提供了现有ID，则更新该记录
    if (existingId) {
      const index = history.findIndex(item => item.id === existingId);
      if (index !== -1) {
        // 保留原始创建时间
        const originalCreatedAt = history[index].createdAt;
        const updatedHistory: PurchaseHistory = {
          id: existingId,
          createdAt: originalCreatedAt,
          updatedAt: new Date().toISOString(),
          supplierName: data.attn,
          orderNo: data.orderNo,
          totalAmount,
          currency: data.currency,
          data
        };
        history[index] = updatedHistory;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }
        
        return updatedHistory;
      }
    }

    // 如果没有提供ID或找不到记录，创建新记录
    const newId = existingId || generateId();
    const newHistory: PurchaseHistory = {
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supplierName: data.attn,
      orderNo: data.orderNo,
      totalAmount,
      currency: data.currency,
      data
    };

    history.unshift(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }
    
    return newHistory;
  } catch (error) {
    console.error('Error saving purchase history:', error);
    return null;
  }
};

// 获取所有历史记录
export const getPurchaseHistory = (filters?: PurchaseHistoryFilters): PurchaseHistory[] => {
  try {
    let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    if (filters) {
      // 搜索
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        history = history.filter((item: PurchaseHistory) => 
          item.supplierName.toLowerCase().includes(searchLower) ||
          item.orderNo.toLowerCase().includes(searchLower)
        );
      }
    }

    return history;
  } catch (error) {
    console.error('Error getting purchase history:', error);
    return [];
  }
};

// 根据ID获取单个历史记录
export const getPurchaseHistoryById = (id: string): PurchaseHistory | null => {
  try {
    const history = getPurchaseHistory();
    return history.find(item => item.id === id) || null;
  } catch (error) {
    console.error('Error getting purchase history by id:', error);
    return null;
  }
};

// 删除历史记录
export const deletePurchaseHistory = (id: string): boolean => {
  try {
    const history = getPurchaseHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting purchase history:', error);
    return false;
  }
};

// 导出历史记录
export const exportPurchaseHistory = (): string => {
  try {
    const history = getPurchaseHistory();
    return JSON.stringify(history, null, 2);
  } catch (error) {
    console.error('Error exporting purchase history:', error);
    return '';
  }
};

// 导入历史记录
export const importPurchaseHistory = (jsonData: string): boolean => {
  try {
    if (!jsonData || typeof jsonData !== 'string') {
      console.error('Invalid input: jsonData must be a string');
      return false;
    }

    let cleanJsonData = jsonData;
    if (jsonData.charCodeAt(0) === 0xFEFF) {
      cleanJsonData = jsonData.slice(1);
    }

    const importedHistory = JSON.parse(cleanJsonData);
    
    if (!Array.isArray(importedHistory)) {
      console.error('Invalid data format: expected an array');
      return false;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(importedHistory));
    return true;
  } catch (error) {
    console.error('Error importing purchase history:', error);
    return false;
  }
}; 