import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { Consignee, HistoryDocument } from '../types';
import { customerService } from './customerService';

export async function getAllConsignees(): Promise<Consignee[]> {
  const result = await customerService.fetchAllCustomers('consignee');
  return result.items;
}

export async function saveConsignee(consignee: Consignee, isNew = false): Promise<Consignee> {
  const saved = await customerService.saveCustomerProfile({
    id: isNew ? undefined : consignee.id,
    type: 'consignee',
    name: consignee.name,
    shortName: consignee.shortName,
    code: consignee.code,
    address: consignee.address,
    contacts: consignee.contacts,
    createdAt: consignee.createdAt,
  });
  return saved;
}

export async function deleteConsignee(consigneeId: string): Promise<void> {
  await customerService.deleteCustomer(consigneeId);
}

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
  getAllConsignees,
  saveConsignee,
  deleteConsignee,
  checkConsigneeUsage,
};
