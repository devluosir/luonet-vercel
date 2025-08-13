import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { Supplier, HistoryDocument } from '../types';

// 从localStorage中提取供应商数据
export function extractSuppliersFromHistory(): Supplier[] {
  try {
    if (typeof window === 'undefined') return [];

    const purchaseHistory = getLocalStorageJSON<HistoryDocument[]>('purchase_history', []);
    
    // 提取供应商信息
    const supplierMap = new Map<string, Supplier>();
    
    purchaseHistory.forEach((doc: any, index: number) => {
      if (!doc) return;
      
      let supplierName = '';
      let supplierAddress = '';
      
      // 从采购单中提取供应商信息
      supplierName = doc.supplierName || doc.data?.attn || '';
      supplierAddress = doc.data?.attn || doc.to || '';
      
      // 如果供应商名称存在，则创建供应商记录
      if (supplierName) {
        const normalizedName = supplierName.trim();
        const supplierId = `supplier_${Date.now()}_${index}`;
        
        if (!supplierMap.has(normalizedName)) {
          supplierMap.set(normalizedName, {
            id: supplierId,
            name: normalizedName,
            email: doc.supplierEmail || doc.data?.supplierEmail || '',
            phone: doc.supplierPhone || doc.data?.supplierPhone || '',
            address: supplierAddress,
            company: doc.supplierCompany || doc.data?.supplierCompany || '',
            createdAt: doc.createdAt || doc.date || new Date().toISOString(),
            updatedAt: doc.updatedAt || doc.date || new Date().toISOString()
          });
        }
      }
    });
    
    return Array.from(supplierMap.values());
  } catch (error) {
    console.error('提取供应商数据失败:', error);
    return [];
  }
}

// 从localStorage读取保存的供应商数据
export function loadSavedSuppliers(): Supplier[] {
  try {
    if (typeof window === 'undefined') return [];
    
    const savedSuppliers = getLocalStorageJSON<Supplier[]>('supplier_management', []);
    return savedSuppliers;
  } catch (error) {
    console.error('读取保存的供应商数据失败:', error);
    return [];
  }
}

// 获取所有供应商数据
export function getAllSuppliers(): Supplier[] {
  try {
    const extractedSuppliers = extractSuppliersFromHistory();
    const savedSuppliers = loadSavedSuppliers();
    
    // 合并数据，避免重复
    const allSuppliers = [...extractedSuppliers];
    
    savedSuppliers.forEach(savedSupplier => {
      const exists = allSuppliers.some(s => s.name === savedSupplier.name);
      if (!exists) {
        allSuppliers.push(savedSupplier);
      }
    });
    
    return allSuppliers;
  } catch (error) {
    console.error('获取所有供应商数据失败:', error);
    return [];
  }
}

// 保存供应商数据
export function saveSupplier(supplier: Supplier): void {
  try {
    if (typeof window === 'undefined') return;

    const existingSuppliers = getLocalStorageJSON<Supplier[]>('supplier_management', []);
    
    // 检查是否已存在同名供应商，如果存在则更新
    const existingIndex = existingSuppliers.findIndex((s: Supplier) => s.name === supplier.name);
    
    let updatedSuppliers;
    if (existingIndex >= 0) {
      updatedSuppliers = [...existingSuppliers];
      updatedSuppliers[existingIndex] = supplier;
    } else {
      updatedSuppliers = [...existingSuppliers, supplier];
    }
    
    localStorage.setItem('supplier_management', JSON.stringify(updatedSuppliers));
    console.log('供应商数据保存成功:', supplier);
  } catch (error) {
    console.error('保存供应商数据失败:', error);
    throw error;
  }
}

// 删除供应商数据
export function deleteSupplier(supplierId: string): void {
  try {
    if (typeof window === 'undefined') return;

    const existingSuppliers = getLocalStorageJSON<Supplier[]>('supplier_management', []);
    const updatedSuppliers = existingSuppliers.filter((s: Supplier) => s.id !== supplierId);
    localStorage.setItem('supplier_management', JSON.stringify(updatedSuppliers));
    
    console.log('供应商删除成功:', supplierId);
  } catch (error) {
    console.error('删除供应商失败:', error);
    throw error;
  }
}

// 检查供应商是否被历史记录引用
export function checkSupplierUsage(supplierName: string): number {
  try {
    const purchaseHistory = getLocalStorageJSON<HistoryDocument[]>('purchase_history', []);
    
    return purchaseHistory.filter((doc: any) => {
      if (!doc) return false;
      
      const supplierNameInDoc = doc.supplierName || doc.data?.attn || '';
      return supplierNameInDoc.trim() === supplierName;
    }).length;
  } catch (error) {
    console.error('检查供应商使用情况失败:', error);
    return 0;
  }
}

export const supplierService = {
  extractSuppliersFromHistory,
  loadSavedSuppliers,
  getAllSuppliers,
  saveSupplier,
  deleteSupplier,
  checkSupplierUsage
};
