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
  notesConfig: NoteConfig[],
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

  // 2. 其次使用草稿数据，但确保合并预设值
  try {
    const draft = localStorage.getItem('draftQuotation');
    if (draft) {
      const parsed = JSON.parse(draft);
      // 获取预设值作为基础
      const defaultData = getInitialQuotationData();
      // 合并草稿数据和预设值，确保关键字段不会丢失
      return {
        ...defaultData,
        ...parsed,
        // 确保notes字段有内容
        notes: parsed.notes && parsed.notes.length > 0 ? parsed.notes : defaultData.notes,
        // 确保from字段有内容
        from: parsed.from || defaultData.from,
        // 确保items至少有一个空项
        items: parsed.items && parsed.items.length > 0 ? parsed.items : defaultData.items,
        // 确保templateConfig有正确的默认值
        templateConfig: parsed.templateConfig || defaultData.templateConfig
      };
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
      if (parsed.notesConfig && Array.isArray(parsed.notesConfig)) {
        console.log('从草稿恢复Notes配置:', parsed.notesConfig.length, '条');
        return parsed.notesConfig;
      }
    }
  } catch (error) {
    console.warn('读取Notes配置失败:', error);
  }

  // 3. 最后使用默认配置
  console.log('使用默认Notes配置:', DEFAULT_NOTES_CONFIG.length, '条');
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

// 报价单服务类
export class QuotationService {
  private baseUrl: string = '/api/quotation';

  async create(data: any): Promise<any> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('创建报价单失败');
    }
    
    return response.json();
  }

  async update(id: string, data: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('更新报价单失败');
    }
    
    return response.json();
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('删除报价单失败');
    }
  }

  async getById(id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      throw new Error('获取报价单失败');
    }
    
    return response.json();
  }

  async list(params?: any): Promise<any> {
    const searchParams = new URLSearchParams(params);
    const response = await fetch(`${this.baseUrl}?${searchParams}`);
    
    if (!response.ok) {
      throw new Error('获取报价单列表失败');
    }
    
    return response.json();
  }
}
