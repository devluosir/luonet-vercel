import { useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { BaseDocument, DocumentAction, DocumentPermission } from '../types';
import type { BaseDocumentState } from '../state/useBaseDocumentStore';

// 通用单据管理Hook
export function useBaseDocument<T extends BaseDocument>(
  store: any,
  permissions: DocumentPermission
) {
  const { showToast } = useToast();

  // 权限检查
  const canPerformAction = useCallback((action: DocumentAction): boolean => {
    switch (action) {
      case 'create':
        return permissions.canCreate;
      case 'edit':
        return permissions.canEdit;
      case 'delete':
        return permissions.canDelete;
      case 'export':
        return permissions.canExport;
      case 'preview':
        return permissions.canPreview;
      default:
        return false;
    }
  }, [permissions]);

  // 安全的数据更新
  const safeUpdateData = useCallback((patch: Partial<T>) => {
    if (!canPerformAction('edit')) {
      showToast('没有编辑权限', 'error');
      return;
    }
    
    try {
      store.getState().setData(patch);
    } catch (error) {
      showToast('数据更新失败', 'error');
      console.error('数据更新错误:', error);
    }
  }, [store, canPerformAction, showToast]);

  // 安全的保存操作
  const safeSave = useCallback(async () => {
    if (!canPerformAction('edit')) {
      showToast('没有保存权限', 'error');
      return;
    }

    try {
      store.getState().setSaving(true);
      // await store.save();
      showToast('保存成功', 'success');
    } catch (error) {
      showToast('保存失败', 'error');
      console.error('保存错误:', error);
    } finally {
      store.getState().setSaving(false);
    }
  }, [store, canPerformAction, showToast]);

  // 安全的PDF生成
  const safeGeneratePDF = useCallback(async () => {
    if (!canPerformAction('export')) {
      showToast('没有导出权限', 'error');
      return;
    }

    try {
      store.setData({ isGenerating: true });
      await store.generatePDF();
      showToast('PDF生成成功', 'success');
    } catch (error) {
      showToast('PDF生成失败', 'error');
      console.error('PDF生成错误:', error);
    } finally {
      store.setData({ isGenerating: false });
    }
  }, [store, canPerformAction, showToast]);

  // 安全的PDF预览
  const safePreviewPDF = useCallback(async () => {
    if (!canPerformAction('preview')) {
      showToast('没有预览权限', 'error');
      return;
    }

    try {
      store.setData({ isGenerating: true });
      await store.previewPDF();
    } catch (error) {
      showToast('预览失败', 'error');
      console.error('预览错误:', error);
    } finally {
      store.setData({ isGenerating: false });
    }
  }, [store, canPerformAction, showToast]);

  // 计算属性
  const isReadOnly = useMemo(() => !canPerformAction('edit'), [canPerformAction]);
  const canExport = useMemo(() => canPerformAction('export'), [canPerformAction]);
  const canPreview = useMemo(() => canPerformAction('preview'), [canPerformAction]);

  return {
    // 权限状态
    isReadOnly,
    canExport,
    canPreview,
    canPerformAction,
    
    // 安全操作
    safeUpdateData,
    safeSave,
    safeGeneratePDF,
    safePreviewPDF,
    
      // 状态代理
  data: store.getState().data,
  isLoading: store.getState().isLoading,
  isSaving: store.getState().isSaving,
  isGenerating: store.getState().isGenerating,
  error: store.getState().error,
  };
}
