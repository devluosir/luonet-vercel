import { QuotationData } from '@/types/quotation';
import { QuotationHistory, QuotationHistoryFilters } from '@/types/quotation-history';

const WORKER_URL = process.env.WORKER_URL || 'https://bj.luo.edu.rs';
const API_TOKEN = process.env.API_TOKEN;

// 保存报价历史
export const saveQuotationHistory = async (type: 'quotation' | 'confirmation', data: QuotationData) => {
  try {
    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0) +
      (data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0);

    const response = await fetch(`${WORKER_URL}/api/quotation/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({
        type,
        data,
        customerName: data.to,
        quotationNo: data.quotationNo,
        totalAmount,
        currency: data.currency,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save quotation history');
    }

    const result = await response.json();
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

    const response = await fetch(`${WORKER_URL}/api/quotation/history?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
      }
    });
    
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
    const response = await fetch(`${WORKER_URL}/api/quotation/history/${id}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
      }
    });
    
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
    const response = await fetch(`${WORKER_URL}/api/quotation/history/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
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
    const response = await fetch(`${WORKER_URL}/api/quotation/history/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting quotation history:', error);
    return false;
  }
}; 