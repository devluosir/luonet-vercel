import { create } from 'zustand';
import type { QuotationData, LineItem, OtherFee } from '@/types/quotation';
import type { NoteConfig, SpecialNoteConfig } from '../types/notes';
import { DEFAULT_NOTES_CONFIG, PAYMENT_TERMS_OPTIONS, DELIVERY_TERMS_OPTIONS } from '../types/notes';

type Tab = 'quotation' | 'confirmation';

interface QuotationState {
  // 核心状态
  tab: Tab;
  data: QuotationData;
  editId?: string;
  isGenerating: boolean;
  generatingProgress: number;
  
  // UI状态
  showSettings: boolean;
  showPreview: boolean;
  isPasteDialogOpen: boolean;
  notesConfig: NoteConfig[]; // 新增：Notes配置
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
  
  // UI Actions
  setShowSettings: (show: boolean) => void;
  setShowPreview: (show: boolean) => void;
  setPasteDialogOpen: (open: boolean) => void;
  setPreviewItem: (item: QuotationState['previewItem']) => void;
  
  // 业务 Actions
  updateItems: (items: LineItem[]) => void;
  updateOtherFees: (fees: OtherFee[]) => void;
  updateData: (updates: Partial<QuotationData>) => void;
  
  // 新增：Notes配置相关actions
  setNotesConfig: (config: NoteConfig[]) => void;
  updateNoteVisibility: (id: string, visible: boolean) => void;
  updateNoteOrder: (fromIndex: number, toIndex: number) => void;
  updateSpecialNoteOption: (noteId: string, optionId: string) => void;
}

export const useQuotationStore = create<QuotationState>((set) => ({
  // 初始状态
  tab: 'quotation',
  data: {
    quotationNo: '',
    contractNo: '',
    date: '',
    notes: [],
    from: '',
    to: '',
    inquiryNo: '',
    currency: 'USD',
    paymentDate: '',
    items: [],
    amountInWords: {
      dollars: '',
      cents: '',
      hasDecimals: false
    },
    showDescription: true,
    showRemarks: false,
    showBank: false,
    showStamp: false,
    otherFees: [],
    customUnits: [],
    showPaymentTerms: false,
    showInvoiceReminder: false,
    additionalPaymentTerms: '',
    templateConfig: {
      headerType: 'bilingual',
      stampType: 'none'
    }
  } as QuotationData,
  editId: undefined,
  isGenerating: false,
  generatingProgress: 0,
  
  // UI状态
  showSettings: false,
  showPreview: false,
  isPasteDialogOpen: false,
  notesConfig: DEFAULT_NOTES_CONFIG, // 新增：默认Notes配置
  previewItem: null,

  // Actions
  setTab: (tab) => set({ tab }),
  setData: (updater) => set((state) => ({ data: updater(state.data) })),
  setEditId: (id) => set({ editId: id }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setProgress: (progress) => set({ generatingProgress: progress }),
  
  // UI Actions
  setShowSettings: (show) => set({ showSettings: show }),
  setShowPreview: (show) => set({ showPreview: show }),
  setPasteDialogOpen: (open) => set({ isPasteDialogOpen: open }),
  setPreviewItem: (item) => set({ previewItem: item }),
  
  // 业务 Actions
  updateItems: (items) => set((state) => ({ 
    data: { ...state.data, items } 
  })),
  updateOtherFees: (fees) => set((state) => ({ 
    data: { ...state.data, otherFees: fees } 
  })),
  updateData: (updates) => set((state) => ({ 
    data: { ...state.data, ...updates } 
  })),
  
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
  updateSpecialNoteOption: (noteId, optionId) => set((state) => ({
    notesConfig: state.notesConfig.map(note => 
      note.id === noteId 
        ? { ...note, selectedOption: optionId }
        : note
    )
  })),
}));
