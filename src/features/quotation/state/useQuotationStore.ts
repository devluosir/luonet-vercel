import { create } from 'zustand';
import type { QuotationData, LineItem, OtherFee } from '@/types/quotation';
import type { NoteConfig } from '../types/notes';
import { DEFAULT_NOTES_CONFIG } from '../types/notes';
import { getInitialQuotationData } from '@/utils/quotationInitialData';

type Tab = 'quotation' | 'confirmation';

interface QuotationState {
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
  
  // 业务 Actions
  updateItems: (items: LineItem[]) => void;
  updateOtherFees: (fees: OtherFee[]) => void;
  updateData: (updates: Partial<QuotationData>) => void;
  
  // 新增：Notes配置相关actions
  setNotesConfig: (config: NoteConfig[]) => void;
  updateNoteVisibility: (id: string, visible: boolean) => void;
  updateNoteOrder: (fromIndex: number, toIndex: number) => void;
  updateNoteContent: (noteId: string, content: string) => void;
  addNote: () => void;
  removeNote: (noteId: string) => void;
}

export const useQuotationStore = create<QuotationState>((set) => ({
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
