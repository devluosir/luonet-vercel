// 类型导出
export type {
  HistoryType,
  HistoryItem,
  QuotationHistory,
  PurchaseHistory,
  InvoiceHistory,
  PackingHistory,
  SortConfig,
  Filters,
  TabConfig,
  HistoryCallbacks,
} from './types';

// 状态管理导出
export { useHistoryStore, getAvailableTabs } from './state/history.store';
export {
  useHistoryMounted,
  useHistoryActiveTab,
  useHistoryRefreshKey,
  useHistoryUIState,
  useHistoryShowExportModal,
  useHistoryShowImportModal,
  useHistoryShowDeleteConfirm,
  useHistoryShowFilters,
  useHistoryShowPreview,
  useHistoryDataState,
  useHistoryDeleteConfirmId,
  useHistoryPreviewItem,
  useHistoryIsDeleting,
  useHistoryFilters,
  useHistorySortConfig,
  useHistorySelectedItems,
  useHistorySelectedCount,
  useHistoryIsSelected,
  useHistoryTabState,
  useHistoryFilterState,
  useHistorySelectionState,
  useHistoryModalState,
} from './state/history.selectors';

// 服务层导出
export { HistoryService } from './services/history.service';

// Hooks导出
export { useHistoryActions } from './hooks/useHistoryActions';
export { useHistoryTabCount } from './hooks/useHistoryTabCount';

// 组件导出
export { HistoryPage } from './app/HistoryPage';
export { HistoryHeader } from './components/HistoryHeader';
export { HistoryFilters } from './components/HistoryFilters';
export { HistoryTabs } from './components/HistoryTabs';
