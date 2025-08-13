import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { Consignee, HistoryDocument } from '../types';

// 从localStorage中提取收货人数据
export function extractConsigneesFromHistory(): Consignee[] {
  try {
    if (typeof window === 'undefined') return [];

    const packingHistory = getLocalStorageJSON<HistoryDocument[]>('packing_history', []);
    
    // 提取收货人信息
    const consigneeMap = new Map<string, Consignee>();
    
    packingHistory.forEach((doc: any, index: number) => {
      if (!doc) return;
      
      let consigneeName = '';
      let consigneeAddress = '';
      
      // 从装箱单中提取收货人信息
      consigneeName = doc.consigneeName || doc.data?.consignee?.name || '';
      consigneeAddress = doc.consigneeName || doc.data?.consignee?.name || '';
      
      // 如果收货人名称存在，则创建收货人记录
      if (consigneeName) {
        const normalizedName = consigneeName.trim();
        const consigneeId = `consignee_${Date.now()}_${index}`;
        
        if (!consigneeMap.has(normalizedName)) {
          consigneeMap.set(normalizedName, {
            id: consigneeId,
            name: normalizedName,
            email: doc.consigneeEmail || doc.data?.consigneeEmail || '',
            phone: doc.consigneePhone || doc.data?.consigneePhone || '',
            address: consigneeAddress,
            company: doc.consigneeCompany || doc.data?.consigneeCompany || '',
            createdAt: doc.createdAt || doc.date || new Date().toISOString(),
            updatedAt: doc.updatedAt || doc.date || new Date().toISOString()
          });
        }
      }
    });
    
    return Array.from(consigneeMap.values());
  } catch (error) {
    console.error('提取收货人数据失败:', error);
    return [];
  }
}

// 从localStorage读取保存的收货人数据
export function loadSavedConsignees(): Consignee[] {
  try {
    if (typeof window === 'undefined') return [];
    
    const savedConsignees = getLocalStorageJSON<Consignee[]>('consignee_management', []);
    return savedConsignees;
  } catch (error) {
    console.error('读取保存的收货人数据失败:', error);
    return [];
  }
}

// 获取所有收货人数据
export function getAllConsignees(): Consignee[] {
  try {
    const extractedConsignees = extractConsigneesFromHistory();
    const savedConsignees = loadSavedConsignees();
    
    // 合并数据，避免重复
    const allConsignees = [...extractedConsignees];
    
    savedConsignees.forEach(savedConsignee => {
      const exists = allConsignees.some(c => c.name === savedConsignee.name);
      if (!exists) {
        allConsignees.push(savedConsignee);
      }
    });
    
    return allConsignees;
  } catch (error) {
    console.error('获取所有收货人数据失败:', error);
    return [];
  }
}

// 保存收货人数据
export function saveConsignee(consignee: Consignee): void {
  try {
    if (typeof window === 'undefined') return;

    const existingConsignees = getLocalStorageJSON<Consignee[]>('consignee_management', []);
    
    // 检查是否已存在同名收货人，如果存在则更新
    const existingIndex = existingConsignees.findIndex((c: Consignee) => c.name === consignee.name);
    
    let updatedConsignees;
    if (existingIndex >= 0) {
      updatedConsignees = [...existingConsignees];
      updatedConsignees[existingIndex] = consignee;
    } else {
      updatedConsignees = [...existingConsignees, consignee];
    }
    
    localStorage.setItem('consignee_management', JSON.stringify(updatedConsignees));
    console.log('收货人数据保存成功:', consignee);
  } catch (error) {
    console.error('保存收货人数据失败:', error);
    throw error;
  }
}

// 删除收货人数据
export function deleteConsignee(consigneeId: string): void {
  try {
    if (typeof window === 'undefined') return;

    const existingConsignees = getLocalStorageJSON<Consignee[]>('consignee_management', []);
    const updatedConsignees = existingConsignees.filter((c: Consignee) => c.id !== consigneeId);
    localStorage.setItem('consignee_management', JSON.stringify(updatedConsignees));
    
    console.log('收货人删除成功:', consigneeId);
  } catch (error) {
    console.error('删除收货人失败:', error);
    throw error;
  }
}

// 检查收货人是否被历史记录引用
export function checkConsigneeUsage(consigneeName: string): number {
  try {
    const packingHistory = getLocalStorageJSON<HistoryDocument[]>('packing_history', []);
    
    return packingHistory.filter((doc: any) => {
      if (!doc) return false;
      
      const consigneeNameInDoc = doc.consigneeName || doc.data?.consignee?.name || '';
      return consigneeNameInDoc.trim() === consigneeName;
    }).length;
  } catch (error) {
    console.error('检查收货人使用情况失败:', error);
    return 0;
  }
}

export const consigneeService = {
  extractConsigneesFromHistory,
  loadSavedConsignees,
  getAllConsignees,
  saveConsignee,
  deleteConsignee,
  checkConsigneeUsage
};
