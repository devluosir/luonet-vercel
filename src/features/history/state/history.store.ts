import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  HistoryType, 
  HistoryItem, 
  Filters, 
  SortConfig, 
  TabConfig 
} from '../types';
import { 
  FileText, 
  Receipt, 
  ShoppingCart, 
  Package 
} from 'lucide-react';

// 状态接口
interface HistoryState {
  // 基础状态
  mounted: boolean;
  activeTab: HistoryType;
  refreshKey: number;
  
  // UI状态
  showExportModal: boolean;
  showImportModal: boolean;
  showDeleteConfirm: boolean;
  showFilters: boolean;
  showPreview: boolean;
  
  // 数据状态
  deleteConfirmId: string | null;
  previewItem: HistoryItem | null;
  isDeleting: boolean;
  
  // 筛选和排序状态
  filters: Filters;
  sortConfig: SortConfig;
  
  // 选择状态
  selectedItems: Set<string>;
  
  // Actions
  setMounted: (mounted: boolean) => void;
  setActiveTab: (tab: HistoryType) => void;
  setRefreshKey: (key: number) => void;
  
  // UI Actions
  setShowExportModal: (show: boolean) => void;
  setShowImportModal: (show: boolean) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  setShowFilters: (show: boolean) => void;
  setShowPreview: (show: boolean) => void;
  
  // Data Actions
  setDeleteConfirmId: (id: string | null) => void;
  setPreviewItem: (item: HistoryItem | null) => void;
  setIsDeleting: (deleting: boolean) => void;
  
  // Filter Actions
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  
  // Sort Actions
  setSortConfig: (config: SortConfig) => void;
  toggleSort: (key: string) => void;
  
  // Selection Actions
  setSelectedItems: (items: Set<string>) => void;
  addSelectedItem: (id: string) => void;
  removeSelectedItem: (id: string) => void;
  clearSelectedItems: () => void;
  toggleSelectedItem: (id: string) => void;
  
  // Utility Actions
  reset: () => void;
}

// 初始状态
const initialState = {
  mounted: false,
  activeTab: 'quotation' as HistoryType,
  refreshKey: 0,
  
  showExportModal: false,
  showImportModal: false,
  showDeleteConfirm: false,
  showFilters: false,
  showPreview: false,
  
  deleteConfirmId: null,
  previewItem: null,
  isDeleting: false,
  
  filters: {
    search: '',
    type: 'all' as const,
    dateRange: 'all' as const,
  },
  
  sortConfig: {
    key: 'updatedAt',
    direction: 'desc' as const,
  },
  
  selectedItems: new Set<string>(),
};

// 创建Store
export const useHistoryStore = create<HistoryState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // 基础状态Actions
    setMounted: (mounted) => set({ mounted }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setRefreshKey: (refreshKey) => set({ refreshKey }),
    
    // UI Actions
    setShowExportModal: (showExportModal) => set({ showExportModal }),
    setShowImportModal: (showImportModal) => set({ showImportModal }),
    setShowDeleteConfirm: (showDeleteConfirm) => set({ showDeleteConfirm }),
    setShowFilters: (showFilters) => set({ showFilters }),
    setShowPreview: (showPreview) => set({ showPreview }),
    
    // Data Actions
    setDeleteConfirmId: (deleteConfirmId) => set({ deleteConfirmId }),
    setPreviewItem: (previewItem) => set({ previewItem }),
    setIsDeleting: (isDeleting) => set({ isDeleting }),
    
    // Filter Actions
    setFilters: (newFilters) => set((state) => ({
      filters: { ...state.filters, ...newFilters }
    })),
    resetFilters: () => set({ filters: initialState.filters }),
    
    // Sort Actions
    setSortConfig: (sortConfig) => set({ sortConfig }),
    toggleSort: (key) => set((state) => ({
      sortConfig: {
        key,
        direction: state.sortConfig.key === key && state.sortConfig.direction === 'asc' ? 'desc' : 'asc'
      }
    })),
    
    // Selection Actions
    setSelectedItems: (selectedItems) => set({ selectedItems }),
    addSelectedItem: (id) => set((state) => {
      const newSelected = new Set(state.selectedItems);
      newSelected.add(id);
      return { selectedItems: newSelected };
    }),
    removeSelectedItem: (id) => set((state) => {
      const newSelected = new Set(state.selectedItems);
      newSelected.delete(id);
      return { selectedItems: newSelected };
    }),
    clearSelectedItems: () => set({ selectedItems: new Set() }),
    toggleSelectedItem: (id) => set((state) => {
      const newSelected = new Set(state.selectedItems);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedItems: newSelected };
    }),
    
    // Utility Actions
    reset: () => set(initialState),
  }))
);

// 标签页配置
export const getAvailableTabs = (): TabConfig[] => {
  return [
    { id: 'quotation', name: '报价单', shortName: '报价', icon: FileText },
    { id: 'confirmation', name: '合同确认', shortName: '合同', icon: FileText },
    { id: 'packing', name: '装箱单', shortName: '装箱', icon: Package },
    { id: 'invoice', name: '发票', shortName: '发票', icon: Receipt },
    { id: 'purchase', name: '采购单', shortName: '采购', icon: ShoppingCart },
  ];
};
