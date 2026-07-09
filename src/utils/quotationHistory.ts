import { QuotationData } from '@/types/quotation';
import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { QuotationHistory, QuotationHistoryFilters } from '@/types/quotation-history';
import { getDefaultNotes } from '@/utils/getDefaultNotes';
import { persistHistoryToStorage } from '@/utils/storageQuotaManager';
import { d1SyncDocument } from './d1Sync';

const STORAGE_KEY = 'quotation_history';
type QuotationHistoryType = QuotationHistory['type'];

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const normalizeDomesticHistoryTypes = (history: QuotationHistory[]): QuotationHistory[] => (
  history.map((item) => {
    if (item.type === 'quotation' && item.data?.mode === 'domestic') {
      return { ...item, type: 'domestic' as const };
    }
    return item;
  })
);

// 保存报价历史
export const saveQuotationHistory = (type: QuotationHistoryType, data: QuotationData, existingId?: string) => {
  try {
    const history = getQuotationHistory();
    const totalAmount = (data.items || []).reduce((sum, item) => sum + (item.amount || 0), 0) +
      (data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0);

    // 🆕 获取当前的列显示设置
    let savedVisibleCols: string[] | null = null;
    if (typeof window !== 'undefined') {
      try {
        savedVisibleCols = getLocalStorageJSON('qt.visibleCols', null);
      } catch (e) {
        console.warn('Failed to read table column preferences:', e);
      }
    }

    // 🆕 将列显示设置添加到数据中
    const dataWithVisibleCols = {
      ...data,
      savedVisibleCols
    };

    // 如果提供了现有ID，则更新该记录
    if (existingId) {
      console.log(`[QuotationHistory] 尝试更新现有记录，ID: ${existingId}`);
      const index = history.findIndex(item => item.id === existingId);
      if (index !== -1) {
        console.log(`[QuotationHistory] 找到现有记录，索引: ${index}，将更新该记录`);
        // 保留原始创建时间
        const originalCreatedAt = history[index].createdAt;

        // 确保confirmation类型有正确的contractNo
        if (type === 'confirmation' && !data.contractNo) {
          data.contractNo = data.quotationNo || `SC${Date.now()}`;
        }

        const updatedHistory: QuotationHistory = {
          id: existingId,
          createdAt: originalCreatedAt,
          updatedAt: new Date().toISOString(),
          type,
          customerName: data.to,
          quotationNo: type === 'confirmation' ? data.contractNo : data.quotationNo,
          totalAmount,
          currency: data.currency,
          data: dataWithVisibleCols // 🆕 使用包含列显示设置的数据
        };
        history[index] = updatedHistory;

        if (!persistHistoryToStorage(STORAGE_KEY, history)) {
          return null;
        }

        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingId,
          type,
          doc_no: updatedHistory.quotationNo || '',
          customer_name: updatedHistory.customerName,
          total_amount: totalAmount,
          currency: data.currency,
          created_at: updatedHistory.createdAt,
          updated_at: updatedHistory.updatedAt,
          data: dataWithVisibleCols,
        });

        return updatedHistory;
      } else {
        console.log(`[QuotationHistory] 未找到现有记录，ID: ${existingId}，将创建新记录`);
      }
    }

    // 如果没有提供ID或找不到记录，创建新记录
    const newId = generateId();
    console.log(`[QuotationHistory] 创建新记录，ID: ${newId}`);

    // 确保confirmation类型有正确的contractNo
    if (type === 'confirmation' && !data.contractNo) {
      data.contractNo = data.quotationNo || `SC${Date.now()}`;
    }

    const newHistory: QuotationHistory = {
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type,
      customerName: data.to,
      quotationNo: type === 'confirmation' ? data.contractNo : data.quotationNo,
      totalAmount,
      currency: data.currency,
      data: dataWithVisibleCols // 🆕 使用包含列显示设置的数据
    };

    history.unshift(newHistory);

    if (!persistHistoryToStorage(STORAGE_KEY, history)) {
      return null;
    }

    // D1 双写（fire-and-forget）
    d1SyncDocument('create', {
      id: newId,
      type,
      doc_no: newHistory.quotationNo || '',
      customer_name: newHistory.customerName,
      total_amount: totalAmount,
      currency: data.currency,
      created_at: newHistory.createdAt,
      updated_at: newHistory.updatedAt,
      data: dataWithVisibleCols,
    });

    return newHistory;
  } catch (error) {
    console.error('Error saving quotation history:', error);
    return null;
  }
};

// 获取所有历史记录
export const getQuotationHistory = (filters?: QuotationHistoryFilters): QuotationHistory[] => {
  try {
    let history = normalizeDomesticHistoryTypes(getLocalStorageJSON<QuotationHistory[]>(STORAGE_KEY, []));

    if (filters) {
      // 搜索
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        history = history.filter((item: QuotationHistory) =>
          (item.customerName?.toLowerCase() || '').includes(searchLower) ||
          item.quotationNo.toLowerCase().includes(searchLower) ||
          (item.type === 'confirmation' && item.data?.contractNo && item.data.contractNo.toLowerCase().includes(searchLower))
        );
      }

      // 类型筛选
      if (filters.type && filters.type !== 'all') {
        history = history.filter((item: QuotationHistory) => item.type === filters.type);
      }
    }

    return history;
  } catch (error) {
    return [];
  }
};

// 根据ID获取单个历史记录
export const getQuotationHistoryById = (id: string): QuotationHistory | null => {
  try {
    const history = getQuotationHistory();
    return history.find(item => item.id === id) || null;
  } catch (error) {
    return null;
  }
};

// 删除历史记录
export const deleteQuotationHistory = (id: string): boolean => {
  try {
    const history = getQuotationHistory();
    const item = history.find(record => record.id === id);
    const filtered = history.filter(item => item.id !== id);
    if (!persistHistoryToStorage(STORAGE_KEY, filtered)) {
      return false;
    }
    d1SyncDocument('delete', { id, type: item?.type ?? 'quotation', doc_no: '', data: null });
    return true;
  } catch (error) {
    return false;
  }
};

// 导出历史记录
export const exportQuotationHistory = (): string => {
  try {
    const history = getQuotationHistory();
    return JSON.stringify(history, null, 2);
  } catch (error) {
    return '';
  }
};

// 导入历史记录
export const importQuotationHistory = (jsonData: string, mergeStrategy: 'replace' | 'merge' = 'merge'): boolean => {
  try {
    // 确保输入是有效的JSON字符串
    if (!jsonData || typeof jsonData !== 'string') {
      return false;
    }

    // 处理可能的BOM标记（在iOS上可能会出现）
    let cleanJsonData = jsonData;
    if (jsonData.charCodeAt(0) === 0xFEFF) {
      cleanJsonData = jsonData.slice(1);

    }

    // 尝试解析JSON
    let importedHistory;
    try {
      importedHistory = JSON.parse(cleanJsonData);
    } catch (parseError) {
      // 尝试修复常见的JSON格式问题
      try {
        // 有时iOS设备会在JSON字符串中添加额外的字符
        const fixedJson = cleanJsonData
          .replace(/\n/g, '')
          .replace(/\r/g, '')
          .replace(/\t/g, '')
          .trim();
        importedHistory = JSON.parse(fixedJson);
        if (process.env.NODE_ENV === 'development') {

        }
      } catch (secondError) {

        return false;
      }
    }

    // 验证导入的数据格式
    if (!Array.isArray(importedHistory)) {
      return false;
    }

    // 处理从发票导入的数据
    const processedData = importedHistory.map(item => {
      // 基本验证：确保item是对象且有id
      if (!item || typeof item !== 'object' || !item.id) {

        return null;
      }

      // 如果是发票数据（通过检查特有字段判断）
      if (item.data && item.data.customerPO !== undefined) {
        // 确保items数组存在
        if (!Array.isArray(item.data.items)) {

          return item; // 返回原始项，不进行转换
        }

        const convertedItems = item.data.items.map((lineItem: { partname?: string; lineNo?: number; description?: string; quantity: number; unit: string; unitPrice: number; amount: number; highlight?: Record<string, boolean> }) => {
          if (lineItem.partname && !('partName' in lineItem)) {
            return {
              id: lineItem.lineNo || 0,
              partName: lineItem.partname,
              description: lineItem.description || '',
              quantity: lineItem.quantity,
              unit: lineItem.unit,
              unitPrice: lineItem.unitPrice,
              amount: lineItem.amount,
              remarks: '',
              highlight: {}
            };
          }
          return lineItem;
        });

        // 转换发票数据为订单确认数据
        return {
          id: item.id,
          type: 'confirmation' as const, // 改为订单确认类型
          customerName: item.customerName || '',
          quotationNo: item.data.invoiceNo || '', // 使用发票号作为单号
          totalAmount: item.totalAmount || 0,
          currency: item.currency || 'USD',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.createdAt || new Date().toISOString(),
          data: {
            to: item.data.to || '',
            inquiryNo: item.data.customerPO || '', // 发票 customerPO -> 订单确认 inquiryNo
            quotationNo: '', // 订单确认不需要报价单号
            date: item.data.date || new Date().toISOString().split('T')[0],
            from: 'Roger',
            currency: item.data.currency || 'USD',
            paymentDate: item.data.paymentDate || '',
            items: convertedItems,
            notes: getDefaultNotes('Roger', 'confirmation'), // 使用订单确认的默认备注
            amountInWords: item.data.amountInWords || '',
            showDescription: true,
            showRemarks: false,
            showBank: item.data.showBank || false,
            showStamp: false,
            contractNo: item.data.invoiceNo || '', // 发票号作为合同号
            otherFees: item.data.otherFees || [],
            customUnits: [],
            showPaymentTerms: item.data.showPaymentTerms || false,
            showInvoiceReminder: item.data.showInvoiceReminder || false,
            additionalPaymentTerms: item.data.additionalPaymentTerms || ''
          }
        };
      }
      return item;
    }).filter(Boolean); // 过滤掉null项

    // 确保至少有一条有效记录
    if (processedData.length === 0) {
      return false;
    }

    try {
      if (mergeStrategy === 'replace') {
        return persistHistoryToStorage(STORAGE_KEY, processedData);
      }
      // 合并策略：保留现有记录，添加新记录（根据 id 去重）
      const existingHistory = getQuotationHistory();
      const existingIds = new Set(existingHistory.map(item => item.id));
      const newHistory = [
        ...existingHistory,
        ...processedData.filter(item => !existingIds.has(item.id))
      ];
      return persistHistoryToStorage(STORAGE_KEY, newHistory);
    } catch (storageError) {
      console.error('Error saving quotation history import:', storageError);
      return false;
    }
  } catch (error) {
    return false;
  }
};
