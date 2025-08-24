// Packing list history management utilities
import { getLocalStorageJSON } from '@/utils/safeLocalStorage';

interface PackingItem {
  id: number;
  serialNo: string;
  description: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  netWeight: number;
  grossWeight: number;
  packageQty: number;
  dimensions: string;
  unit: string;
}

interface PackingData {
  orderNo: string;
  invoiceNo: string;
  date: string;
  consignee: {
    name: string;
  };

  items: PackingItem[];
  currency: string;
  remarkOptions: {
    shipsSpares: boolean;
    customsPurpose: boolean;
  };
  showHsCode: boolean;
  showDimensions: boolean;
  showWeightAndPackage: boolean;
  showPrice: boolean;
  dimensionUnit: string;
  documentType: 'proforma' | 'packing' | 'both';
  templateConfig: {
    headerType: 'none' | 'bilingual' | 'english';
  };
  customUnits?: string[];
}

export interface PackingHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  consigneeName: string;
  invoiceNo: string;
  orderNo: string;
  totalAmount: number;
  currency: string;
  documentType: 'proforma' | 'packing' | 'both';
  data: PackingData;
}

export interface PackingHistoryFilters {
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  documentType?: 'proforma' | 'packing' | 'both' | 'all';
}

const STORAGE_KEY = 'packing_history';

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 保存装箱单历史
export const savePackingHistory = (data: PackingData, existingId?: string) => {
  try {
    const history = getPackingHistory();
    const totalAmount = (data.items || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    // 如果提供了现有ID，则更新该记录
    if (existingId) {
      const index = history.findIndex(item => item.id === existingId);
      if (index !== -1) {
        // 保留原始创建时间
        const originalCreatedAt = history[index].createdAt;
        const updatedHistory: PackingHistory = {
          id: existingId,
          createdAt: originalCreatedAt,
          updatedAt: new Date().toISOString(),
          consigneeName: data.consignee.name,
          invoiceNo: data.invoiceNo,
          orderNo: data.orderNo,
          totalAmount,
          currency: data.currency,
          documentType: data.documentType,
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
    const newHistory: PackingHistory = {
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      consigneeName: data.consignee.name,
      invoiceNo: data.invoiceNo,
      orderNo: data.orderNo,
      totalAmount,
      currency: data.currency,
      documentType: data.documentType,
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
    return null;
  }
};

// 获取所有历史记录
export const getPackingHistory = (filters?: PackingHistoryFilters): PackingHistory[] => {
  try {
    let history = getLocalStorageJSON(STORAGE_KEY, []);

    if (filters) {
      // 搜索
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        history = history.filter((item: PackingHistory) => 
          item.consigneeName.toLowerCase().includes(searchLower) ||
          item.invoiceNo.toLowerCase().includes(searchLower) ||
          item.orderNo.toLowerCase().includes(searchLower)
        );
      }

      // 类型筛选
      if (filters.documentType && filters.documentType !== 'all') {
        history = history.filter((item: PackingHistory) => item.documentType === filters.documentType);
      }
    }

    return history;
  } catch (error) {
    console.error('Error getting packing history:', error);
    return [];
  }
};

// 根据ID获取单个历史记录
export const getPackingHistoryById = (id: string): PackingHistory | null => {
  try {
    const history = getPackingHistory();
    return history.find(item => item.id === id) || null;
  } catch (error) {
    console.error('Error getting packing history by id:', error);
    return null;
  }
};

// 删除历史记录
export const deletePackingHistory = (id: string): boolean => {
  try {
    const history = getPackingHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting packing history:', error);
    return false;
  }
};

// 导出历史记录
export const exportPackingHistory = (): string => {
  try {
    const history = getPackingHistory();
    return JSON.stringify(history, null, 2);
  } catch (error) {
    console.error('Error exporting packing history:', error);
    return '';
  }
};

// 导入历史记录
export const importPackingHistory = (jsonData: string, mergeStrategy: 'replace' | 'merge' = 'merge'): boolean => {
  try {
    // 确保输入是有效的JSON字符串
    if (!jsonData || typeof jsonData !== 'string') {
      console.error('Invalid input: jsonData must be a string');
      return false;
    }

    // 处理可能的BOM标记（在iOS上可能会出现）
    let cleanJsonData = jsonData;
    if (jsonData.charCodeAt(0) === 0xFEFF) {
      cleanJsonData = jsonData.slice(1);
      if (process.env.NODE_ENV === 'development') {
        console.log('Removed BOM marker from JSON data');
      }
    }

    // 尝试解析JSON
    let importedHistory;
    try {
      importedHistory = JSON.parse(cleanJsonData);
    } catch (parseError) {
      // 尝试修复常见的JSON格式问题
      try {
        const fixedJson = cleanJsonData
          .replace(/\n/g, '')
          .replace(/\r/g, '')
          .replace(/\t/g, '')
          .trim();
        importedHistory = JSON.parse(fixedJson);
        if (process.env.NODE_ENV === 'development') {
          console.log('Successfully parsed JSON after fixing format issues');
        }
      } catch (secondError) {
        console.error('Failed to parse JSON even after cleanup:', secondError);
        return false;
      }
    }
    
    // 验证导入的数据格式
    if (!Array.isArray(importedHistory)) {
      console.error('Invalid data format: expected an array');
      return false;
    }

    // 基本验证导入的数据
    const processedData = importedHistory.filter(item => {
      return item && typeof item === 'object' && item.id;
    });

    // 确保至少有一条有效记录
    if (processedData.length === 0) {
      console.error('No valid records found in imported data');
      return false;
    }

    try {
      if (mergeStrategy === 'replace') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(processedData));
      } else {
        // 合并策略：保留现有记录，添加新记录（根据 id 去重）
        const existingHistory = getPackingHistory();
        const existingIds = new Set(existingHistory.map(item => item.id));
        const newHistory = [
          ...existingHistory,
          ...processedData.filter(item => !existingIds.has(item.id))
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      }
      return true;
    } catch (storageError) {
      console.error('Error saving to localStorage:', storageError);
      return false;
    }
  } catch (error) {
    console.error('Error importing packing history:', error);
    return false;
  }
}; 