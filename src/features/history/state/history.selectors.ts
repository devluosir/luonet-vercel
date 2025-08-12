import { useHistoryStore } from './history.store';

// 基础状态选择器
export const useHistoryMounted = () => useHistoryStore(s => s.mounted);
export const useHistoryActiveTab = () => useHistoryStore(s => s.activeTab);
export const useHistoryRefreshKey = () => useHistoryStore(s => s.refreshKey);

// UI状态选择器
export const useHistoryUIState = () => useHistoryStore(s => ({
  showExportModal: s.showExportModal,
  showImportModal: s.showImportModal,
  showDeleteConfirm: s.showDeleteConfirm,
  showFilters: s.showFilters,
  showPreview: s.showPreview,
}));

export const useHistoryShowExportModal = () => useHistoryStore(s => s.showExportModal);
export const useHistoryShowImportModal = () => useHistoryStore(s => s.showImportModal);
export const useHistoryShowDeleteConfirm = () => useHistoryStore(s => s.showDeleteConfirm);
export const useHistoryShowFilters = () => useHistoryStore(s => s.showFilters);
export const useHistoryShowPreview = () => useHistoryStore(s => s.showPreview);

// 数据状态选择器
export const useHistoryDataState = () => useHistoryStore(s => ({
  deleteConfirmId: s.deleteConfirmId,
  previewItem: s.previewItem,
  isDeleting: s.isDeleting,
}));

export const useHistoryDeleteConfirmId = () => useHistoryStore(s => s.deleteConfirmId);
export const useHistoryPreviewItem = () => useHistoryStore(s => s.previewItem);
export const useHistoryIsDeleting = () => useHistoryStore(s => s.isDeleting);

// 筛选和排序选择器
export const useHistoryFilters = () => useHistoryStore(s => s.filters);
export const useHistorySortConfig = () => useHistoryStore(s => s.sortConfig);

// 选择状态选择器
export const useHistorySelectedItems = () => useHistoryStore(s => s.selectedItems);
export const useHistorySelectedCount = () => useHistoryStore(s => s.selectedItems.size);
export const useHistoryIsSelected = (id: string) => useHistoryStore(s => s.selectedItems.has(id));

// Actions选择器
export const useHistoryActions = () => useHistoryStore(s => ({
  setMounted: s.setMounted,
  setActiveTab: s.setActiveTab,
  setRefreshKey: s.setRefreshKey,
  setShowExportModal: s.setShowExportModal,
  setShowImportModal: s.setShowImportModal,
  setShowDeleteConfirm: s.setShowDeleteConfirm,
  setShowFilters: s.setShowFilters,
  setShowPreview: s.setShowPreview,
  setDeleteConfirmId: s.setDeleteConfirmId,
  setPreviewItem: s.setPreviewItem,
  setIsDeleting: s.setIsDeleting,
  setFilters: s.setFilters,
  resetFilters: s.resetFilters,
  setSortConfig: s.setSortConfig,
  toggleSort: s.toggleSort,
  setSelectedItems: s.setSelectedItems,
  addSelectedItem: s.addSelectedItem,
  removeSelectedItem: s.removeSelectedItem,
  clearSelectedItems: s.clearSelectedItems,
  toggleSelectedItem: s.toggleSelectedItem,
  reset: s.reset,
}));

// 复合选择器
export const useHistoryTabState = () => useHistoryStore(s => ({
  activeTab: s.activeTab,
  setActiveTab: s.setActiveTab,
}));

export const useHistoryFilterState = () => useHistoryStore(s => ({
  filters: s.filters,
  sortConfig: s.sortConfig,
  setFilters: s.setFilters,
  resetFilters: s.resetFilters,
  setSortConfig: s.setSortConfig,
  toggleSort: s.toggleSort,
}));

export const useHistorySelectionState = () => useHistoryStore(s => ({
  selectedItems: s.selectedItems,
  selectedCount: s.selectedItems.size,
  setSelectedItems: s.setSelectedItems,
  addSelectedItem: s.addSelectedItem,
  removeSelectedItem: s.removeSelectedItem,
  clearSelectedItems: s.clearSelectedItems,
  toggleSelectedItem: s.toggleSelectedItem,
}));

export const useHistoryModalState = () => useHistoryStore(s => ({
  showExportModal: s.showExportModal,
  showImportModal: s.showImportModal,
  showDeleteConfirm: s.showDeleteConfirm,
  showPreview: s.showPreview,
  setShowExportModal: s.setShowExportModal,
  setShowImportModal: s.setShowImportModal,
  setShowDeleteConfirm: s.setShowDeleteConfirm,
  setShowPreview: s.setShowPreview,
}));
