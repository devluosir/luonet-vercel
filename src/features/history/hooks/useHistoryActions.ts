import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useHistoryStore } from '../state/history.store';
import { HistoryService } from '../services/history.service';
import type { HistoryType, HistoryItem } from '../types';

export function useHistoryActions() {
  const router = useRouter();
  const {
    setActiveTab,
    setShowExportModal,
    setShowImportModal,
    setShowDeleteConfirm,
    setShowPreview,
    setDeleteConfirmId,
    setPreviewItem,
    setIsDeleting,
    clearSelectedItems,
    setRefreshKey,
  } = useHistoryStore();

  // 编辑操作
  const handleEdit = useCallback((id: string) => {
    const activeTab = useHistoryStore.getState().activeTab;
    let path = '';
    
    switch (activeTab) {
      case 'quotation':
        path = `/quotation/edit/${id}`;
        break;
      case 'confirmation':
        path = `/quotation/edit/${id}?tab=confirmation`;
        break;
      case 'invoice':
        path = `/invoice/edit/${id}`;
        break;
      case 'purchase':
        path = `/purchase/edit/${id}`;
        break;
      case 'packing':
        path = `/packing/edit/${id}`;
        break;
    }
    
    if (path) {
      router.push(path);
    }
  }, [router]);

  // 复制操作
  const handleCopy = useCallback((id: string) => {
    const activeTab = useHistoryStore.getState().activeTab;
    let path = '';
    
    switch (activeTab) {
      case 'quotation':
        path = `/quotation/copy/${id}`;
        break;
      case 'confirmation':
        path = `/quotation/copy/${id}?tab=confirmation`;
        break;
      case 'invoice':
        path = `/invoice/copy/${id}`;
        break;
      case 'purchase':
        path = `/purchase/copy/${id}`;
        break;
      case 'packing':
        path = `/packing/copy/${id}`;
        break;
    }
    
    if (path) {
      router.push(path);
    }
  }, [router]);

  // 删除操作
  const handleDelete = useCallback((id: string) => {
    setDeleteConfirmId(id);
    setShowDeleteConfirm(true);
  }, [setDeleteConfirmId, setShowDeleteConfirm]);

  // 确认删除
  const handleConfirmDelete = useCallback(async () => {
    const state = useHistoryStore.getState();
    const { activeTab, deleteConfirmId } = state;
    
    if (!deleteConfirmId) return;
    
    setIsDeleting(true);
    try {
      HistoryService.deleteHistory(activeTab, deleteConfirmId);
      setRefreshKey(state.refreshKey + 1);
      clearSelectedItems();
    } catch (error) {
      console.error('删除失败:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmId(null);
    }
  }, [setIsDeleting, setRefreshKey, clearSelectedItems, setShowDeleteConfirm, setDeleteConfirmId]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    const state = useHistoryStore.getState();
    const { activeTab, selectedItems } = state;
    
    if (selectedItems.size === 0) return;
    
    setIsDeleting(true);
    try {
      HistoryService.deleteMultipleHistory(activeTab, Array.from(selectedItems));
      setRefreshKey(state.refreshKey + 1);
      clearSelectedItems();
    } catch (error) {
      console.error('批量删除失败:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [setIsDeleting, setRefreshKey, clearSelectedItems]);

  // 预览操作
  const handlePreview = useCallback((item: HistoryItem) => {
    setPreviewItem(item);
    setShowPreview(true);
  }, [setPreviewItem, setShowPreview]);

  // 转换操作（仅用于confirmation）
  const handleConvert = useCallback((id: string) => {
    router.push(`/quotation/edit/${id}?tab=quotation`);
  }, [router]);

  // 导出操作
  const handleExport = useCallback(() => {
    setShowExportModal(true);
  }, [setShowExportModal]);

  // 导入操作
  const handleImport = useCallback(() => {
    setShowImportModal(true);
  }, [setShowImportModal]);

  // 刷新操作
  const handleRefresh = useCallback(() => {
    const state = useHistoryStore.getState();
    setRefreshKey(state.refreshKey + 1);
  }, [setRefreshKey]);

  // 标签页切换
  const handleTabChange = useCallback((tab: HistoryType) => {
    setActiveTab(tab);
    clearSelectedItems();
  }, [setActiveTab, clearSelectedItems]);

  return {
    handleEdit,
    handleCopy,
    handleDelete,
    handleConfirmDelete,
    handleBatchDelete,
    handlePreview,
    handleConvert,
    handleExport,
    handleImport,
    handleRefresh,
    handleTabChange,
  };
}
