// 适配旧 purchaseHistory.ts，统一暴露接口
import {
  getPurchaseHistory,
  getPurchaseHistoryById,
  savePurchaseHistory,
  deletePurchaseHistory,
  exportPurchaseHistory,
  importPurchaseHistory
} from '@/utils/purchaseHistory';
import type { PurchaseOrderData } from '@/types/purchase';
import { getPurchaseSupplierSearchText, resolvePurchaseSupplierSnapshotName } from '@/utils/purchaseSupplierSnapshot';

export type PurchaseId = string;

export const PurchaseService = {
  list: async () => {
    const history = getPurchaseHistory();
    return history.map(item => ({
      id: item.id,
      title: resolvePurchaseSupplierSnapshotName(item.data, item.supplierName) || item.orderNo,
      poNo: item.orderNo,
      supplierName: resolvePurchaseSupplierSnapshotName(item.data, item.supplierName),
      searchText: getPurchaseSupplierSearchText(item.data, item.supplierName),
      updatedAt: item.updatedAt,
      date: item.createdAt
    }));
  },
  load: async (id: PurchaseId) => {
    const item = getPurchaseHistoryById(id);
    return item?.data || null;
  },
  save: async (data: PurchaseOrderData) => {
    const result = savePurchaseHistory(data);
    return result ? { id: result.id } : null;
  },
  remove: async (id: PurchaseId) => deletePurchaseHistory(id),
  exportAll: async () => exportPurchaseHistory(),
  importAll: async (json: string) => importPurchaseHistory(json),
};
