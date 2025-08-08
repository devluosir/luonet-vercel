import { useCallback } from 'react';
import { useQuotationStore } from '../state/useQuotationStore';
import { importFromClipboardText, readClipboardText } from '../services/import.service';
import { useToast } from '@/components/ui/Toast';

// 剪贴板导入Hook
export function useClipboardImport() {
  const { updateItems, setPasteDialogOpen } = useQuotationStore();
  const { showToast } = useToast();

  // 处理全局粘贴
  const handleGlobalPaste = useCallback(async (text: string) => {
    try {
      if (!text || !text.trim()) {
        showToast('粘贴内容为空', 'info');
        return;
      }

      const convertedItems = importFromClipboardText(text);
      
      if (convertedItems.length > 0) {
        updateItems(convertedItems);
        showToast(`成功导入 ${convertedItems.length} 个商品条目`, 'success');
      } else {
        showToast('没有找到有效的商品数据，请检查格式', 'info');
      }
    } catch (error) {
      console.error('Error parsing pasted data:', error);
      showToast('数据解析失败，请检查Excel数据格式是否正确', 'error');
    }
  }, [updateItems, showToast]);

  // 处理剪贴板按钮点击
  const handleClipboardButtonClick = useCallback(async () => {
    try {
      const text = await readClipboardText();
      if (text) {
        handleGlobalPaste(text);
      } else {
        showToast('剪贴板为空', 'info');
      }
    } catch (error) {
      console.error('Error reading clipboard:', error);
      showToast('无法访问剪贴板，请手动粘贴', 'info');
      // 显示粘贴对话框
      setPasteDialogOpen(true);
    }
  }, [handleGlobalPaste, setPasteDialogOpen, showToast]);

  // 打开粘贴对话框
  const openPasteDialog = useCallback(() => {
    setPasteDialogOpen(true);
  }, [setPasteDialogOpen]);

  return {
    handleGlobalPaste,
    handleClipboardButtonClick,
    openPasteDialog,
  };
}
