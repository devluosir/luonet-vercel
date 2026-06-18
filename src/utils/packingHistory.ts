// Packing list history management utilities
import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { d1SyncDocument } from './d1Sync';

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
  // 🆕 保存时的列显示设置
  savedVisibleCols?: string[] | null;
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

    // 🆕 获取当前的列显示设置
    let savedVisibleCols: string[] | null = null;
    if (typeof window !== 'undefined') {
      try {
        savedVisibleCols = getLocalStorageJSON('pk.visibleCols', null);
      } catch (e) {
        console.warn('Failed to read table column preferences:', e);
      }
    }

    // 🆕 将列显示设置添加到数据中
    const dataWithVisibleCols = {
      ...data,
      savedVisibleCols
    };

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
          data: dataWithVisibleCols // 🆕 使用包含列显示设置的数据
        };
        history[index] = updatedHistory;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingId,
          type: 'packing',
          doc_no: updatedHistory.invoiceNo || updatedHistory.orderNo || '',
          customer_name: updatedHistory.consigneeName,
          total_amount: totalAmount,
          currency: data.currency,
          data: dataWithVisibleCols,
        });
        
        return updatedHistory;
      }
    }

    // 🆕 检查是否已存在相同发票号的记录（与invoice模块保持一致）
    if (data.invoiceNo && data.invoiceNo.trim() !== '') {
      const existingPacking = history.find(item => 
        item.invoiceNo === data.invoiceNo && 
        item.invoiceNo.trim() !== '' // 避免空发票号的误匹配
      );
      
      if (existingPacking) {
        // 如果存在相同发票号，更新现有记录
        const updatedHistory = history.map(item => {
          if (item.id === existingPacking.id) {
            return {
              ...item,
              consigneeName: data.consignee.name,
              invoiceNo: data.invoiceNo,
              orderNo: data.orderNo,
              totalAmount,
              currency: data.currency,
              documentType: data.documentType,
              data: dataWithVisibleCols, // 🆕 使用包含列显示设置的数据
              updatedAt: new Date().toISOString()
            };
          }
          return item;
        });
        
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        } catch (storageError: any) {
          // 处理配额超限错误
          if (storageError?.name === 'QuotaExceededError' || storageError?.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn('存储配额超限，尝试清理后重试...');
            // 清理旧数据
            const keysToClean = Object.keys(localStorage).filter(k => 
              k.includes('packing') || k.includes('draft') || k.includes('v2')
            );
            keysToClean.forEach(k => localStorage.removeItem(k));
            
            // 只保留最近的50条记录
            const trimmedHistory = updatedHistory.slice(-50);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
          } else {
            throw storageError;
          }
        }
        
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingPacking.id,
          type: 'packing',
          doc_no: data.invoiceNo || data.orderNo || '',
          customer_name: data.consignee.name,
          total_amount: totalAmount,
          currency: data.currency,
          data: dataWithVisibleCols,
        });
        
        return updatedHistory.find(item => item.id === existingPacking.id) || null;
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
      data: dataWithVisibleCols // 🆕 使用包含列显示设置的数据
    };

    history.unshift(newHistory);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (storageError: any) {
      // 处理配额超限错误
      if (storageError?.name === 'QuotaExceededError' || storageError?.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn('存储配额超限，尝试清理后重试...');
        // 清理旧数据
        const keysToClean = Object.keys(localStorage).filter(k => 
          k.includes('packing') || k.includes('draft') || k.includes('v2')
        );
        keysToClean.forEach(k => localStorage.removeItem(k));
        
        // 只保留最近的50条记录
        const trimmedHistory = history.slice(-50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
      } else {
        throw storageError;
      }
    }
    
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    // D1 双写（fire-and-forget）
    d1SyncDocument('create', {
      id: newId,
      type: 'packing',
      doc_no: newHistory.invoiceNo || newHistory.orderNo || '',
      customer_name: newHistory.consigneeName,
      total_amount: totalAmount,
      currency: data.currency,
      data: dataWithVisibleCols,
    });
    
    return newHistory;
  } catch (error) {
    console.error('Error saving packing history:', error);
    return null;
  }
};

// 数据清理函数 - 确保所有字段都有正确的默认值
const sanitizePackingHistoryItem = (item: any): PackingHistory => {
  return {
    id: item.id || '',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
    consigneeName: item.consigneeName || '',
    invoiceNo: item.invoiceNo || '',
    orderNo: item.orderNo || '',
    totalAmount: typeof item.totalAmount === 'number' ? item.totalAmount : (parseFloat(item.totalAmount) || 0),
    currency: item.currency || 'USD',
    documentType: item.documentType || 'packing',
    data: item.data || {}
  };
};

// 获取所有历史记录
export const getPackingHistory = (filters?: PackingHistoryFilters): PackingHistory[] => {
  try {
    const rawHistory = getLocalStorageJSON(STORAGE_KEY, []) as any[];

    // 清理所有数据，确保字段完整性
    let history = rawHistory.map(sanitizePackingHistoryItem);

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
    const item = history.find(item => item.id === id);
    return item ? sanitizePackingHistoryItem(item) : null;
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
    d1SyncDocument('delete', { id, type: 'packing', doc_no: '', data: null });
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
