import { getSafeLocalStorage } from './documentCounts';
import { HistoryItem } from './historyImportExport';

// 文档类型常量定义
export const DOCUMENT_TYPES = ['quotation', 'confirmation', 'invoice', 'packing', 'purchase'] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

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

// 文档加载工具函数
export const getDocumentsByType = (type: DocumentType): DocumentWithType[] => {
  if (type === 'confirmation') {
    // confirmation类型的数据存储在quotation_history中
    const quotationHistory = getSafeLocalStorage('quotation_history') || [];
    return quotationHistory
      .filter((doc: any) => doc.type === 'confirmation')
      .map((doc: any) => ({ ...doc, type: 'confirmation' as DocumentType }));
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
  return DOCUMENT_TYPES.filter(type => {
    const permissionKey = type === 'confirmation' ? 'quotation' : type;
    return permissionMap.documentTypePermissions[permissionKey];
  });
};

// 加载所有有权限的文档
export const loadAllDocumentsByPermissions = (permissionMap: any): DocumentWithType[] => {
  const allDocuments: DocumentWithType[] = [];
  
  DOCUMENT_TYPES.forEach(type => {
    const permissionKey = type === 'confirmation' ? 'quotation' : type;
    if (permissionMap.documentTypePermissions[permissionKey]) {
      // 对于confirmation类型，需要从quotation_history中筛选出type为'confirmation'的记录
      if (type === 'confirmation') {
        const quotationHistory = getSafeLocalStorage('quotation_history') || [];
        const confirmationDocs = quotationHistory
          .filter((doc: any) => doc.type === 'confirmation')
          .map((doc: any) => ({ ...doc, type: 'confirmation' as DocumentType }));
        allDocuments.push(...confirmationDocs);
      } else {
        allDocuments.push(...getDocumentsByType(type));
      }
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