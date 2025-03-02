import { QuotationData } from '@/types/quotation';
import { QuotationHistory, QuotationHistoryFilters } from '@/types/quotation-history';
import { getDefaultNotes } from '@/utils/getDefaultNotes';

const STORAGE_KEY = 'quotation_history';

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 保存报价历史
export const saveQuotationHistory = (type: 'quotation' | 'confirmation', data: QuotationData) => {
  try {
    const history = getQuotationHistory();
    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0) +
      (data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0);

    const newHistory: QuotationHistory = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type,
      customerName: data.to,
      quotationNo: data.quotationNo,
      totalAmount,
      currency: data.currency,
      data
    };

    history.unshift(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return newHistory;
  } catch (error) {
    console.error('Error saving quotation history:', error);
    return null;
  }
};

// 获取所有历史记录
export const getQuotationHistory = (filters?: QuotationHistoryFilters): QuotationHistory[] => {
  try {
    let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    if (filters) {
      // 搜索
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        history = history.filter((item: QuotationHistory) => 
          item.customerName.toLowerCase().includes(searchLower) ||
          item.quotationNo.toLowerCase().includes(searchLower)
        );
      }

      // 类型筛选
      if (filters.type && filters.type !== 'all') {
        history = history.filter((item: QuotationHistory) => item.type === filters.type);
      }
    }

    return history;
  } catch (error) {
    console.error('Error getting quotation history:', error);
    return [];
  }
};

// 根据ID获取单个历史记录
export const getQuotationHistoryById = (id: string): QuotationHistory | null => {
  try {
    const history = getQuotationHistory();
    return history.find(item => item.id === id) || null;
  } catch (error) {
    console.error('Error getting quotation history by id:', error);
    return null;
  }
};

// 删除历史记录
export const deleteQuotationHistory = (id: string): boolean => {
  try {
    const history = getQuotationHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting quotation history:', error);
    return false;
  }
};

// 导出历史记录
export const exportQuotationHistory = (): string => {
  try {
    const history = getQuotationHistory();
    return JSON.stringify(history, null, 2);
  } catch (error) {
    console.error('Error exporting quotation history:', error);
    return '';
  }
};

// 导入历史记录
export const importQuotationHistory = (jsonData: string, mergeStrategy: 'replace' | 'merge' = 'merge'): boolean => {
  try {
    const importedHistory = JSON.parse(jsonData);
    
    // 验证导入的数据格式
    if (!Array.isArray(importedHistory)) {
      throw new Error('Invalid data format');
    }

    // 处理从发票导入的数据
    const processedData = importedHistory.map(item => {
      // 如果是发票数据（通过检查特有字段判断）
      if (item.data && item.data.customerPO !== undefined) {
        const convertedItems = item.data.items.map(lineItem => {
          // @ts-ignore - 处理发票数据
          if (lineItem.partname && !lineItem.partName) {
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
          customerName: item.customerName,
          quotationNo: item.data.invoiceNo, // 使用发票号作为单号
          totalAmount: item.totalAmount,
          currency: item.currency,
          createdAt: item.createdAt,
          updatedAt: item.createdAt,
          data: {
            to: item.data.to,
            inquiryNo: item.data.customerPO || '', // 发票 customerPO -> 订单确认 inquiryNo
            quotationNo: '', // 订单确认不需要报价单号
            date: item.data.date,
            from: 'Roger',
            currency: item.data.currency,
            paymentDate: item.data.paymentDate,
            items: convertedItems,
            notes: getDefaultNotes('Roger', 'confirmation'), // 使用订单确认的默认备注
            amountInWords: item.data.amountInWords,
            showDescription: true,
            showRemarks: false,
            showBank: item.data.showBank,
            showStamp: false,
            contractNo: item.data.invoiceNo, // 发票号作为合同号
            otherFees: item.data.otherFees || [],
            customUnits: [],
            showPaymentTerms: item.data.showPaymentTerms,
            showInvoiceReminder: item.data.showInvoiceReminder,
            additionalPaymentTerms: item.data.additionalPaymentTerms
          }
        };
      }
      return item;
    });

    if (mergeStrategy === 'replace') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(processedData));
    } else {
      // 合并策略：保留现有记录，添加新记录（根据 id 去重）
      const existingHistory = getQuotationHistory();
      const existingIds = new Set(existingHistory.map(item => item.id));
      const newHistory = [
        ...existingHistory,
        ...processedData.filter(item => !existingIds.has(item.id))
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    }
    
    return true;
  } catch (error) {
    console.error('Error importing quotation history:', error);
    return false;
  }
}; 