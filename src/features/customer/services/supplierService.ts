import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { HistoryDocument, Supplier } from '../types';
import { customerService } from './customerService';

export async function getAllSuppliers(): Promise<Supplier[]> {
  const result = await customerService.fetchAllCustomers('supplier');
  return result.items;
}

export async function saveSupplier(supplier: Supplier, isNew = false): Promise<Supplier> {
  const saved = await customerService.saveCustomerProfile({
    id: isNew ? undefined : supplier.id,
    type: 'supplier',
    name: supplier.name,
    shortName: supplier.shortName,
    code: supplier.code,
    address: supplier.address,
    contacts: supplier.contacts,
    createdAt: supplier.createdAt,
  });
  return saved;
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  await customerService.deleteCustomer(supplierId);
}

export function checkSupplierUsage(supplierName: string): number {
  try {
    const purchaseHistory = getLocalStorageJSON<HistoryDocument[]>('purchase_history', []);

    return purchaseHistory.filter((doc) => {
      if (!doc) return false;
      const data = typeof doc.data === 'object' && doc.data !== null && !Array.isArray(doc.data)
        ? doc.data as { attn?: string }
        : {};
      const supplierNameInDoc = typeof doc.supplierName === 'string' ? doc.supplierName : data.attn || '';
      return supplierNameInDoc.trim() === supplierName;
    }).length;
  } catch (error) {
    console.error('检查供应商使用情况失败:', error);
    return 0;
  }
}

export const supplierService = {
  getAllSuppliers,
  saveSupplier,
  deleteSupplier,
  checkSupplierUsage,
};
