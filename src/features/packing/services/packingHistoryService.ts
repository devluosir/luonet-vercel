import { PackingData, PackingHistory } from '../types';
import { getLocalStorageJSON } from '../../../utils/safeLocalStorage';
import { calculateTotalAmount } from '../utils/calculations';

const STORAGE_KEY = 'packing_history';

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 获取历史记录
const getPackingHistory = (): PackingHistory[] => {
  return getLocalStorageJSON(STORAGE_KEY, []);
};

/**
 * 保存装箱单历史
 */
export const savePackingHistory = (data: PackingData, existingId?: string): PackingHistory | null => {
  try {
    const history = getPackingHistory();
    const totalAmount = calculateTotalAmount(data);

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
        return updatedHistory;
      }
    }

    // 创建新记录
    const newHistory: PackingHistory = {
      id: generateId(),
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
    return newHistory;
  } catch (error) {
    console.error('Error saving packing history:', error);
    return null;
  }
};

/**
 * 根据ID获取历史记录
 */
export const getPackingHistoryById = (id: string): PackingHistory | null => {
  try {
    const history = getPackingHistory();
    return history.find(item => item.id === id) || null;
  } catch (error) {
    console.error('Error getting packing history by ID:', error);
    return null;
  }
};

/**
 * 获取所有历史记录
 */
export const getAllPackingHistory = (): PackingHistory[] => {
  try {
    return getPackingHistory();
  } catch (error) {
    console.error('Error getting all packing history:', error);
    return [];
  }
};

/**
 * 删除历史记录
 */
export const deletePackingHistory = (id: string): boolean => {
  try {
    const history = getPackingHistory();
    const filteredHistory = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));
    return true;
  } catch (error) {
    console.error('Error deleting packing history:', error);
    return false;
  }
};

/**
 * 导出历史记录
 */
export const exportPackingHistory = (): string => {
  try {
    const history = getPackingHistory();
    return JSON.stringify(history, null, 2);
  } catch (error) {
    console.error('Error exporting packing history:', error);
    return '';
  }
};

/**
 * 导入历史记录
 */
export const importPackingHistory = (jsonData: string, mergeStrategy: 'replace' | 'merge' = 'merge'): boolean => {
  try {
    const importedData = JSON.parse(jsonData);
    if (!Array.isArray(importedData)) {
      throw new Error('Invalid data format');
    }

    if (mergeStrategy === 'replace') {
      localStorage.setItem(STORAGE_KEY, jsonData);
    } else {
      const existingHistory = getPackingHistory();
      const mergedHistory = [...importedData, ...existingHistory];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedHistory));
    }

    return true;
  } catch (error) {
    console.error('Error importing packing history:', error);
    return false;
  }
};
