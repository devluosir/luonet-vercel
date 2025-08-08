import { useQuotationStore } from './useQuotationStore';

// 总金额计算
export const useTotalAmount = () =>
  useQuotationStore((state) => {
    const itemsTotal = state.data.items?.reduce((sum, item) => sum + item.amount, 0) || 0;
    const feesTotal = state.data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0;
    return itemsTotal + feesTotal;
  });

// 货币符号
export const useCurrencySymbol = () =>
  useQuotationStore((state) => {
    const currency = state.data.currency;
    return currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '¥';
  });

// 当前标签页
export const useActiveTab = () =>
  useQuotationStore((state) => state.tab);

// 数据状态
export const useQuotationData = () =>
  useQuotationStore((state) => state.data);

// 编辑ID
export const useEditId = () =>
  useQuotationStore((state) => state.editId);

// 生成状态
export const useGeneratingState = () =>
  useQuotationStore((state) => ({
    isGenerating: state.isGenerating,
    generatingProgress: state.generatingProgress,
  }));

// UI状态
export const useUIState = () =>
  useQuotationStore((state) => ({
    showSettings: state.showSettings,
    showPreview: state.showPreview,
    isPasteDialogOpen: state.isPasteDialogOpen,
    previewItem: state.previewItem,
  }));

// 获取所有actions
export const useQuotationActions = () =>
  useQuotationStore((state) => ({
    setTab: state.setTab,
    setData: state.setData,
    setEditId: state.setEditId,
    setGenerating: state.setGenerating,
    setProgress: state.setProgress,
    setShowSettings: state.setShowSettings,
    setShowPreview: state.setShowPreview,
    setPasteDialogOpen: state.setPasteDialogOpen,
    setPreviewItem: state.setPreviewItem,
    updateItems: state.updateItems,
    updateOtherFees: state.updateOtherFees,
    updateData: state.updateData,
  }));
