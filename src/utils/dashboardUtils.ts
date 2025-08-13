import { getSafeLocalStorage } from '@/utils/safeLocalStorage';
import type { HistoryItem } from '@/features/history/types';

// 文档类型定义
export type DocumentType = 'quotation' | 'confirmation' | 'invoice' | 'packing' | 'purchase';

// 时间筛选类型
export type TimeFilter = 'today' | '3days' | 'week' | 'month';

// 扩展的文档类型，包含 HistoryItem 的所有属性以及 type 属性
export interface DocumentWithType extends HistoryItem {
  type: DocumentType;
  [key: string]: unknown;
}

// 权限事件工具函数
export const emitPermissionChanged = (message = '权限已更新') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('permissionChanged', { detail: { message } }));
  }
};

// 检测报价单是否已升级为confirmation的工具函数
export const isQuotationUpgraded = (quotationRecord: any, confirmationRecords: any[]): boolean => {
  return confirmationRecords.some((confirmation: any) => {
    // 比较报价单号和合同号，如果相同说明已升级
    return confirmation.data?.contractNo === quotationRecord.quotationNo || 
           confirmation.quotationNo === quotationRecord.quotationNo;
  });
};

// 文档加载工具函数
export const getDocumentsByType = (type: DocumentType): DocumentWithType[] => {
  if (type === 'confirmation') {
    // confirmation类型的数据存储在quotation_history中
    const quotationHistory = getSafeLocalStorage('quotation_history') || [];
    return quotationHistory
      .filter((doc: any) => doc.type === 'confirmation')
      .map((doc: any) => ({ ...doc, type: 'confirmation' as DocumentType }));
  } else if (type === 'quotation') {
    // quotation类型的数据也存储在quotation_history中，但只加载type为'quotation'的记录
    // 同时过滤掉已经升级为confirmation的报价单
    const quotationHistory = getSafeLocalStorage('quotation_history') || [];
    
    // 获取所有confirmation记录，用于过滤
    const confirmationRecords = quotationHistory.filter((doc: any) => doc.type === 'confirmation');
    
    return quotationHistory
      .filter((doc: any) => {
        // 只保留type为'quotation'的记录
        if (doc.type !== 'quotation') return false;
        
        // 检查这个报价单是否已经升级为confirmation
        const isUpgraded = isQuotationUpgraded(doc, confirmationRecords);
        
        // 如果已升级，则不显示在报价单列表中
        return !isUpgraded;
      })
      .map((doc: any) => ({ ...doc, type: 'quotation' as DocumentType }));
  } else {
    const storageKey = `${type}_history`;
    const docs = getSafeLocalStorage(storageKey) || [];
    return docs.map((doc: HistoryItem) => ({ ...doc, type }));
  }
};

// 时间筛选工具函数
export const getStartDateByFilter = (filter: TimeFilter): Date => {
  const now = new Date();
  const startDate = new Date();

  switch (filter) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case '3days':
      startDate.setDate(startDate.getDate() - 3);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
  }

  return startDate;
};

// 根据权限过滤文档类型
export const getAccessibleDocumentTypes = (permissionMap: any): DocumentType[] => {
  return ['quotation', 'confirmation', 'invoice', 'packing', 'purchase']
    .filter(type => {
      const permissionKey = type === 'confirmation' ? 'quotation' : type;
      return permissionMap.documentTypePermissions[permissionKey];
    });
};

// 加载所有有权限的文档
export const loadAllDocumentsByPermissions = (permissionMap: any): DocumentWithType[] => {
  const allDocuments: DocumentWithType[] = [];
  
  ['quotation', 'confirmation', 'invoice', 'packing', 'purchase'].forEach(type => {
    const permissionKey = type === 'confirmation' ? 'quotation' : type;
    if (permissionMap.documentTypePermissions[permissionKey]) {
      // 使用修复后的getDocumentsByType函数来加载文档
      allDocuments.push(...getDocumentsByType(type));
    }
  });
  
  return allDocuments;
};

// 筛选指定时间范围内的文档
export const filterDocumentsByTimeRange = (
  documents: DocumentWithType[], 
  filter: TimeFilter
): DocumentWithType[] => {
  const startDate = getStartDateByFilter(filter);
  const now = new Date();
  
  return documents.filter((doc: DocumentWithType) => {
    const docDate = new Date(doc.updatedAt || doc.createdAt);
    return docDate >= startDate && docDate <= now;
  });
};

// 按类型筛选文档
export const filterDocumentsByType = (
  documents: DocumentWithType[], 
  typeFilter: 'all' | DocumentType
): DocumentWithType[] => {
  if (typeFilter === 'all') {
    return documents;
  }
  
  return documents.filter((doc: DocumentWithType) => doc.type === typeFilter);
};

// 按日期排序文档（最新的在前）
export const sortDocumentsByDate = (documents: DocumentWithType[]): DocumentWithType[] => {
  return documents.sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt);
    const dateB = new Date(b.updatedAt || b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });
}; 