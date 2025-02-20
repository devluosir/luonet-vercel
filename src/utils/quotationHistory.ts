import { QuotationData } from '@/types/quotation';
import { QuotationHistory, QuotationHistoryFilters } from '@/types/quotation-history';

const WORKER_URL = process.env.WORKER_URL || 'https://bj.luocompany.net';
const API_TOKEN = process.env.API_TOKEN;

// 定义可重试的错误类型
const RETRYABLE_ERRORS = [
  'net::ERR_CONNECTION_CLOSED',
  'net::ERR_CONNECTION_RESET',
  'net::ERR_CONNECTION_REFUSED',
  'net::ERR_NETWORK',
  'net::ERR_CONNECTION_TIMED_OUT',
  'timeout'
];

const isRetryableError = (error: any): boolean => {
  const errorMessage = error?.message || error?.toString() || '';
  return RETRYABLE_ERRORS.some(e => errorMessage.includes(e)) ||
    (error instanceof TypeError && errorMessage.includes('fetch'));
};

const fetchWithRetry = async (url: string, options: RequestInit = {}, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 设置请求超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
          ...options.headers,
        },
        signal: controller.signal,
        keepalive: true,
        mode: 'cors',
        credentials: 'omit'
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage += `, body: ${errorText}`;
        }
        throw new Error(errorMessage);
      }
      
      return response;
    } catch (error: any) {
      lastError = error;

      // 如果是不可重试的错误，直接抛出
      if (!isRetryableError(error)) {
        throw error;
      }

      if (i < maxRetries - 1) {
        // 使用指数退避策略，基础等待时间为1秒
        const waitTime = Math.min(1000 * Math.pow(2, i), 10000);
        // 添加随机抖动，避免多个请求同时重试
        const jitter = Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime + jitter));
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

    const response = await fetchWithRetry(`${WORKER_URL}/api/quotation/history`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`保存报价历史失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    throw new Error(`获取报价历史失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 根据ID获取单个历史记录
export const getQuotationHistoryById = async (id: string): Promise<QuotationHistory | null> => {
  try {
    const response = await fetchWithRetry(`${WORKER_URL}/api/quotation/history/${id}`);
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`获取报价历史详情失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
    throw new Error(`更新报价历史失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
    throw new Error(`删除报价历史失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}; 