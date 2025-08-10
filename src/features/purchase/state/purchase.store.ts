import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import type { PurchaseOrderData } from '@/types/purchase';
import type { PurchaseDraft, PurchaseItem } from '../utils/types';

// 默认的 PurchaseDraft 数据
const defaultDraft: PurchaseDraft = {
  supplier: {
    name: '',
    attn: ''
  },
  bank: {},
  settings: {
    poNo: '',
    currency: 'USD',
    date: format(new Date(), 'yyyy-MM-dd'),
    purchaser: ''
  },
  items: [],
  notes: ''
};

// 默认的 PurchaseOrderData 数据（向后兼容）
const defaultData: PurchaseOrderData = {
  attn: '',
  ourRef: '',
  yourRef: '',
  orderNo: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  supplierQuoteDate: format(new Date(), 'yyyy-MM-dd'),
  contractAmount: '',
  projectSpecification: '',
  paymentTerms: '交货后30天',
  invoiceRequirements: '如前；',
  deliveryInfo: '',
  orderNumbers: '',
  showStamp: false,
  showBank: false,
  currency: 'CNY',
  stampType: 'none',
  from: '',
};

interface PurchaseState {
  // 数据状态 - 支持新格式
  draft: PurchaseDraft;
  // 数据状态 - 向后兼容
  data: PurchaseOrderData;
  isGenerating: boolean;
  showSettings: boolean;
  editId: string | undefined;
  showPreview: boolean;
  generatingProgress: number;
  isEditMode: boolean;
  
  // 预览数据
  previewItem: {
    id: string;
    createdAt: string;
    updatedAt: string;
    supplierName: string;
    orderNo: string;
    totalAmount: number;
    currency: string;
    data: PurchaseOrderData;
  } | null;
  
  // 操作方法 - 新格式
  setDraft: (draft: PurchaseDraft) => void;
  updateDraft: (updates: Partial<PurchaseDraft>) => void;
  addItem: (item: Partial<PurchaseItem>) => void;
  updateItem: (id: string, updates: Partial<PurchaseItem>) => void;
  removeItem: (id: string) => void;
  setField: (path: string, value: any) => void;
  
  // 操作方法 - 向后兼容
  setData: (data: PurchaseOrderData) => void;
  updateData: (updates: Partial<PurchaseOrderData>) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setShowSettings: (showSettings: boolean) => void;
  setEditId: (editId: string | undefined) => void;
  setShowPreview: (showPreview: boolean) => void;
  setGeneratingProgress: (progress: number) => void;
  setIsEditMode: (isEditMode: boolean) => void;
  setPreviewItem: (item: any) => void;
  
  // 业务方法
  init: (data?: Partial<PurchaseOrderData> | Partial<PurchaseDraft>) => void;
  reset: () => void;
  toggleSettings: () => void;
  toggleBank: () => void;
  changeCurrency: (currency: 'CNY' | 'USD' | 'EUR') => void;
}

// 工具函数：将 PurchaseOrderData 转换为 PurchaseDraft
function convertToDraft(data: PurchaseOrderData): PurchaseDraft {
  return {
    supplier: {
      name: data.attn || '',
      attn: data.attn || ''
    },
    bank: {},
    settings: {
      poNo: data.orderNo || '',
      currency: data.currency || 'USD',
      date: data.date || format(new Date(), 'yyyy-MM-dd'),
      purchaser: data.from || ''
    },
    items: [],
    notes: data.projectSpecification || ''
  };
}

// 工具函数：将 PurchaseDraft 转换为 PurchaseOrderData
function convertToOrderData(draft: PurchaseDraft): PurchaseOrderData {
  return {
    attn: draft.supplier?.attn || draft.supplier?.name || '',
    ourRef: '',
    yourRef: '',
    orderNo: draft.settings?.poNo || '',
    date: draft.settings?.date || format(new Date(), 'yyyy-MM-dd'),
    supplierQuoteDate: format(new Date(), 'yyyy-MM-dd'),
    contractAmount: draft.items?.reduce((sum, item) => sum + (item.qty * item.price), 0).toString() || '',
    projectSpecification: draft.notes || '',
    paymentTerms: '交货后30天',
    invoiceRequirements: '如前；',
    deliveryInfo: '',
    orderNumbers: '',
    showStamp: false,
    showBank: false,
    currency: (draft.settings?.currency as 'USD' | 'EUR' | 'CNY') || 'USD',
    stampType: 'none',
    from: draft.settings?.purchaser || ''
  };
}

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      // 初始状态
      draft: defaultDraft,
      data: defaultData,
      isGenerating: false,
      showSettings: false,
      editId: undefined,
      showPreview: false,
      generatingProgress: 0,
      isEditMode: false,
      previewItem: null,
      
      // 基础设置方法 - 新格式
      setDraft: (draft) => set({ draft }),
      updateDraft: (updates) => set((state) => ({ 
        draft: { ...state.draft, ...updates } 
      })),
      addItem: (item) => set((state) => ({
        draft: {
          ...state.draft,
          items: [...state.draft.items, { 
            id: Date.now().toString(), 
            name: '', 
            qty: 1, 
            price: 0,
            ...item 
          }]
        }
      })),
      updateItem: (id, updates) => set((state) => ({
        draft: {
          ...state.draft,
          items: state.draft.items.map(item => 
            item.id === id ? { ...item, ...updates } : item
          )
        }
      })),
      removeItem: (id) => set((state) => ({
        draft: {
          ...state.draft,
          items: state.draft.items.filter(item => item.id !== id)
        }
      })),
      setField: (path, value) => set((state) => {
        const pathParts = path.split('.');
        const newDraft = { ...state.draft };
        let current: any = newDraft;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          current = current[pathParts[i]];
        }
        current[pathParts[pathParts.length - 1]] = value;
        
        return { draft: newDraft };
      }),
      
      // 基础设置方法 - 向后兼容
      setData: (data) => set({ data }),
      updateData: (updates) => set((state) => ({ 
        data: { ...state.data, ...updates } 
      })),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setShowSettings: (showSettings) => set({ showSettings }),
      setEditId: (editId) => set({ editId }),
      setShowPreview: (showPreview) => set({ showPreview }),
      setGeneratingProgress: (generatingProgress) => set({ generatingProgress }),
      setIsEditMode: (isEditMode) => set({ isEditMode }),
      setPreviewItem: (previewItem) => set({ previewItem }),
      
      // 业务方法
      init: (data) => {
        if (data && 'supplier' in data) {
          // 新格式 PurchaseDraft
          set({ 
            draft: { ...defaultDraft, ...data },
            isEditMode: !!data
          });
        } else if (data) {
          // 旧格式 PurchaseOrderData
          const draft = convertToDraft({ ...defaultData, ...data });
          set({ 
            draft,
            data: { ...defaultData, ...data },
            isEditMode: !!data
          });
        } else {
          // 默认数据
          set({ 
            draft: defaultDraft,
            data: defaultData,
            isEditMode: false
          });
        }
      },
      
      reset: () => set({
        draft: defaultDraft,
        data: defaultData,
        isGenerating: false,
        showSettings: false,
        editId: undefined,
        showPreview: false,
        generatingProgress: 0,
        isEditMode: false,
        previewItem: null,
      }),
      
      toggleSettings: () => set((state) => ({ 
        showSettings: !state.showSettings 
      })),
      
      toggleBank: () => set((state) => {
        const newShowBank = !state.data.showBank;
        return {
          data: {
            ...state.data,
            showBank: newShowBank,
            invoiceRequirements: newShowBank ? '请在发票开具前与我司财务确认；' : '如前；',
          }
        };
      }),
      
      changeCurrency: (currency) => set((state) => ({
        data: { ...state.data, currency },
        draft: { ...state.draft, settings: { ...state.draft.settings, currency } }
      })),
    }),
    {
      name: 'purchase-draft-v5',
      version: 5,
      partialize: (state) => ({ 
        draft: state.draft,
        data: state.data 
      }),
    }
  )
);
