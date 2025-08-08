import { create } from 'zustand';
import type { QuotationData, LineItem, OtherFee } from '@/types/quotation';

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
}

export const useQuotationStore = create<QuotationState>((set, get) => ({
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
}));
