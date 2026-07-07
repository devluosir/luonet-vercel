import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useHistoryStore } from '../state/history.store';
import { HistoryService } from '../services/history.service';
import type { HistoryType, HistoryItem } from '../types';
import { convertConfirmationToPacking, hasMergedCells, getMergedCellsInfo } from '@/utils/convertConfirmationToPacking';
import { savePackingHistory } from '@/utils/packingHistory';
import { getQuotationHistory } from '@/utils/quotationHistory';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
export function useHistoryActions() {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
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
      case 'domestic':
      case 'domestic-contract':
        path = `/quotation/edit/${id}?tab=domestic`;
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
      case 'domestic':
      case 'domestic-contract':
        path = `/quotation/copy/${id}?tab=domestic`;
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

  // 转换操作（仅用于confirmation转换为packing）
  const handleConvert = useCallback(async (id: string) => {
    try {
      // 获取并验证订单确认记录
      const confirmationItem = getQuotationHistory().find(item => item.id === id && item.type === 'confirmation');
      if (!confirmationItem) {
        throw new Error('未找到订单确认记录');
      }

      // 检查合并单元格并获取用户确认
      const hasMerged = hasMergedCells(confirmationItem.data);
      if (hasMerged) {
        const mergedInfo = getMergedCellsInfo(confirmationItem.data);
        const confirmMessage =
          `此订单确认包含${mergedInfo}。\n\n` +
          '这些合并信息将被转换为装箱单的对应字段：\n' +
          '- Part Name 和 Description 将合并到 Description 列\n\n' +
          '是否继续转换？';

        const confirmed = await confirm({
          title: '转换订单确认',
          description: confirmMessage,
          confirmLabel: '继续转换',
        });
        if (!confirmed) {
          return;
        }
      }

      // 执行转换
      const packingData = convertConfirmationToPacking(confirmationItem.data);

      // 保存到历史记录
      const newPackingHistory = savePackingHistory(packingData);
      if (!newPackingHistory) {
        throw new Error('保存装箱单失败');
      }

      // 转换成功，直接跳转到编辑页面
      router.push(`/packing/edit/${newPackingHistory.id}`);

    } catch (error) {
      console.error('转换订单确认为装箱单时出错:', error);
      showToast('转换失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
    }
  }, [router, confirm, showToast]);

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
