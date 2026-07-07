import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import type { HistoryItem } from '@/features/history/types';

// 文档类型定义
export type DocumentType =
  | 'quotation'
  | 'confirmation'
  | 'domestic-quotation'
  | 'domestic-contract'
  | 'invoice'
  | 'packing'
  | 'purchase';

// 时间筛选类型
export type TimeFilter = 'today' | '3days' | 'week' | 'month';

// 扩展的文档类型，包含 HistoryItem 的所有属性以及 type 属性
export interface DocumentWithType extends Omit<HistoryItem, 'type'> {
  id: string; // 确保id字段是必需的
  type: DocumentType;
  [key: string]: unknown;
}

interface DashboardPermissionMap {
  documentTypePermissions: Partial<Record<DocumentType, boolean>>;
}

interface QuotationUpgradeRecord {
  quotationNo?: string;
  data?: unknown;
}

const isDomesticQuotationRecord = (doc: DocumentWithType): boolean => {
  const data = doc.data;
  const rawType = (doc as { type?: string }).type;
  return rawType === 'domestic' || (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    (data as { mode?: unknown }).mode === 'domestic'
  );
};

// 内销单据的子类型（报价单 / 合同），未填写时按历史默认值归为"合同"
// （与 quotationInitialData.ts / QuotationPage.tsx 里 `data.domesticDocType ?? 'contract'` 的兼容口径保持一致）
const getDomesticDocSubtype = (doc: DocumentWithType): 'quotation' | 'contract' | undefined => {
  if (!isDomesticQuotationRecord(doc)) return undefined;
  const data = doc.data;
  const docType = typeof data === 'object' && data !== null && !Array.isArray(data)
    ? (data as { domesticDocType?: unknown }).domesticDocType
    : undefined;
  return docType === 'quotation' ? 'quotation' : 'contract';
};

// 权限事件工具函数
export const emitPermissionChanged = (message = '权限已更新') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('permissionChanged', { detail: { message } }));
  }
};

// 检测报价单是否已升级为confirmation的工具函数
export const isQuotationUpgraded = (quotationRecord: QuotationUpgradeRecord, confirmationRecords: QuotationUpgradeRecord[]): boolean => {
  return confirmationRecords.some((confirmation) => {
    // 比较报价单号和合同号，如果相同说明已升级
    const confirmationData = confirmation.data as { contractNo?: string } | undefined;
    return confirmationData?.contractNo === quotationRecord.quotationNo ||
           confirmation.quotationNo === quotationRecord.quotationNo;
  });
};

// 文档加载工具函数
export const getDocumentsByType = (type: DocumentType): DocumentWithType[] => {
  if (type === 'confirmation') {
    // confirmation类型的数据存储在quotation_history中
    const quotationHistory = getLocalStorageJSON<DocumentWithType[]>('quotation_history', []);
    return quotationHistory
      .filter((doc) => doc.type === 'confirmation')
      .map((doc) => ({ ...doc, type: 'confirmation' as DocumentType }));
  } else if (type === 'quotation') {
    // quotation类型的数据也存储在quotation_history中，但只加载type为'quotation'的记录
    // 同时过滤掉已经升级为confirmation的报价单
    const quotationHistory = getLocalStorageJSON<DocumentWithType[]>('quotation_history', []);

    // 获取所有confirmation记录，用于过滤
    const confirmationRecords = quotationHistory.filter((doc) => doc.type === 'confirmation');

    return quotationHistory
      .filter((doc) => {
        // 只保留type为'quotation'的记录
        if (doc.type !== 'quotation') return false;
        if (isDomesticQuotationRecord(doc)) return false;

        // 检查这个报价单是否已经升级为confirmation
        const isUpgraded = isQuotationUpgraded(doc, confirmationRecords);

        // 如果已升级，则不显示在报价单列表中
        return !isUpgraded;
      })
      .map((doc) => ({ ...doc, type: 'quotation' as DocumentType }));
  } else if (type === 'domestic-quotation' || type === 'domestic-contract') {
    // 内销报价单/内销合同同样存储在 quotation_history 中（type==='domestic'），
    // 按 data.domesticDocType 子类型（报价单/合同）二次拆分
    const wantedSubtype = type === 'domestic-quotation' ? 'quotation' : 'contract';
    const quotationHistory = getLocalStorageJSON<DocumentWithType[]>('quotation_history', []);
    return quotationHistory
      .filter((doc) => getDomesticDocSubtype(doc) === wantedSubtype)
      .map((doc) => ({ ...doc, type }));
  } else {
    const storageKey = `${type}_history`;
    const docs = getLocalStorageJSON<HistoryItem[]>(storageKey, []);
    return docs.map((doc: HistoryItem) => ({ ...doc, type }));
  }
};

// 时间筛选工具函数
export const getStartDateByFilter = (filter: TimeFilter): Date => {
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

// 内销报价单/内销合同与销售确认一样，权限上都归属于"报价"模块
const getDocumentTypePermissionKey = (type: DocumentType): DocumentType =>
  type === 'confirmation' || type === 'domestic-quotation' || type === 'domestic-contract'
    ? 'quotation'
    : type;

const ALL_DOCUMENT_TYPES: DocumentType[] = [
  'quotation', 'confirmation', 'domestic-quotation', 'domestic-contract', 'invoice', 'packing', 'purchase'
];

// 根据权限过滤文档类型
export const getAccessibleDocumentTypes = (permissionMap: DashboardPermissionMap): DocumentType[] => {
  return ALL_DOCUMENT_TYPES
    .filter(type => {
      const permissionKey = getDocumentTypePermissionKey(type);
      return permissionMap.documentTypePermissions[permissionKey];
    });
};

// 加载所有有权限的文档
export const loadAllDocumentsByPermissions = (permissionMap: DashboardPermissionMap): DocumentWithType[] => {
  const allDocuments: DocumentWithType[] = [];

  ALL_DOCUMENT_TYPES.forEach(type => {
    const permissionKey = getDocumentTypePermissionKey(type);
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
