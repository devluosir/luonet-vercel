import { useCallback } from 'react';
import { useInvoiceStore } from '../state/invoice.store';
import { parsePastedData, processQuotationData, createManualInputModal } from '../utils/importUtils';

/**
 * 发票粘贴导入Hook
 */
export const usePasteImport = () => {
  const { handlePasteImport } = useInvoiceStore();

  // 处理粘贴按钮点击
  const handlePasteButtonClick = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const newItems = parsePastedData(text);
        const processedItems = processQuotationData(newItems);
        
        // 通过store更新数据
        handlePasteImport(text);
      }
    } catch (err) {
      console.error('Failed to handle paste:', err);
      
      // 如果剪贴板访问失败，显示手动输入框
      createManualInputModal(
        (text: string) => {
          if (text) {
            const newItems = parsePastedData(text);
            const processedItems = processQuotationData(newItems);
            
            // 通过store更新数据
            handlePasteImport(text);
          }
        },
        () => {
          // 用户取消
        }
      );
    }
  }, [handlePasteImport]);

  return {
    handlePasteButtonClick
  };
};
