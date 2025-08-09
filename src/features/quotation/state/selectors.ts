import type { QuotationState } from './useQuotationStore';
import { shallow } from 'zustand/shallow';

/**
 * 统一的选择器工具带
 * 避免到处写匿名函数，提供类型安全的选择器
 * 
 * @example
 * // ✅ 推荐用法
 * const tab = useQuotationStore(sel.tab);
 * const data = useQuotationStore(sel.data, shallow);
 * 
 * // ❌ 禁止用法（应该统一使用sel.*）
 * const tab = useQuotationStore(s => s.tab);
 */
export const sel = {
  // 状态选择器
  tab: (s: QuotationState) => s.tab,
  data: (s: QuotationState) => s.data,
  editId: (s: QuotationState) => s.editId,
  isGenerating: (s: QuotationState) => s.isGenerating,
  generatingProgress: (s: QuotationState) => s.generatingProgress,
  isPreviewing: (s: QuotationState) => s.isPreviewing,
  previewProgress: (s: QuotationState) => s.previewProgress,
  showSettings: (s: QuotationState) => s.showSettings,
  showPreview: (s: QuotationState) => s.showPreview,
  isPasteDialogOpen: (s: QuotationState) => s.isPasteDialogOpen,
  previewItem: (s: QuotationState) => s.previewItem,
  notesConfig: (s: QuotationState) => s.notesConfig,
  compactMode: (s: QuotationState) => s.compactMode,
  
  // 数据子字段选择器（优先使用这些而不是整块data）
  currency: (s: QuotationState) => s.data.currency,
  from: (s: QuotationState) => s.data.from,
  to: (s: QuotationState) => s.data.to,
  quotationNo: (s: QuotationState) => s.data.quotationNo,
  contractNo: (s: QuotationState) => s.data.contractNo,
  date: (s: QuotationState) => s.data.date,
  inquiryNo: (s: QuotationState) => s.data.inquiryNo,
  items: (s: QuotationState) => s.data.items,
  otherFees: (s: QuotationState) => s.data.otherFees,
  notes: (s: QuotationState) => s.data.notes,
  
  // 派生选择器（缓存计算结果）
  itemsTotal: (s: QuotationState) => s.data.items?.reduce((sum, item) => sum + item.amount, 0) || 0,
  feesTotal: (s: QuotationState) => s.data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0,
  
  // Action选择器
  setTab: (s: QuotationState) => s.setTab,
  setEditId: (s: QuotationState) => s.setEditId,
  setGenerating: (s: QuotationState) => s.setGenerating,
  setProgress: (s: QuotationState) => s.setProgress,
  setPreviewing: (s: QuotationState) => s.setPreviewing,
  setPreviewProgress: (s: QuotationState) => s.setPreviewProgress,
  setShowSettings: (s: QuotationState) => s.setShowSettings,
  setShowPreview: (s: QuotationState) => s.setShowPreview,
  setPasteDialogOpen: (s: QuotationState) => s.setPasteDialogOpen,
  setPreviewItem: (s: QuotationState) => s.setPreviewItem,
  setCompactMode: (s: QuotationState) => s.setCompactMode,
  updateItems: (s: QuotationState) => s.updateItems,
  updateOtherFees: (s: QuotationState) => s.updateOtherFees,
  updateData: (s: QuotationState) => s.updateData,
  updateFrom: (s: QuotationState) => s.updateFrom,
  updateCurrency: (s: QuotationState) => s.updateCurrency,
} as const;

// 导出浅比较工具
export { shallow };
