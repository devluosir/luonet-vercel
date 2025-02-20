import { QuotationData } from '@/types/quotation';
import { QuotationHistory, QuotationHistoryFilters } from '@/types/quotation-history';

const WORKER_URL = process.env.WORKER_URL || 'https://bj.luocompany.net';
const API_TOKEN = process.env.API_TOKEN;

const fetchWithRetry = async (url: string, options: RequestInit = {}, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
          ...options.headers,
        },
        keepalive: true,
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      console.log(`Retry ${i + 1} failed:`, error);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError;
};

// 保存报价历史
export const saveQuotationHistory = async (type: 'quotation' | 'confirmation', data: QuotationData) => {
  try {
    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0) +
      (data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0);

    const payload = {
      type,
      data,
      customerName: data.to,
      quotationNo: data.quotationNo,
      totalAmount,
      currency: data.currency,
    };

    console.log('Saving quotation with payload:', payload);

    const response = await fetchWithRetry(`${WORKER_URL}/api/quotation/history`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Failed to save quotation history: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Save successful:', result);
    return result;
  } catch (error) {
    console.error('Error saving quotation history:', error);
    return null;
  }
};

// 获取所有历史记录
export const getQuotationHistory = async (filters?: QuotationHistoryFilters): Promise<QuotationHistory[]> => {
  try {
    const searchParams = new URLSearchParams();
    if (filters?.search) {
      searchParams.set('search', filters.search);
    }
    if (filters?.type && filters.type !== 'all') {
      searchParams.set('type', filters.type);
    }
    if (filters?.dateRange) {
      searchParams.set('startDate', filters.dateRange.start);
      searchParams.set('endDate', filters.dateRange.end);
    }

    const response = await fetchWithRetry(`${WORKER_URL}/api/quotation/history?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch quotation history');
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error getting quotation history:', error);
    return [];
  }
};

// 根据ID获取单个历史记录
export const getQuotationHistoryById = async (id: string): Promise<QuotationHistory | null> => {
  try {
    const response = await fetchWithRetry(`${WORKER_URL}/api/quotation/history/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch quotation history');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting quotation history by id:', error);
    return null;
  }
};

// 更新历史记录
export const updateQuotationHistory = async (id: string, data: QuotationData): Promise<boolean> => {
  try {
    const response = await fetchWithRetry(`${WORKER_URL}/api/quotation/history/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error updating quotation history:', error);
    return false;
  }
};

// 删除历史记录
export const deleteQuotationHistory = async (id: string): Promise<boolean> => {
  try {
    const response = await fetchWithRetry(`${WORKER_URL}/api/quotation/history/${id}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting quotation history:', error);
    return false;
  }
}; 