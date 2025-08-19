import type { HistoryType, HistoryItem } from '../types';
import { 
  getQuotationHistory, 
  deleteQuotationHistory 
} from '@/utils/quotationHistory';
import { 
  getPurchaseHistory, 
  deletePurchaseHistory 
} from '@/utils/purchaseHistory';
import { 
  getInvoiceHistory, 
  deleteInvoiceHistory 
} from '@/utils/invoiceHistory';
import { 
  getPackingHistory, 
  deletePackingHistory 
} from '@/utils/packingHistory';
import { isQuotationUpgraded } from '@/utils/dashboardUtils';

export class HistoryService {
  /**
   * 获取指定类型的历史记录
   */
  static getHistory(type: HistoryType): HistoryItem[] {
    switch (type) {
      case 'quotation':
        // 获取所有报价单记录
        const quotationHistory = getQuotationHistory();
        
        // 获取所有confirmation记录，用于过滤
        const confirmationRecords = quotationHistory.filter((item: any) => 
          'type' in item && item.type === 'confirmation'
        );
        
        // 只返回type为'quotation'且未升级的记录
        return quotationHistory.filter((item: any) => {
          // 只保留type为'quotation'的记录
          if (!('type' in item) || item.type !== 'quotation') return false;
          
          // 检查这个报价单是否已经升级为confirmation
          const isUpgraded = isQuotationUpgraded(item, confirmationRecords);
          
          // 如果已升级，则不显示在报价单列表中
          return !isUpgraded;
        });
      case 'confirmation':
        return getQuotationHistory().filter(item => item.type === 'confirmation');
      case 'invoice':
        return getInvoiceHistory();
      case 'purchase':
        return getPurchaseHistory();
      case 'packing':
        return getPackingHistory();
      default:
        return [];
    }
  }

  /**
   * 删除指定类型的历史记录
   */
  static deleteHistory(type: HistoryType, id: string): void {
    switch (type) {
      case 'quotation':
      case 'confirmation':
        deleteQuotationHistory(id);
        break;
      case 'invoice':
        deleteInvoiceHistory(id);
        break;
      case 'purchase':
        deletePurchaseHistory(id);
        break;
      case 'packing':
        deletePackingHistory(id);
        break;
    }
  }

  /**
   * 批量删除历史记录
   */
  static deleteMultipleHistory(type: HistoryType, ids: string[]): void {
    ids.forEach(id => this.deleteHistory(type, id));
  }

  /**
   * 获取所有历史记录
   */
  static getAllHistory(): Record<HistoryType, HistoryItem[]> {
    return {
      quotation: this.getHistory('quotation'),
      confirmation: this.getHistory('confirmation'),
      invoice: this.getHistory('invoice'),
      purchase: this.getHistory('purchase'),
      packing: this.getHistory('packing'),
    };
  }

  /**
   * 搜索历史记录
   */
  static searchHistory(
    type: HistoryType, 
    searchTerm: string, 
    dateRange: string, 
    amountRange: string
  ): HistoryItem[] {
    let results = this.getHistory(type);
    
    // 搜索过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(item => {
        if ('customerName' in item) {
          return (item.customerName?.toLowerCase() || '').includes(searchLower) ||
                 (item as any).quotationNo?.toLowerCase().includes(searchLower) ||
                 (item as any).invoiceNo?.toLowerCase().includes(searchLower);
        }
        if ('supplierName' in item) {
          return item.supplierName.toLowerCase().includes(searchLower) ||
                 item.orderNo.toLowerCase().includes(searchLower);
        }
        if ('consigneeName' in item) {
          return item.consigneeName.toLowerCase().includes(searchLower) ||
                 item.invoiceNo.toLowerCase().includes(searchLower) ||
                 item.orderNo.toLowerCase().includes(searchLower);
        }
        return false;
      });
    }

    // 日期范围过滤
    if (dateRange !== 'all') {
      const now = new Date();
      results = results.filter(item => {
        const itemDate = new Date(item.createdAt);
        const diffTime = Math.abs(now.getTime() - itemDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        switch (dateRange) {
          case 'today': return diffDays <= 1;
          case 'week': return diffDays <= 7;
          case 'month': return diffDays <= 30;
          case 'year': return diffDays <= 365;
          default: return true;
        }
      });
    }

    // 金额范围过滤
    if (amountRange !== 'all') {
      results = results.filter(item => {
        const amount = item.totalAmount;
        switch (amountRange) {
          case 'low': return amount < 10000;
          case 'medium': return amount >= 10000 && amount < 100000;
          case 'high': return amount >= 100000;
          default: return true;
        }
      });
    }

    return results;
  }

  /**
   * 排序历史记录
   */
  static sortHistory(
    items: HistoryItem[], 
    sortKey: string, 
    direction: 'asc' | 'desc'
  ): HistoryItem[] {
    return [...items].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortKey) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'totalAmount':
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case 'customerName':
        case 'supplierName':
        case 'consigneeName':
          aValue = (a as any)[sortKey] || '';
          bValue = (b as any)[sortKey] || '';
          break;
        case 'quotationNo':
        case 'invoiceNo':
        case 'orderNo':
          aValue = (a as any)[sortKey] || '';
          bValue = (b as any)[sortKey] || '';
          break;
        default:
          aValue = aValue || '';
          bValue = bValue || '';
      }

      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }
}
