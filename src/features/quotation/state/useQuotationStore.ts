import { create } from 'zustand';
import type { QuotationData, LineItem, OtherFee } from '@/types/quotation';
import type { NoteConfig } from '../types/notes';
import { DEFAULT_NOTES_CONFIG, DOMESTIC_NOTES_CONFIG } from '../types/notes';
import { getInitialQuotationData } from '@/utils/quotationInitialData';
import { getDefaultNotes } from '@/utils/getDefaultNotes';
import { eventSampler } from '../utils/eventLogger';
import { getLocalStorageJSON, getLocalStorageString } from '@/utils/safeLocalStorage';

// 已知的QuotationData字段
const KNOWN_KEYS = new Set<keyof QuotationData>([
  'mode', 'quotationNo', 'contractNo', 'date', 'notes', 'from', 'to', 'inquiryNo', 'currency',
  'domesticSeller', 'domesticBuyer',
  'paymentDate', 'items', 'amountInWords', 'showDescription', 'showRemarks', 'showBank',
  'showStamp', 'otherFees', 'customUnits', 'showMainPaymentTerm', 'showInvoiceReminder',
  'additionalPaymentTerms', 'templateConfig', 'depositPercentage', 'depositAmount',
  'domesticTotalRemark', 'showBalance', 'balanceAmount', 'updatedAt'
]);

// 浅比较工具函数
const shallowEqual = (a: unknown, b: unknown) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const ka = Object.keys(aRecord), kb = Object.keys(bRecord);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (aRecord[k] !== bRecord[k]) return false;
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
    const cleaned = { ...patch } as Partial<QuotationData> & Record<string, unknown>;
    for (const k of unknown) {
      delete cleaned[k];
    }
    return cleaned;
  }

  return patch;
}

export type QuotationTab = 'quotation' | 'confirmation' | 'domestic';

export interface QuotationState {
  // 核心状态
  tab: QuotationTab;
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
  setTab: (tab: QuotationTab) => void;
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
  updateFromField: () => void;

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

export const useQuotationStore = create<QuotationState>((set, _get) => ({
  // 初始状态
  tab: 'quotation',
  data: getInitialQuotationData('quotation'), // 使用预设值而不是空值
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
  setTab: (tab) => set((state) => {
    // 当切换到销售确认tab时，自动设置showStamp为true
    if (tab === 'confirmation' && !state.data.showStamp) {
      return {
        tab,
        data: { ...state.data, mode: 'export', showStamp: true }
      };
    }
    if (tab === 'domestic') {
      return {
        tab,
        data: {
          ...state.data,
          mode: 'domestic',
          currency: 'CNY',
          domesticSeller: state.data.domesticSeller ?? { name: state.data.from },
          domesticBuyer: state.data.domesticBuyer ?? { name: state.data.to.split('\n')[0] ?? '' },
          domesticTotalRemark: state.data.domesticTotalRemark ?? '价格含13个点专票及运费',
        },
        notesConfig: state.notesConfig.some((note) => note.id.startsWith('domestic_clause_'))
          ? state.notesConfig
          : DOMESTIC_NOTES_CONFIG,
      };
    }
    if (state.data.mode === 'domestic') {
      return {
        tab,
        data: { ...state.data, mode: 'export' }
      };
    }
    return { tab };
  }),
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

    // 计算新的总金额和amountInWords
    const totalAmount = (items || []).reduce((sum, item) => sum + (item.amount || 0), 0) +
                       (state.data.otherFees || []).reduce((sum, fee) => sum + fee.amount, 0);

    // 动态导入numberToWords函数
    const { numberToWords } = require('@/utils/quotationCalculations');
    const amountInWords = numberToWords(totalAmount);

    // 重新计算depositAmount和balanceAmount
    const depositAmount = state.data.depositPercentage && state.data.depositPercentage > 0
      ? (state.data.depositPercentage / 100) * totalAmount
      : undefined;

    const balanceAmount = state.data.showBalance && depositAmount
      ? totalAmount - depositAmount
      : undefined;

    return {
      data: {
        ...state.data,
        items,
        amountInWords,
        depositAmount,
        balanceAmount,
        updatedAt: new Date().toISOString()
      }
    };
  }),
  updateFromParse: (parseResult) => set((state) => {
    // ✅ 字段统一 + 严禁在流转时清空描述/备注
    const normalized = parseResult.rows.map((it: LineItem & { remark?: string }) => ({
      ...it,
      // 统一：对外一律使用 description/remarks
      description: it.description ?? it.partName ?? '',
      remarks: it.remarks ?? it.remark ?? '',
    }));

    if (process.env.NODE_ENV === 'development') {
      console.log('[updateFromParse] 从解析结果更新:', {
        items: normalized.length,
        mergedRemarks: parseResult.mergedRemarks?.length,
        mergedDescriptions: parseResult.mergedDescriptions?.length
      });
    }

    // 计算新的总金额和amountInWords
    const totalAmount = (normalized || []).reduce((sum, item) => sum + (item.amount || 0), 0) +
                       (state.data.otherFees || []).reduce((sum, fee) => sum + fee.amount, 0);

    // 动态导入numberToWords函数
    const { numberToWords } = require('@/utils/quotationCalculations');
    const amountInWords = numberToWords(totalAmount);

    // 重新计算depositAmount和balanceAmount
    const depositAmount = state.data.depositPercentage && state.data.depositPercentage > 0
      ? (state.data.depositPercentage / 100) * totalAmount
      : undefined;

    const balanceAmount = state.data.showBalance && depositAmount
      ? totalAmount - depositAmount
      : undefined;

    return {
      data: {
        ...state.data,
        items: normalized,
        mergedRemarks: parseResult.mergedRemarks || [],
        mergedDescriptions: parseResult.mergedDescriptions || [],
        amountInWords,
        depositAmount,
        balanceAmount,
        updatedAt: new Date().toISOString()
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

    // 计算新的总金额和amountInWords
    const totalAmount = (state.data.items || []).reduce((sum, item) => sum + (item.amount || 0), 0) +
                       (fees || []).reduce((sum, fee) => sum + fee.amount, 0);

    // 动态导入numberToWords函数
    const { numberToWords } = require('@/utils/quotationCalculations');
    const amountInWords = numberToWords(totalAmount);

    // 重新计算depositAmount和balanceAmount
    const depositAmount = state.data.depositPercentage && state.data.depositPercentage > 0
      ? (state.data.depositPercentage / 100) * totalAmount
      : undefined;

    const balanceAmount = state.data.showBalance && depositAmount
      ? totalAmount - depositAmount
      : undefined;

    return {
      data: {
        ...state.data,
        otherFees: fees,
        amountInWords,
        depositAmount,
        balanceAmount,
        updatedAt: new Date().toISOString()
      }
    };
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
      patch = rest; // 删除 to
      if (Object.keys(patch).length === 0) return {}; // 没别的 key 就直接忽略
    }

    // 审计并清理补丁
    const cleanedPatch = devAuditPatch(patch, 'updateData');
    const next = { ...state.data, ...cleanedPatch };

    // 自动计算amountInWords（当items或otherFees发生变化时）
    let finalData = { ...next };
    if (cleanedPatch.items || cleanedPatch.otherFees) {
      const totalAmount = (next.items || []).reduce((sum, item) => sum + (item.amount || 0), 0) +
                         (next.otherFees || []).reduce((sum, fee) => sum + fee.amount, 0);

      // 动态导入numberToWords函数
      const { numberToWords } = require('@/utils/quotationCalculations');
      const amountInWords = numberToWords(totalAmount);

      finalData = { ...finalData, amountInWords };
    }

    if (shallowEqual(finalData, state.data)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[updateData] 无变化，跳过更新', cleanedPatch);
      }
      return {}; // 无变化不set
    }

    // 有变更时自动更新updatedAt（Store统一管理）
    finalData = { ...finalData, updatedAt: new Date().toISOString() };

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
          const nextNotes = getDefaultNotes(from, state.tab === 'confirmation' ? 'confirmation' : 'quotation');
      if (process.env.NODE_ENV === 'development') {
        console.log('[updateFrom] 更新from和notes', { from, notes: nextNotes });
        eventSampler.log('updateFrom', { from, notesCount: nextNotes.length });
      }
      return { data: { ...state.data, from, notes: nextNotes, updatedAt: new Date().toISOString() } };
  }),

  // 更新from字段为当前用户
  updateFromField: () => set((state) => {
    if (typeof window === 'undefined') return state;

    try {
      const userInfo = getLocalStorageJSON('userInfo', null) as { username?: string } | null;
      const currentUser = userInfo?.username || getLocalStorageString('username');

      if (currentUser && currentUser.toLowerCase() !== 'roger') {
        const formattedUser = currentUser.charAt(0).toUpperCase() + currentUser.slice(1).toLowerCase();
        const nextNotes = getDefaultNotes(formattedUser, state.tab === 'confirmation' ? 'confirmation' : 'quotation');
        return {
          data: { ...state.data, from: formattedUser, notes: nextNotes, updatedAt: new Date().toISOString() }
        };
      }
    } catch (error) {
      console.warn('[QuotationStore] 更新from字段失败:', error);
    }

    return state;
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
    return { data: { ...state.data, currency, updatedAt: new Date().toISOString() } };
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
