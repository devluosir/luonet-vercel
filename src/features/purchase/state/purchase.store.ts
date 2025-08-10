import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import type { PurchaseOrderData } from '@/types/purchase';

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
  // 数据状态
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
  
  // 操作方法
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
  init: (data?: Partial<PurchaseOrderData>) => void;
  reset: () => void;
  toggleSettings: () => void;
  toggleBank: () => void;
  changeCurrency: (currency: 'CNY' | 'USD' | 'EUR') => void;
}

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      // 初始状态
      data: defaultData,
      isGenerating: false,
      showSettings: false,
      editId: undefined,
      showPreview: false,
      generatingProgress: 0,
      isEditMode: false,
      previewItem: null,
      
      // 基础设置方法
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
      init: (data) => set({ 
        data: { ...defaultData, ...data },
        isEditMode: !!data
      }),
      
      reset: () => set({
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
        data: { ...state.data, currency }
      })),
    }),
    {
      name: 'purchase-draft-v4',
      version: 4,
      partialize: (state) => ({ data: state.data }),
    }
  )
);
