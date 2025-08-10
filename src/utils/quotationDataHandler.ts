import type { LineItem } from '@/types/quotation';

// 计算金额
export const calculateAmount = (quantity: number, unitPrice: number) => {
  return Number((quantity * unitPrice).toFixed(2));
};

// 默认单位列表
const defaultUnits = ['pc', 'set', 'length'];

// 处理单位
const processUnit = (unit: string): string => {
  if (!unit) return 'pc';
  
  // 转换为小写并移除前后空格
  const normalizedUnit = unit.trim().toLowerCase();
  
  // 处理复数形式
  const singularUnit = normalizedUnit.endsWith('s') ? normalizedUnit.slice(0, -1) : normalizedUnit;
  
  // 特殊处理 'pcs'
  if (normalizedUnit === 'pcs') return 'pc';
  
  // 检查是否是默认单位之一
  return defaultUnits.includes(singularUnit) ? singularUnit : 'pc';
};

// 处理导入数据
export const handleImportData = (text: string): LineItem[] => {
  try {
    // 清理数据：移除多余的空行和格式
    const cleanedText = text.trim();
    
    // 按硬回车分割成行，但保留原始格式
    const rows = cleanedText.split(/\r\n|\r|\n/).filter(row => row.trim());
    const items: LineItem[] = [];
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Import] 原始数据行数:', rows.length);
      console.log('[Import] 前几行数据:', rows.slice(0, 3));
      console.log('[Import] 原始文本长度:', text.length);
      console.log('[Import] 清理后行数:', rows.length);
    }
    
          for (const row of rows) {
        if (!row.trim()) continue;
        
        // 按 tab 分割单元格
        const cells = row.split('\t');
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Import] 处理行:', cells);
          console.log('[Import] 行长度:', cells.length);
        }
        
        // 检查是否是有效的数据行
        if (cells.length >= 3) {
        // 更灵活的数据解析：尝试多种模式
        let foundData = false;
        
        // 模式1：从后往前找数量、单位、价格（原有逻辑）
        for (let i = cells.length - 1; i >= 2; i--) {
          const priceStr = cells[i]?.trim();
          const unitStr = cells[i - 1]?.trim();
          const qtyStr = cells[i - 2]?.trim();
          
          if (
            priceStr && 
            unitStr && 
            qtyStr && 
            /^\d+\.?\d*$/.test(priceStr) && 
            /^\d+$/.test(qtyStr)
          ) {
            // 找到了数量、单位和单价
            const quantity = parseInt(qtyStr);
            const unit = unitStr;
            const unitPrice = parseFloat(priceStr);
            
            // 前面的所有单元格都是 partName，保持原始格式
            const partName = cells.slice(0, i - 2).join('\t');
            
            items.push({
              id: items.length + 1,
              partName,
              description: '',
              quantity,
              unit: processUnit(unit),
              unitPrice,
              amount: calculateAmount(quantity, unitPrice)
            });
            
            foundData = true;
            break;
          }
        }
        
        // 模式2：只找数量和单位，价格可以为空
        if (!foundData) {
          for (let i = cells.length - 1; i >= 1; i--) {
            const unitStr = cells[i]?.trim();
            const qtyStr = cells[i - 1]?.trim();
            
            if (
              unitStr && 
              qtyStr && 
              /^\d+$/.test(qtyStr)
            ) {
              const quantity = parseInt(qtyStr);
              const unit = unitStr;
              
              // 前面的所有单元格都是 partName
              const partName = cells.slice(0, i - 1).join('\t');
              
              items.push({
                id: items.length + 1,
                partName,
                description: '',
                quantity,
                unit: processUnit(unit),
                unitPrice: 0,
                amount: 0
              });
              
              foundData = true;
              break;
            }
          }
        }
        
        // 模式3：只找数量，单位和价格都可以为空
        if (!foundData) {
          for (let i = cells.length - 1; i >= 0; i--) {
            const qtyStr = cells[i]?.trim();
            
            if (qtyStr && /^\d+$/.test(qtyStr)) {
              const quantity = parseInt(qtyStr);
              
              // 前面的所有单元格都是 partName
              const partName = cells.slice(0, i).join('\t');
              
              items.push({
                id: items.length + 1,
                partName,
                description: '',
                quantity,
                unit: 'pc',
                unitPrice: 0,
                amount: 0
              });
              
              foundData = true;
              break;
            }
          }
        }
        
        // 模式4：处理包含数字但不是纯数字的单元格（如 "7-8 weeks"）
        if (!foundData) {
          for (let i = cells.length - 1; i >= 0; i--) {
            const cellStr = cells[i]?.trim();
            
            if (cellStr && /\d/.test(cellStr) && !cellStr.match(/^(Line No\.|Description|Part No\.|Q'TY|Unit|U\/Price|Amount|D\/T|Remark|TOTAL|MAKER|BRAND)/i)) {
              // 前面的所有单元格都是 partName
              const partName = cells.slice(0, i + 1).join('\t');
              
              items.push({
                id: items.length + 1,
                partName,
                description: '',
                quantity: 0,
                unit: 'pc',
                unitPrice: 0,
                amount: 0
              });
              
              foundData = true;
              break;
            }
          }
        }
        
        if (!foundData && cells[0]) {
          // 如果没有任何数字数据，但有内容，作为纯文本处理
          const firstCell = cells[0]?.trim();
          if (firstCell && !firstCell.match(/^(Line No\.|Description|Part No\.|Q'TY|Unit|U\/Price|Amount|D\/T|Remark|TOTAL|MAKER|BRAND)/i)) {
            items.push({
              id: items.length + 1,
              partName: firstCell,
              description: '',
              quantity: 0,
              unit: 'pc',
              unitPrice: 0,
              amount: 0
            });
          }
        }
      } else if (cells.length >= 1 && cells.some(cell => cell.trim())) {
        // 处理只有1-2列的行（可能是子项或标题行）
        const firstCell = cells[0]?.trim();
        if (firstCell && !firstCell.match(/^(Line No\.|Description|Part No\.|Q'TY|Unit|U\/Price|Amount|D\/T|Remark|TOTAL|MAKER|BRAND)/i)) {
          items.push({
            id: items.length + 1,
            partName: firstCell,
            description: '',
            quantity: 0,
            unit: 'pc',
            unitPrice: 0,
            amount: 0
          });
        }
      } else if (cells[0]) {
        // 如果列数不够但有内容
        items.push({
          id: items.length + 1,
          partName: cells[0],
          description: '',
          quantity: 0,
          unit: 'pc',
          unitPrice: 0,
          amount: 0
        });
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Import] 解析后的项目数:', items.length);
      console.log('[Import] 解析结果:', items);
    }
    
    // 安全检查：如果解析的项目数超过原始行数的2倍，可能有问题
    if (items.length > rows.length * 2) {
      console.warn('[Import] 警告：解析的项目数过多，可能存在数据格式问题');
      console.warn('[Import] 原始行数:', rows.length, '解析项目数:', items.length);
      // 只返回前 rows.length 个项目
      return items.slice(0, rows.length);
    }
    
    return items;
  } catch (error) {
    console.error('Error importing data:', error);
    return [];
  }
}; 