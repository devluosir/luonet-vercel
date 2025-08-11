import { create } from 'zustand';
import { InvoiceData, InvoiceFormState, InvoiceFormActions } from '../types';
import { DEFAULT_INVOICE_DATA } from '../constants/settings';
import { InvoiceService } from '../services/invoice.service';
import { calculateAmount, processUnitPlural } from '../utils/calculations';

interface InvoiceStore extends InvoiceFormState, InvoiceFormActions {
  // 初始化状态
  initialize: (initialData?: InvoiceData) => void;
  
  // 重置状态
  reset: () => void;
  
  // 保存发票
  saveInvoice: () => Promise<{ success: boolean; message: string }>;
  
  // 生成PDF
  generatePDF: () => Promise<void>;
  
  // 处理粘贴导入
  handlePasteImport: (text: string) => void;
  
  // 处理双击高亮
  handleDoubleClick: (index: number, field: keyof Exclude<InvoiceData['items'][0]['highlight'], undefined>) => void;
  
  // 处理其他费用双击高亮
  handleOtherFeeDoubleClick: (index: number, field: 'description' | 'amount') => void;
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  // 初始状态
  data: DEFAULT_INVOICE_DATA,
  isEditMode: false,
  editId: null,
  isSaving: false,
  saveSuccess: false,
  saveMessage: '',
  showSettings: false,
  showPreview: false,
  previewItem: null,
  customUnit: '',
  showUnitSuccess: false,
  focusedCell: null,

  // 初始化
  initialize: (initialData) => {
    set({
      data: initialData || DEFAULT_INVOICE_DATA,
      isEditMode: !!initialData,
      editId: null,
      showSettings: false,
      showPreview: false,
      previewItem: null,
      customUnit: '',
      showUnitSuccess: false,
      focusedCell: null
    });
  },

  // 重置
  reset: () => {
    set({
      data: DEFAULT_INVOICE_DATA,
      isEditMode: false,
      editId: null,
      showSettings: false,
      showPreview: false,
      previewItem: null,
      customUnit: '',
      showUnitSuccess: false,
      focusedCell: null
    });
  },

  // 更新数据
  updateData: (updates) => {
    set((state) => ({
      data: { ...state.data, ...updates }
    }));
  },

  // 更新商品行项目
  updateLineItem: (index, field, value) => {
    set((state) => {
      const newItems = [...state.data.items];
      const item = { ...newItems[index] };
      
      if (field === 'quantity') {
        const quantity = Number(value);
        item.unit = processUnitPlural(quantity, item.unit, state.data.customUnits || []);
      }
      
      if (field !== 'highlight') {
        (item as any)[field] = value;
      }
      
      if (field === 'quantity' || field === 'unitPrice') {
        item.amount = calculateAmount(
          field === 'quantity' ? Number(value) : item.quantity,
          field === 'unitPrice' ? Number(value) : item.unitPrice
        );
      }
      
      newItems[index] = item;
      return { data: { ...state.data, items: newItems } };
    });
  },

  // 添加商品行
  addLineItem: () => {
    set((state) => {
      const newItems = [...state.data.items, {
        lineNo: state.data.items.length + 1,
        hsCode: '',
        partname: '',
        description: '',
        quantity: 0,
        unit: 'pc',
        unitPrice: 0,
        amount: 0,
        highlight: {}
      }];
      return { data: { ...state.data, items: newItems } };
    });
  },

  // 删除商品行
  removeLineItem: (index) => {
    set((state) => {
      const newItems = state.data.items
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, lineNo: i + 1 }));
      return { data: { ...state.data, items: newItems } };
    });
  },

  // 添加其他费用
  addOtherFee: () => {
    set((state) => {
      const newFees = [...(state.data.otherFees || []), {
        id: Date.now(),
        description: '',
        amount: 0
      }];
      return { data: { ...state.data, otherFees: newFees } };
    });
  },

  // 删除其他费用
  removeOtherFee: (id) => {
    set((state) => {
      const newFees = state.data.otherFees?.filter(f => f.id !== id) || [];
      return { data: { ...state.data, otherFees: newFees } };
    });
  },

  // 更新其他费用
  updateOtherFee: (id, field, value) => {
    set((state) => {
      const newFees = state.data.otherFees?.map(fee => 
        fee.id === id ? { ...fee, [field]: value } : fee
      ) || [];
      return { data: { ...state.data, otherFees: newFees } };
    });
  },

  // 添加自定义单位
  addCustomUnit: (unit) => {
    set((state) => {
      if (unit && !(state.data.customUnits || []).includes(unit)) {
        const newCustomUnits = [...(state.data.customUnits || []), unit];
        set({ 
          data: { ...state.data, customUnits: newCustomUnits },
          customUnit: '',
          showUnitSuccess: true
        });
        
        // 2秒后隐藏成功消息
        setTimeout(() => set({ showUnitSuccess: false }), 2000);
      }
    });
  },

  // 删除自定义单位
  removeCustomUnit: (index) => {
    set((state) => {
      const newUnits = (state.data.customUnits || []).filter((_, i) => i !== index);
      return { data: { ...state.data, customUnits: newUnits } };
    });
  },

  // 设置焦点单元格
  setFocusedCell: (cell) => {
    set({ focusedCell: cell });
  },

  // 切换设置面板
  toggleSettings: () => {
    set((state) => ({ showSettings: !state.showSettings }));
  },

  // 切换预览
  togglePreview: () => {
    set((state) => ({ showPreview: !state.showPreview }));
  },

  // 设置预览项目
  setPreviewItem: (item) => {
    set({ previewItem: item });
  },

  // 保存发票
  saveInvoice: async () => {
    const state = get();
    const validation = InvoiceService.validateInvoiceData(state.data);
    
    if (!validation.isValid) {
      set({ 
        saveSuccess: false, 
        saveMessage: validation.errors[0] 
      });
      setTimeout(() => set({ saveMessage: '' }), 2000);
      return { success: false, message: validation.errors[0] };
    }

    set({ isSaving: true });
    
    try {
      const result = await InvoiceService.saveInvoice(
        state.data,
        state.isEditMode,
        state.editId
      );
      
      if (result.success) {
        set({ 
          saveSuccess: true, 
          saveMessage: result.message,
          isEditMode: true,
          editId: result.newEditId || state.editId
        });
      } else {
        set({ 
          saveSuccess: false, 
          saveMessage: result.message 
        });
      }
      
      setTimeout(() => set({ saveMessage: '' }), 2000);
      return result;
    } catch (error) {
      set({ 
        saveSuccess: false, 
        saveMessage: '保存失败' 
      });
      setTimeout(() => set({ saveMessage: '' }), 2000);
      return { success: false, message: '保存失败' };
    } finally {
      set({ isSaving: false });
    }
  },

  // 生成PDF
  generatePDF: async () => {
    const state = get();
    try {
      await InvoiceService.downloadPDF(state.data);
      InvoiceService.recordCustomerUsage(state.data);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  },

  // 处理粘贴导入
  handlePasteImport: (text) => {
    import('../utils/importUtils').then(({ parsePastedData, processQuotationData }) => {
      const newItems = parsePastedData(text);
      const processedItems = processQuotationData(newItems);
      
      set((state) => ({
        data: { ...state.data, items: processedItems }
      }));
    });
  },

  // 处理双击高亮
  handleDoubleClick: (index, field) => {
    set((state) => {
      const newItems = [...state.data.items];
      newItems[index] = {
        ...newItems[index],
        highlight: {
          ...newItems[index].highlight,
          [field]: !newItems[index].highlight?.[field]
        }
      };
      return { data: { ...state.data, items: newItems } };
    });
  },

  // 处理其他费用双击高亮
  handleOtherFeeDoubleClick: (index, field) => {
    set((state) => {
      const newFees = [...(state.data.otherFees || [])];
      newFees[index] = {
        ...newFees[index],
        highlight: {
          ...newFees[index].highlight,
          [field]: !newFees[index].highlight?.[field]
        }
      };
      return { data: { ...state.data, otherFees: newFees } };
    });
  }
}));
