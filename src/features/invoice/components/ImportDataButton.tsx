import { useEffect } from 'react';
import type { LineItem } from '../types';

interface ImportDataButtonProps {
  onImport: (items: LineItem[]) => void;
}

export const ImportDataButton: React.FC<ImportDataButtonProps> = ({ onImport }) => {
  // 添加导入数据事件监听
  useEffect(() => {
    const handleImportEvent = (event: CustomEvent<string>) => {
      const text = event.detail;
      if (text) {
        // 这里可以添加发票数据解析逻辑
        const items = parseInvoiceData(text);
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

// 简单的发票数据解析函数
const parseInvoiceData = (text: string): LineItem[] => {
  const lines = text.trim().split('\n');
  const items: LineItem[] = [];
  
  lines.forEach((line, index) => {
    const columns = line.split('\t');
    if (columns.length >= 4) {
      const quantity = parseFloat(columns[2]) || 0;
      const unitPrice = parseFloat(columns[3]) || 0;
      
      items.push({
        lineNo: index + 1,
        hsCode: columns[0] || '',
        partname: columns[1] || '',
        description: columns[4] || '',
        quantity,
        unit: 'pc',
        unitPrice,
        amount: quantity * unitPrice,
        remarks: columns[5] || '',
        highlight: {}
      });
    }
  });
  
  return items;
};
