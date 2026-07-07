import { saveQuotationHistory } from '@/utils/quotationHistory';
import { getInitialQuotationData } from '@/utils/quotationInitialData';
import type { QuotationData } from '@/types/quotation';
import type { NoteConfig } from '../types/notes';
import { DEFAULT_NOTES_CONFIG, DOMESTIC_NOTES_CONFIG } from '../types/notes';

interface CustomWindow extends Window {
  __QUOTATION_DATA__?: QuotationData | null;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
  __QUOTATION_TYPE__?: QuotationTab;
  __NOTES_CONFIG__?: NoteConfig[] | null;
}

export type QuotationTab = 'quotation' | 'confirmation' | 'domestic';
export type QuotationHistoryType = 'quotation' | 'confirmation';

export function getHistoryTypeFromTab(tab: QuotationTab): QuotationHistoryType {
  return tab === 'confirmation' ? 'confirmation' : 'quotation';
}

// 保存或更新报价数据
export async function saveOrUpdate(
  tab: QuotationTab,
  data: QuotationData,
  notesConfig: NoteConfig[],
  editId?: string
): Promise<{ id: string } | null> {
  try {
    // 使用局部副本，避免直接修改传入的data
    let workingData = data;

    // confirmation 自动补合同号
    const historyType = getHistoryTypeFromTab(tab);

    if (historyType === 'confirmation' && !data.contractNo) {
      workingData = {
        ...data,
        mode: 'export',
        contractNo: data.quotationNo || `SC${Date.now()}`
      };
    }

    // 保存时包含notesConfig
    const dataWithConfig: QuotationData & { notesConfig: NoteConfig[] } = {
      ...workingData,
      mode: tab === 'domestic' ? 'domestic' : 'export',
      notesConfig
    };

    const result = await saveQuotationHistory(historyType, dataWithConfig, editId);
    return result;
  } catch (error) {
    console.error('Error saving quotation:', error);
    throw error;
  }
}

// 从多个数据源初始化数据
export function initDataFromSources(tab: QuotationTab = 'quotation'): QuotationData {
  // 1. 优先使用全局注入的数据
  if (typeof window !== 'undefined') {
    const win = window as unknown as CustomWindow;
    if (win.__QUOTATION_DATA__) {
      return {
        ...win.__QUOTATION_DATA__,
        mode: tab === 'domestic' ? 'domestic' : win.__QUOTATION_DATA__.mode ?? 'export',
        currency: tab === 'domestic' ? 'CNY' : win.__QUOTATION_DATA__.currency,
      };
    }
  }

  // 2. 其次使用草稿数据，但确保合并预设值
  try {
    const draftKey = tab === 'domestic' ? 'draftDomesticQuotation' : 'draftQuotation';
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      const parsed = JSON.parse(draft);
      // 获取预设值作为基础
      const defaultData = getInitialQuotationData(tab);
      // 合并草稿数据和预设值，确保关键字段不会丢失
      return {
        ...defaultData,
        ...parsed,
        mode: tab === 'domestic' ? 'domestic' : parsed.mode ?? 'export',
        currency: tab === 'domestic' ? 'CNY' : parsed.currency ?? defaultData.currency,
        // 确保notes字段有内容
        notes: parsed.notes && parsed.notes.length > 0 ? parsed.notes : defaultData.notes,
        // 确保from字段有内容
        from: parsed.from || defaultData.from,
        // 确保items至少有一个空项
        items: parsed.items && parsed.items.length > 0 ? parsed.items : defaultData.items,
        // 确保templateConfig有正确的默认值
        templateConfig: parsed.templateConfig || defaultData.templateConfig,
        // 确保付款条款使用默认值false
        showMainPaymentTerm: defaultData.showMainPaymentTerm
      };
    }
  } catch (error) {
    console.warn('读取草稿失败:', error);
  }

  // 3. 最后使用默认数据
  return getInitialQuotationData(tab);
}

// 从多个数据源初始化Notes配置
export function initNotesConfigFromSources(tab: QuotationTab = 'quotation'): NoteConfig[] {
  // 1. 优先使用全局注入的配置
  if (typeof window !== 'undefined') {
    const win = window as unknown as CustomWindow;
    if (win.__NOTES_CONFIG__) {
      return win.__NOTES_CONFIG__;
    }
  }

  // 2. 其次使用草稿数据中的配置
  try {
    const draftKey = tab === 'domestic' ? 'draftDomesticQuotation' : 'draftQuotation';
    const draft = localStorage.getItem(draftKey);
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
  const defaults = tab === 'domestic' ? DOMESTIC_NOTES_CONFIG : DEFAULT_NOTES_CONFIG;
  console.log('使用默认Notes配置:', defaults.length, '条');
  return defaults;
}

// 获取编辑ID
export function getEditIdFromPathname(pathname?: string): string | undefined {
  if (pathname?.startsWith('/quotation/edit/')) {
    return pathname.split('/').pop();
  }
  return undefined;
}

// 获取标签页类型
export function getTabFromSearchParams(searchParams?: URLSearchParams): QuotationTab {
  if (typeof window !== 'undefined' && searchParams) {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'confirmation' || tabFromUrl === 'domestic' || tabFromUrl === 'quotation') {
      return tabFromUrl;
    }
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

  async create<TResponse = unknown>(data: QuotationData): Promise<TResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('创建报价单失败');
    }

    return response.json() as Promise<TResponse>;
  }

  async update<TResponse = unknown>(id: string, data: Partial<QuotationData>): Promise<TResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('更新报价单失败');
    }

    return response.json() as Promise<TResponse>;
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('删除报价单失败');
    }
  }

  async getById<TResponse = unknown>(id: string): Promise<TResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`);

    if (!response.ok) {
      throw new Error('获取报价单失败');
    }

    return response.json() as Promise<TResponse>;
  }

  async list<TResponse = unknown>(params?: Record<string, string | number | boolean | undefined>): Promise<TResponse> {
    const searchParams = new URLSearchParams(
      Object.entries(params ?? {})
        .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
        .map(([key, value]) => [key, String(value)])
    );
    const response = await fetch(`${this.baseUrl}?${searchParams}`);

    if (!response.ok) {
      throw new Error('获取报价单列表失败');
    }

    return response.json() as Promise<TResponse>;
  }
}
