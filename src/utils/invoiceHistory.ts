import { InvoiceHistory } from '@/types/invoice-history';

const STORAGE_KEY = 'invoice_history';

// 获取历史记录
export const getInvoiceHistory = (): InvoiceHistory[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading invoice history:', error);
    return [];
  }
};

// 保存历史记录
export const saveInvoiceHistory = (history: InvoiceHistory[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }
    
    return true;
  } catch (error) {
    console.error('Error saving invoice history:', error);
    return false;
  }
};

// 添加新记录
export const addInvoiceHistory = (data: InvoiceHistory): boolean => {
  try {
    const history = getInvoiceHistory();
    history.unshift(data);
    return saveInvoiceHistory(history);
  } catch (error) {
    console.error('Error adding invoice history:', error);
    return false;
  }
};

// 删除记录
export const deleteInvoiceHistory = (id: string): boolean => {
  try {
    const history = getInvoiceHistory();
    const filtered = history.filter(item => item.id !== id);
    return saveInvoiceHistory(filtered);
  } catch (error) {
    console.error('Error deleting invoice history:', error);
    return false;
  }
};

// 导入历史记录
export const importInvoiceHistory = (jsonData: string): boolean => {
  try {
    // 确保输入是有效的JSON字符串
    if (!jsonData || typeof jsonData !== 'string') {
      console.error('Invalid input: jsonData must be a string');
      return false;
    }

    // 处理可能的BOM标记（在iOS上可能会出现）
    let cleanJsonData = jsonData;
    if (jsonData.charCodeAt(0) === 0xFEFF) {
      cleanJsonData = jsonData.slice(1);
      console.log('Removed BOM marker from JSON data');
    }

    // 尝试解析JSON
    let data;
    try {
      data = JSON.parse(cleanJsonData);
    } catch (parseError) {
      // 尝试修复常见的JSON格式问题
      try {
        // 有时iOS设备会在JSON字符串中添加额外的字符
        const fixedJson = cleanJsonData
          .replace(/\n/g, '')
          .replace(/\r/g, '')
          .replace(/\t/g, '')
          .trim();
        data = JSON.parse(fixedJson);
        console.log('Successfully parsed JSON after fixing format issues');
      } catch (secondError) {
        console.error('Failed to parse JSON even after cleanup:', secondError);
        return false;
      }
    }
    
    if (!Array.isArray(data)) {
      console.error('Invalid data format: expected an array');
      return false;
    }
    
    // 处理导入的数据
    const processedData = data.map(item => {
      // 基本验证：确保item是对象且有id
      if (!item || typeof item !== 'object' || !item.id) {
        console.warn('Skipping invalid item:', item);
        return null;
      }
      
      // 确保有 updatedAt 字段，如果没有则使用 createdAt
      const itemWithUpdatedAt = {
        ...item,
        updatedAt: item.updatedAt || item.createdAt
      };
      
      // 检查是否是发票数据（通过检查特有字段判断）
      const isInvoiceData = item.data && (
        item.data.invoiceNo !== undefined || 
        item.data.customerPO !== undefined ||
        (item.data.items && item.data.items.length > 0 && item.data.items[0].partname !== undefined)
      );
      
      // 如果是发票数据，直接返回，不进行转换
      if (isInvoiceData) {
        console.log('检测到发票数据，直接导入:', item.id);
        return itemWithUpdatedAt;
      }
      
      // 如果是报价单数据，进行转换
      if (item.data && item.data.items) {
        // 确保items数组存在且有效
        if (!Array.isArray(item.data.items)) {
          console.warn('Invalid items array in quotation data:', item);
          return itemWithUpdatedAt; // 返回原始项，不进行转换
        }
        
        const convertedItems = item.data.items.map((lineItem: { partName?: string; id?: number; description?: string; quantity: number; unit: string; unitPrice: number; amount: number }) => {
          if (lineItem.partName && !('partname' in lineItem)) {
            return {
              ...lineItem,
              partname: lineItem.partName,
              partName: undefined,
              lineNo: lineItem.id || 0,
              hsCode: '',
              highlight: {}
            };
          }
          return lineItem;
        });

        return {
          ...itemWithUpdatedAt,
          data: {
            ...item.data,
            items: convertedItems,
            // 添加发票必需字段
            customerPO: item.data.inquiryNo || '',
            invoiceNo: item.data.contractNo || item.data.quotationNo,
            showHsCode: false,
            templateConfig: {
              headerType: 'bilingual',
              invoiceType: 'invoice',
              stampType: 'none'
            },
            otherFees: item.data.otherFees || []
          }
        };
      }
      return itemWithUpdatedAt;
    }).filter(Boolean); // 过滤掉null项
    
    // 确保至少有一条有效记录
    if (processedData.length === 0) {
      console.error('No valid records found in imported data');
      return false;
    }
    
    try {
      const history = getInvoiceHistory();
      const merged = [...processedData, ...history];
      const uniqueHistory = Array.from(new Map(merged.map(item => [item.id, item])).values());
      
      return saveInvoiceHistory(uniqueHistory);
    } catch (storageError) {
      console.error('Error saving to localStorage:', storageError);
      // 尝试分块保存（如果数据太大）
      if (
        typeof storageError === 'object' && 
        storageError !== null && 
        'name' in storageError && 
        (storageError.name === 'QuotaExceededError' || storageError.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        console.warn('Storage quota exceeded, trying to free up space...');
        // 尝试清理其他不重要的数据
        try {
          // 保留最重要的数据
          const existingHistory = getInvoiceHistory();
          // 只保留最近的50条记录
          const trimmedHistory = existingHistory.slice(-50);
          saveInvoiceHistory(trimmedHistory);
          console.log('Successfully trimmed history to make space');
          
          // 再次尝试保存导入的数据
          return importInvoiceHistory(jsonData);
        } catch (e) {
          console.error('Failed to free up space:', e);
          return false;
        }
      }
      return false;
    }
  } catch (error) {
    console.error('Error importing invoice history:', error);
    return false;
  }
};

// 导出历史记录
export const exportInvoiceHistory = (): string => {
  try {
    const history = getInvoiceHistory();
    return JSON.stringify(history, null, 2);
  } catch (error) {
    console.error('Error exporting invoice history:', error);
    return '';
  }
}; 