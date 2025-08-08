import { saveQuotationHistory } from '@/utils/quotationHistory';
import { getInitialQuotationData } from '@/utils/quotationInitialData';
import type { QuotationData } from '@/types/quotation';

interface CustomWindow extends Window {
  __QUOTATION_DATA__?: QuotationData | null;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
  __QUOTATION_TYPE__?: 'quotation' | 'confirmation';
}

// 保存或更新报价数据
export async function saveOrUpdate(
  tab: 'quotation' | 'confirmation', 
  data: QuotationData, 
  editId?: string
): Promise<{ id: string } | null> {
  try {
    // confirmation 自动补合同号
    if (tab === 'confirmation' && !data.contractNo) {
      data = { 
        ...data, 
        contractNo: data.quotationNo || `SC${Date.now()}` 
      };
    }
    
    const result = await saveQuotationHistory(tab, data, editId);
    return result;
  } catch (error) {
    console.error('Error saving quotation:', error);
    throw error;
  }
}

// 从多个数据源初始化数据
export function initDataFromSources(): QuotationData {
  // 1. 优先使用全局注入的数据
  if (typeof window !== 'undefined') {
    const win = window as unknown as CustomWindow;
    if (win.__QUOTATION_DATA__) {
      return win.__QUOTATION_DATA__;
    }
  }

  // 2. 其次使用草稿数据
  try {
    const draft = localStorage.getItem('draftQuotation');
    if (draft) {
      const parsed = JSON.parse(draft);
      return parsed;
    }
  } catch (error) {
    console.warn('读取草稿失败:', error);
  }

  // 3. 最后使用默认数据
  return getInitialQuotationData();
}

// 获取编辑ID
export function getEditIdFromPathname(pathname?: string): string | undefined {
  if (pathname?.startsWith('/quotation/edit/')) {
    return pathname.split('/').pop();
  }
  return undefined;
}

// 获取标签页类型
export function getTabFromSearchParams(searchParams?: URLSearchParams): 'quotation' | 'confirmation' {
  if (typeof window !== 'undefined' && searchParams) {
    const tabFromUrl = searchParams.get('tab') as 'quotation' | 'confirmation' | null;
    if (tabFromUrl) return tabFromUrl;
  }

  // 从全局变量获取
  if (typeof window !== 'undefined') {
    const win = window as unknown as CustomWindow;
    return win.__QUOTATION_TYPE__ || 'quotation';
  }

  return 'quotation';
}
