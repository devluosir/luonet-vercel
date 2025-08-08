import { saveQuotationHistory } from '@/utils/quotationHistory';
import { getInitialQuotationData } from '@/utils/quotationInitialData';
import type { QuotationData } from '@/types/quotation';
import type { NoteConfig } from '../types/notes';
import { DEFAULT_NOTES_CONFIG } from '../types/notes';

interface CustomWindow extends Window {
  __QUOTATION_DATA__?: QuotationData | null;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
  __QUOTATION_TYPE__?: 'quotation' | 'confirmation';
  __NOTES_CONFIG__?: NoteConfig[] | null;
}

// 保存或更新报价数据
export async function saveOrUpdate(
  tab: 'quotation' | 'confirmation', 
  data: QuotationData,
  notesConfig: any[],
  editId?: string
): Promise<{ id: string } | null> {
  try {
    // 使用局部副本，避免直接修改传入的data
    let workingData = data;
    
    // confirmation 自动补合同号
    if (tab === 'confirmation' && !data.contractNo) {
      workingData = { 
        ...data, 
        contractNo: data.quotationNo || `SC${Date.now()}` 
      };
    }
    
    // 保存时包含notesConfig
    const dataWithConfig = {
      ...workingData,
      notesConfig
    };
    
    const result = await saveQuotationHistory(tab, dataWithConfig, editId);
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

// 从多个数据源初始化Notes配置
export function initNotesConfigFromSources(): NoteConfig[] {
  // 1. 优先使用全局注入的配置
  if (typeof window !== 'undefined') {
    const win = window as unknown as CustomWindow;
    if (win.__NOTES_CONFIG__) {
      return win.__NOTES_CONFIG__;
    }
  }

  // 2. 其次使用草稿数据中的配置
  try {
    const draft = localStorage.getItem('draftQuotation');
    if (draft) {
      const parsed = JSON.parse(draft);
      if (parsed.notesConfig) {
        return parsed.notesConfig;
      }
    }
  } catch (error) {
    console.warn('读取Notes配置失败:', error);
  }

  // 3. 最后使用默认配置
  return DEFAULT_NOTES_CONFIG;
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
