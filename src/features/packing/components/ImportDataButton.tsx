import { useEffect } from 'react';

interface PackingItem {
  id: number;
  serialNo: string;
  description: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  netWeight: number;
  grossWeight: number;
  packageQty: number;
  dimensions: string;
  unit: string;
  groupId?: string;
}

interface ImportDataButtonProps {
  onImport: (items: PackingItem[]) => void;
}

// 简单的数据解析函数
const handleImportData = (text: string): PackingItem[] => {
  const lines = text.trim().split('\n');
  const items: PackingItem[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split('\t');
    if (columns.length >= 2) {
      const item: PackingItem = {
        id: Date.now() + i, // 生成唯一ID
        serialNo: (i + 1).toString(),
        description: columns[0]?.trim() || '',
        hsCode: columns[1]?.trim() || '',
        quantity: parseFloat(columns[2]) || 0,
        unit: columns[3]?.trim() || 'pc',
        unitPrice: parseFloat(columns[4]) || 0,
        totalPrice: (parseFloat(columns[2]) || 0) * (parseFloat(columns[4]) || 0),
        netWeight: parseFloat(columns[5]) || 0,
        grossWeight: parseFloat(columns[6]) || 0,
        packageQty: parseInt(columns[7]) || 0,
        dimensions: columns[8]?.trim() || '',
      };
      items.push(item);
    }
  }
  
  return items;
};

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
