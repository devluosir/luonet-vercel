import { useEffect } from 'react';
import type { LineItem } from '@/types/quotation';
import { handleImportData } from '@/utils/quotationDataHandler';

interface ImportDataButtonProps {
  onImport: (items: LineItem[]) => void;
}

export const ImportDataButton: React.FC<ImportDataButtonProps> = ({ onImport }) => {
  // 添加导入数据事件监听
  useEffect(() => {
    const handleImportEvent = (event: CustomEvent<string>) => {
      const text = event.detail;
      if (text) {
        const items = handleImportData(text);
        if (items.length > 0) {
          onImport(items);
        }
      }
    };

    window.addEventListener('import-data', handleImportEvent as EventListener);
    return () => {
      window.removeEventListener('import-data', handleImportEvent as EventListener);
    };
  }, [onImport]);

  return null;
}; 