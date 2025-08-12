import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import type { PurchaseOrderData } from '@/types/purchase';
import type { PurchaseDraft, PurchaseItem } from '../utils/types';
import { getLocalStorageJSON, getLocalStorageString } from '@/utils/safeLocalStorage';

// 获取用户名的函数，与报价页面保持一致
function getUsername(): string {
  // 在服务器端渲染时，返回默认值避免水合错误
  if (typeof window === 'undefined') {
    return 'Roger';
  }
  
  try {
    console.log('[PurchaseStore] 开始获取用户名...');
    
    const userInfo = getLocalStorageJSON('userInfo', null) as { username?: string } | null;
    console.log('[PurchaseStore] userInfo:', userInfo);
    
    if (userInfo) {
      console.log('[PurchaseStore] 从userInfo获取用户名:', userInfo.username);
      return userInfo.username || 'Roger';
    }
    
    // 使用安全的字符串获取函数
    const name = getLocalStorageString('username');
    console.log('[PurchaseStore] username from localStorage:', name);
    
    if (name) {
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      console.log('[PurchaseStore] 格式化后的用户名:', formattedName);
      return formattedName;
    }
    
    console.log('[PurchaseStore] 使用默认用户名: Roger');
    return 'Roger';
  } catch (error) { 
    console.error('[PurchaseStore] 获取用户名失败:', error);
    return 'Roger' 
  }
}

// 获取默认数据的函数，动态获取用户名
function getDefaultData(): PurchaseOrderData {
  // 在服务器端渲染时，使用固定的默认日期避免水合错误
  const defaultDate = typeof window === 'undefined' ? '2024-01-01' : format(new Date(), 'yyyy-MM-dd');
  
  return {
    attn: '',
    ourRef: '',
    yourRef: '',
    orderNo: '',
    date: defaultDate,
    supplierQuoteDate: defaultDate,
    contractAmount: '',
    projectSpecification: '',
    paymentTerms: '交货后30天',
    invoiceRequirements: '如前；',
    deliveryInfo: '',
    orderNumbers: '',
    showStamp: false,
    showBank: false,
    currency: 'USD',
    stampType: 'none',
    from: getUsername(),
  };
}

// 获取默认Draft数据的函数，动态获取用户名
function getDefaultDraft(): PurchaseDraft {
  // 在服务器端渲染时，使用固定的默认日期避免水合错误
  const defaultDate = typeof window === 'undefined' ? '2024-01-01' : format(new Date(), 'yyyy-MM-dd');
  
  return {
    supplier: {
      name: '',
      attn: ''
    },
    bank: {},
    settings: {
      poNo: '',
      currency: 'USD',
      date: defaultDate,
      purchaser: getUsername()
    },
    items: [],
    notes: ''
  };
}

// 移除静态的默认数据，改为在store初始化时动态创建

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
  pageMode: 'create' | 'edit' | 'copy';
  
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
  setPageMode: (mode: 'create' | 'edit' | 'copy') => void;
  
  // 业务方法
  init: (data?: Partial<PurchaseOrderData> | Partial<PurchaseDraft>) => void;
  reset: () => void;
  toggleSettings: () => void;
  toggleBank: () => void;
  changeCurrency: (currency: 'CNY' | 'USD' | 'EUR') => void;
  forceReinitialize: () => void;
  updateFromField: () => void;
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

export const usePurchaseStore = create<PurchaseState>()((set, get) => {
  console.log('[PurchaseStore] Store正在初始化...');
  
  return {
    // 初始状态 - 动态获取默认数据
    draft: getDefaultDraft(),
    data: getDefaultData(),
    isGenerating: false,
    showSettings: false,
    editId: undefined,
    showPreview: false,
    generatingProgress: 0,
    isEditMode: false,
    pageMode: 'create' as const,
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
      setPageMode: (pageMode) => set({ pageMode }),
      
      // 业务方法
      init: (data) => {
        if (data && 'supplier' in data) {
          // 新格式 PurchaseDraft
          set({ 
            draft: { ...getDefaultDraft(), ...data },
            isEditMode: !!data,
            pageMode: 'create'
          });
        } else if (data) {
          // 旧格式 PurchaseOrderData
          const draft = convertToDraft({ ...getDefaultData(), ...data });
          set({ 
            draft,
            data: { ...getDefaultData(), ...data },
            isEditMode: !!data,
            pageMode: 'create'
          });
        } else {
          // 默认数据
          set({ 
            draft: getDefaultDraft(),
            data: getDefaultData(),
            isEditMode: false,
            pageMode: 'create'
          });
        }
      },
      
      reset: () => set({
        draft: getDefaultDraft(),
        data: getDefaultData(),
        isGenerating: false,
        showSettings: false,
        editId: undefined,
        showPreview: false,
        generatingProgress: 0,
        isEditMode: false,
        pageMode: 'create',
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
      
      // 强制重新初始化数据
      forceReinitialize: () => set((state) => {
        const newData = getDefaultData();
        const newDraft = getDefaultDraft();
        return {
          data: newData,
          draft: newDraft
        };
      }),
      
      // 更新from字段为当前用户
      updateFromField: () => set((state) => {
        if (typeof window === 'undefined') return state;
        
        try {
          const userInfo = getLocalStorageJSON('userInfo', null) as { username?: string } | null;
          const currentUser = userInfo?.username || getLocalStorageString('username');
          
          if (currentUser && currentUser.toLowerCase() !== 'roger') {
            const formattedUser = currentUser.charAt(0).toUpperCase() + currentUser.slice(1).toLowerCase();
            return {
              data: { ...state.data, from: formattedUser },
              draft: { 
                ...state.draft, 
                settings: { ...state.draft.settings, purchaser: formattedUser }
              }
            };
          }
        } catch (error) {
          console.warn('[PurchaseStore] 更新from字段失败:', error);
        }
        
        return state;
      }),
    };
  });
