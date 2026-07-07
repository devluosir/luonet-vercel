import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { isQuotationUpgraded } from '@/utils/dashboardUtils';

type DocumentRecord = {
  type?: string;
  id?: string;
  createdAt?: string;
  quotationNo?: string;
  data?: {
    mode?: string;
  };
  [key: string]: unknown;
};

const isDocumentRecord = (value: unknown): value is DocumentRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const getHistoryRecords = (key: string): DocumentRecord[] => (
  getLocalStorageJSON<unknown[]>(key, []).filter(isDocumentRecord)
);

const isDomesticQuotationRecord = (item: DocumentRecord): boolean => (
  item.type === 'domestic' || item.data?.mode === 'domestic'
);

// 内销单据子类型（报价单 / 合同），未填写时按历史默认值归为"合同"
// （与 dashboardUtils.ts::getDomesticDocSubtype 口径保持一致）
const getDomesticDocSubtype = (item: DocumentRecord): 'quotation' | 'contract' | undefined => {
  if (!isDomesticQuotationRecord(item)) return undefined;
  const docType = (item.data as { domesticDocType?: unknown } | undefined)?.domesticDocType;
  return docType === 'quotation' ? 'quotation' : 'contract';
};

// 统一的文档计数工具函数
export const getAllDocuments = (): DocumentRecord[] => {
  if (typeof window === 'undefined') return [];

  try {
    const data = [
      ...getHistoryRecords('quotation_history'),
      ...getHistoryRecords('invoice_history'),
      ...getHistoryRecords('packing_history'),
      ...getHistoryRecords('purchase_history')
    ];
    return data;
  } catch (error) {
    console.error('获取所有文档失败:', error);
    return [];
  }
};

// 获取各类单据数量 - 使用统一的缓存读取方式
export const getQuotationCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const quotationHistory = getHistoryRecords('quotation_history');

    // 获取所有confirmation记录，用于过滤
    const confirmationRecords = quotationHistory.filter((item) =>
      'type' in item && item.type === 'confirmation'
    );

    // 只获取type为'quotation'且未升级的记录
    return quotationHistory.filter((item) => {
      // 只保留type为'quotation'的记录
      if (!('type' in item) || item.type !== 'quotation') return false;
      if (isDomesticQuotationRecord(item)) return false;

      // 检查这个报价单是否已经升级为confirmation
      const isUpgraded = isQuotationUpgraded(item, confirmationRecords);

      // 如果已升级，则不计入报价单数量
      return !isUpgraded;
    }).length;
  } catch (error) {
    console.error('获取报价单数量失败:', error);
    return 0;
  }
};

export const getConfirmationCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const quotationHistory = getHistoryRecords('quotation_history');
    // 只获取type为'confirmation'的记录
    return quotationHistory.filter((item) =>
      'type' in item && item.type === 'confirmation'
    ).length;
  } catch (error) {
    console.error('获取销售确认数量失败:', error);
    return 0;
  }
};

export const getDomesticQuotationCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const quotationHistory = getHistoryRecords('quotation_history');
    return quotationHistory.filter((item) => getDomesticDocSubtype(item) === 'quotation').length;
  } catch (error) {
    console.error('获取内销报价单数量失败:', error);
    return 0;
  }
};

export const getDomesticContractCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const quotationHistory = getHistoryRecords('quotation_history');
    return quotationHistory.filter((item) => getDomesticDocSubtype(item) === 'contract').length;
  } catch (error) {
    console.error('获取内销合同数量失败:', error);
    return 0;
  }
};

export const getInvoiceCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const invoiceHistory = getHistoryRecords('invoice_history');
    return invoiceHistory.length;
  } catch (error) {
    console.error('获取发票数量失败:', error);
    return 0;
  }
};

export const getPackingCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const packingHistory = getHistoryRecords('packing_history');
    return packingHistory.length;
  } catch (error) {
    console.error('获取装箱单数量失败:', error);
    return 0;
  }
};

export const getPurchaseCount = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const purchaseHistory = getHistoryRecords('purchase_history');
    return purchaseHistory.length;
  } catch (error) {
    console.error('获取采购订单数量失败:', error);
    return 0;
  }
};

// 获取所有文档计数
export const getAllDocumentCounts = () => {
  return {
    quotation: getQuotationCount(),
    confirmation: getConfirmationCount(),
    'domestic-quotation': getDomesticQuotationCount(),
    'domestic-contract': getDomesticContractCount(),
    invoice: getInvoiceCount(),
    packing: getPackingCount(),
    purchase: getPurchaseCount()
  };
};

// 安全的本地存储访问工具
export const getSafeLocalStorage = (key: string) => {
  return getLocalStorageJSON(key, []);
};
