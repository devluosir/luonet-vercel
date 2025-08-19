import type { LineItem } from '@/features/invoice';

// 计算金额
export const calculateAmount = (quantity: number, unitPrice: number) => {
  return Number((quantity * unitPrice).toFixed(2));
};

// 处理导入数据
export const handleImportData = (text: string) => {
  try {
    // 按行分割，过滤空行
    const rows = text.split(/\r\n|\r|\n/).filter(row => row.trim());
    const items: LineItem[] = [];
    
    for (const row of rows) {
      // 按 tab 分割单元格
      const cells = row.split('\t');
      
      // 检查是否有足够的列（描述、数量、单位、单价）
      if (cells.length >= 4) {
        // 取到倒数第四个单元格之前的所有内容作为描述
        const descriptionCells = cells.slice(0, -3);
        const description = descriptionCells.join('\r');
        const quantity = parseInt(cells[cells.length - 3]?.trim() || '0');
        const unit = cells[cells.length - 2]?.trim() || 'pc';
        const unitPrice = parseFloat(cells[cells.length - 1]?.trim() || '0');
        
        items.push({
          lineNo: items.length + 1,
          hsCode: '',
          partname: '',
          description,
          quantity,
          unit: processUnit(unit),
          unitPrice,
          amount: calculateAmount(quantity, unitPrice)
        });
      }
    }
    
    return items;
  } catch (error) {
    console.error('Error importing data:', error);
    return [];
  }
};

// 默认单位列表
const defaultUnits = ['pc', 'set', 'length'];

// 处理单位
const processUnit = (unit: string): string => {
  if (!unit) return 'pc';
  
  // 转换为小写并移除前后空格
  const normalizedUnit = unit.trim().toLowerCase();
  
  // 特殊处理 'pcs'
  if (normalizedUnit === 'pcs') return 'pc';
  
  // 处理复数形式
  const singularUnit = normalizedUnit.endsWith('s') ? normalizedUnit.slice(0, -1) : normalizedUnit;
  
  // 检查是否是默认单位之一
  return defaultUnits.includes(singularUnit) ? singularUnit : 'pc';
}; 