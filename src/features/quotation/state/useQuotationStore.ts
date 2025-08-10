import { create } from 'zustand';
import type { QuotationData, LineItem, OtherFee } from '@/types/quotation';
import type { NoteConfig } from '../types/notes';
import { DEFAULT_NOTES_CONFIG } from '../types/notes';
import { getInitialQuotationData } from '@/utils/quotationInitialData';
import { getDefaultNotes } from '@/utils/getDefaultNotes';
import { eventSampler } from '../utils/eventLogger';

// 已知的QuotationData字段
const KNOWN_KEYS = new Set<keyof QuotationData>([
  'quotationNo', 'contractNo', 'date', 'notes', 'from', 'to', 'inquiryNo', 'currency',
  'paymentDate', 'items', 'amountInWords', 'showDescription', 'showRemarks', 'showBank', 
  'showStamp', 'otherFees', 'customUnits', 'showPaymentTerms', 'showMainPaymentTerm', 'showInvoiceReminder',
  'additionalPaymentTerms', 'templateConfig'
]);

// 浅比较工具函数
const shallowEqual = (a: any, b: any) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
};

/**
 * 开发模式补丁审计器
 * 用于定位大补丁来源和清理未知字段
 */
function devAuditPatch(patch: Partial<QuotationData>, source = 'unknown'): Partial<QuotationData> {
  if (process.env.NODE_ENV !== 'development') return patch;

  const keys = Object.keys(patch);
  
  // 大补丁警告 + 堆栈追踪
  if (keys.length > 8) {
    const stack = new Error().stack?.split('\n').slice(2, 8).join('\n');
    console.warn(`[PatchAuditor] Large patch (${keys.length} keys) from ${source}`, {
      keys,
      source,
      stack
    });
  }
  
  // 未知字段清理
  const unknown = keys.filter(k => !KNOWN_KEYS.has(k as keyof QuotationData));
  if (unknown.length > 0) {
    console.warn('[PatchAuditor] Unknown keys dropped:', unknown);
    const cleaned = { ...patch };
    for (const k of unknown) {
      delete (cleaned as any)[k];
    }
    return cleaned;
  }
  
  return patch;
}

type Tab = 'quotation' | 'confirmation';

export interface QuotationState {
  // 核心状态
  tab: Tab;
  data: QuotationData;
  editId?: string;
  isGenerating: boolean;
  generatingProgress: number;
  isPreviewing: boolean;
  previewProgress: number;
  
  // UI状态
  showSettings: boolean;
  showPreview: boolean;
  isPasteDialogOpen: boolean;
  notesConfig: NoteConfig[]; // 新增：Notes配置
  compactMode: boolean; // 新增：紧凑模式开关
  
  // 🔥 新增：选择态标记
  uiFlags: {
    selectingCustomer: boolean;
  };
  previewItem: {
    id: string;
    createdAt: string;
    updatedAt: string;
    customerName: string;
    quotationNo: string;
    totalAmount: number;
    currency: string;
    type: 'quotation' | 'confirmation';
    data: QuotationData;
  } | null;

  // Actions
  setTab: (tab: Tab) => void;
  setData: (updater: (prev: QuotationData) => QuotationData) => void;
  setEditId: (id?: string) => void;
  setGenerating: (isGenerating: boolean) => void;
  setProgress: (progress: number) => void;
  setPreviewing: (isPreviewing: boolean) => void;
  setPreviewProgress: (progress: number) => void;
  
  // UI Actions
  setShowSettings: (show: boolean) => void;
  setShowPreview: (show: boolean) => void;
  setPasteDialogOpen: (open: boolean) => void;
  setPreviewItem: (item: QuotationState['previewItem']) => void;
  setCompactMode: (compact: boolean) => void; // 新增：紧凑模式切换
  
  // 🔥 新增：UI标记控制
  setUIFlags: (flags: Partial<QuotationState['uiFlags']>) => void;
  
  // 业务 Actions
  updateItems: (items: LineItem[]) => void;
  updateFromParse: (parseResult: { 
    rows: LineItem[]; 
    mergedRemarks?: { startRow: number; endRow: number; content: string; column: 'remarks' }[];
    mergedDescriptions?: { startRow: number; endRow: number; content: string; column: 'description' }[];
  }) => void;
  updateOtherFees: (fees: OtherFee[]) => void;
  updateData: (updates: Partial<QuotationData>) => void;
  updateFrom: (from: string) => void;
  updateCurrency: (currency: 'USD' | 'EUR' | 'CNY') => void;
  
  // 新增：Notes配置相关actions
  setNotesConfig: (config: NoteConfig[]) => void;
  updateNoteVisibility: (id: string, visible: boolean) => void;
  updateNoteOrder: (fromIndex: number, toIndex: number) => void;
  updateNoteContent: (noteId: string, content: string) => void;
  addNote: () => void;
  removeNote: (noteId: string) => void;
}

if (process.env.NODE_ENV === 'development') {
  console.log('[Store Init] useQuotationStore created');
}

export const useQuotationStore = create<QuotationState>((set, get) => ({
  // 初始状态
  tab: 'quotation',
  data: getInitialQuotationData(), // 使用预设值而不是空值
  editId: undefined,
  isGenerating: false,
  generatingProgress: 0,
  isPreviewing: false,
  previewProgress: 0,
  
  // UI状态
  showSettings: false,
  showPreview: false,
  isPasteDialogOpen: false,
  notesConfig: DEFAULT_NOTES_CONFIG, // 新增：默认Notes配置
  compactMode: false, // 新增：默认非紧凑模式
  uiFlags: { selectingCustomer: false }, // 🔥 新增：UI标记初始化
  previewItem: null,

  // Actions
  setTab: (tab) => set({ tab }),
  setData: (updater) => set((state) => ({ data: updater(state.data) })),
  setEditId: (id) => set({ editId: id }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setProgress: (progress) => set({ generatingProgress: progress }),
  setPreviewing: (isPreviewing) => set({ isPreviewing }),
  setPreviewProgress: (progress) => set({ previewProgress: progress }),
  
  // UI Actions
  setShowSettings: (show) => set({ showSettings: show }),
  setShowPreview: (show) => set({ showPreview: show }),
  setPasteDialogOpen: (open) => set({ isPasteDialogOpen: open }),
  setPreviewItem: (item) => set({ previewItem: item }),
  setCompactMode: (compact) => set({ compactMode: compact }),
  
  // 🔥 新增：UI标记控制
  setUIFlags: (flags) => set((state) => ({ 
    uiFlags: { ...state.uiFlags, ...flags } 
  })),
  
  // 业务 Actions
  updateItems: (items) => set((state) => {
    if (shallowEqual(items, state.data.items)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[updateItems] items相同，跳过更新');
      }
      return {};
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[updateItems] 更新items', items?.length);
    }
    return { data: { ...state.data, items, updatedAt: Date.now() } };
  }),
  updateFromParse: (parseResult) => set((state) => {
    // ✅ 字段统一 + 严禁在流转时清空描述/备注
    const normalized = parseResult.rows.map(it => ({
      ...it,
      // 统一：对外一律使用 description/remarks
      description: (it as any).description ?? (it as any).partName ?? '',
      remarks: (it as any).remarks ?? (it as any).remark ?? '',
    }));

    if (process.env.NODE_ENV === 'development') {
      console.log('[updateFromParse] 从解析结果更新:', {
        items: normalized.length,
        mergedRemarks: parseResult.mergedRemarks?.length,
        mergedDescriptions: parseResult.mergedDescriptions?.length
      });
      // 关键：不要在这里清空非起始行的 remarks/description
      console.info('[store:updateFromParse:first]', normalized[0]);
    }
    
    return { 
      data: { 
        ...state.data, 
        items: normalized, 
        mergedRemarks: parseResult.mergedRemarks || [],
        mergedDescriptions: parseResult.mergedDescriptions || [],
        updatedAt: Date.now() 
      } 
    };
  }),
  updateOtherFees: (fees) => set((state) => {
    if (shallowEqual(fees, state.data.otherFees)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[updateOtherFees] otherFees相同，跳过更新');
      }
      return {};
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[updateOtherFees] 更新otherFees', fees?.length);
    }
    return { data: { ...state.data, otherFees: fees, updatedAt: Date.now() } };
  }),
  updateData: (updates) => set((state) => {
    // 🚫 0号热补丁：在选择态下，严禁把 to 写成空串（抖动/清空都挡掉）
    const { selectingCustomer } = state.uiFlags;
    let patch = updates;
    
    if (
      Object.prototype.hasOwnProperty.call(patch, 'to') &&
      typeof patch.to === 'string' &&
      patch.to.trim() === '' &&
      selectingCustomer
    ) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Guard] 阻止选择态下的空值to写入');
      }
      const { to, ...rest } = patch;
      patch = rest as any; // 删除 to
      if (Object.keys(patch).length === 0) return {}; // 没别的 key 就直接忽略
    }
    
    // 审计并清理补丁
    const cleanedPatch = devAuditPatch(patch, 'updateData');
    const next = { ...state.data, ...cleanedPatch };
    
    if (shallowEqual(next, state.data)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[updateData] 无变化，跳过更新', cleanedPatch);
      }
      return {}; // 无变化不set
    }
    
    // 有变更时自动更新updatedAt（Store统一管理）
    const finalData = { ...next, updatedAt: Date.now() };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[updateData] 应用更新+updatedAt', cleanedPatch);
      eventSampler.log('updateData', cleanedPatch);
    }
    
    return { data: finalData };
  }),
  updateFrom: (from) => set((state) => {
    if (from === state.data.from) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[updateFrom] from相同，跳过更新', from);
      }
      return {};
    }
          const nextNotes = getDefaultNotes(from, state.tab);
      if (process.env.NODE_ENV === 'development') {
        console.log('[updateFrom] 更新from和notes', { from, notes: nextNotes });
        eventSampler.log('updateFrom', { from, notesCount: nextNotes.length });
      }
      return { data: { ...state.data, from, notes: nextNotes, updatedAt: Date.now() } };
  }),
  updateCurrency: (currency) => set((state) => {
    if (currency === state.data.currency) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[updateCurrency] currency相同，跳过更新', currency);
      }
      return {};
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[updateCurrency] 更新currency', currency);
      eventSampler.log('updateCurrency', { currency });
    }
    return { data: { ...state.data, currency, updatedAt: Date.now() } };
  }),
  
  // 新增：Notes配置相关actions
  setNotesConfig: (config) => set({ notesConfig: config }),
  updateNoteVisibility: (id, visible) => set((state) => ({
    notesConfig: state.notesConfig.map(note => 
      note.id === id ? { ...note, visible } : note
    )
  })),
  updateNoteOrder: (fromIndex, toIndex) => set((state) => {
    const newConfig = [...state.notesConfig];
    const [movedItem] = newConfig.splice(fromIndex, 1);
    newConfig.splice(toIndex, 0, movedItem);
    
    // 重新计算order值
    const updatedConfig = newConfig.map((note, index) => ({
      ...note,
      order: index
    }));
    
    return { notesConfig: updatedConfig };
  }),
  updateNoteContent: (noteId, content) => set((state) => ({
    notesConfig: state.notesConfig.map(note => 
      note.id === noteId 
        ? { ...note, content }
        : note
    )
  })),
  addNote: () => set((state) => {
    const newOrder = Math.max(...state.notesConfig.map(note => note.order), -1) + 1;
    const newNote: NoteConfig = {
      id: `custom_note_${Date.now()}`,
      visible: true,
      order: newOrder,
      content: ''
    };
    return {
      notesConfig: [...state.notesConfig, newNote]
    };
  }),
  removeNote: (noteId) => set((state) => ({
    notesConfig: state.notesConfig.filter(note => note.id !== noteId)
  })),
}));
