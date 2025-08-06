/**
 * 解析Excel粘贴的文本数据
 * 处理规则：
 * 1. 普通单元格用制表符（\t）分隔
 * 2. 引号内的所有内容（包括换行符）被视为同一个单元格的内容
 * 3. 引号仅作为边界标识，不作为内容的一部分
 */
export const parseExcelData = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let lastChar = '';
  
  // 遍历每个字符
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // 处理引号 - 只有成对的引号才处理，单独的引号(如英寸符号)忽略
    if (char === '"' && lastChar !== '\\') {
      // 检查是否是Excel格式的引号对（引号后面跟制表符或行尾）
      const nextChar = text[i + 1];
      const prevChar = text[i - 1];
      
      // 只有在引号前后是制表符、换行符或字符串开头/结尾时才处理
      if (
        (!inQuotes && (i === 0 || prevChar === '\t' || prevChar === '\n' || prevChar === '\r')) ||
        (inQuotes && (nextChar === '\t' || nextChar === '\n' || nextChar === '\r' || nextChar === undefined))
      ) {
        inQuotes = !inQuotes;
        continue;
      }
    }
    
    // 处理制表符（仅在引号外有效）
    if (char === '\t' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
      continue;
    }
    
    // 处理换行符
    if ((char === '\n' || char === '\r') && !inQuotes) {
      // 在引号外，换行符标志着新行的开始
      if (char === '\r' && text[i + 1] === '\n') {
        i++; // 跳过 \r\n 中的 \n
      }
      
      // 保存当前单元格和行
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell.trim())) {
        rows.push([...currentRow]);
      }
      
      // 重置当前行和单元格
      currentRow = [];
      currentCell = '';
    } else {
      // 收集单元格内容
      currentCell += char;
    }
    
    lastChar = char;
  }
  
  // 处理最后一个单元格和行
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell.trim())) {
      rows.push(currentRow);
    }
  }
  
  return rows;
};

/**
 * 将Excel数据转换为行项目数据
 */
export interface ExcelLineItem {
  id: number;
  partName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export const convertExcelToLineItems = (rows: string[][], existingItems: ExcelLineItem[] = []): ExcelLineItem[] => {
  const items: ExcelLineItem[] = [];
  const defaultUnits = ['pc', 'set', 'length'];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // 跳过空行
    if (row.length === 0 || row.every(cell => !cell.trim())) {
      continue;
    }

    let partName = '';
    let description = '';
    let quantity = 0;
    let unit = existingItems[i]?.unit || 'pc'; // 使用现有项目的单位，如果没有则默认为 'pc'
    let unitPrice = 0;

    // 根据列数和数字列位置处理不同格式
    if (row.length === 3) {
      // 如果最后一列是数字，那就是 名称 描述 数量 格式
      if (isNumeric(row[2])) {
        partName = row[0].trim();
        description = row[1].trim();
        quantity = parseInt(row[2]) || 0;
      }
      // 如果中间列是数字，那就是 名称 数量 单价 格式
      else if (isNumeric(row[1])) {
        partName = row[0].trim();
        quantity = parseInt(row[1]) || 0;
        unitPrice = parseFloat(row[2]) || 0;
      }
    } else if (row.length === 2) {
      // 2列格式：名称 数量
      partName = row[0].trim();
      quantity = parseInt(row[1]) || 0;
    } else if (row.length >= 4) {
      // 智能识别4列格式
      if (row.length === 4) {
        // 检查是否是 "名称 数量 单位 单价" 格式
        // 判断逻辑：第2列是数字（数量），第4列是数字或空（单价）
        if (isNumeric(row[1]) && (isNumeric(row[3]) || row[3]?.trim() === '' || row[3]?.trim() === '0')) {
          // 4列格式：名称 数量 单位 单价
          partName = row[0].trim();
          quantity = parseInt(row[1]) || 0;
          const copiedUnit = row[2]?.trim() || '';
          if (copiedUnit) {
            // 转换为小写并移除前后空格
            const normalizedUnit = copiedUnit.toLowerCase();
            // 处理复数形式
            const singularUnit = normalizedUnit.endsWith('s') ? normalizedUnit.slice(0, -1) : normalizedUnit;
            // 特殊处理 'pcs'
            if (normalizedUnit === 'pcs') {
              unit = 'pc';
            } else if (defaultUnits.includes(singularUnit)) {
              unit = singularUnit;
            } else {
              unit = copiedUnit; // 如果不是默认单位，保持原样
            }
          }
          unitPrice = parseFloat(row[3]) || 0;
        } else {
          // 4列格式：名称 描述 数量 单位 [单价]
          partName = row[0].trim();
          description = row[1].trim();
          quantity = parseInt(row[2]) || 0;
          const copiedUnit = row[3]?.trim() || '';
          if (copiedUnit) {
            // 转换为小写并移除前后空格
            const normalizedUnit = copiedUnit.toLowerCase();
            // 处理复数形式
            const singularUnit = normalizedUnit.endsWith('s') ? normalizedUnit.slice(0, -1) : normalizedUnit;
            // 特殊处理 'pcs'
            if (normalizedUnit === 'pcs') {
              unit = 'pc';
            } else if (defaultUnits.includes(singularUnit)) {
              unit = singularUnit;
            } else {
              unit = copiedUnit; // 如果不是默认单位，保持原样
            }
          }
          unitPrice = parseFloat(row[4]) || 0;
        }
      } else {
        // 5列或更多：名称 描述 数量 单位 [单价]
        partName = row[0].trim();
        description = row[1].trim();
        quantity = parseInt(row[2]) || 0;
        const copiedUnit = row[3]?.trim() || '';
        if (copiedUnit) {
          // 转换为小写并移除前后空格
          const normalizedUnit = copiedUnit.toLowerCase();
          // 处理复数形式
          const singularUnit = normalizedUnit.endsWith('s') ? normalizedUnit.slice(0, -1) : normalizedUnit;
          // 特殊处理 'pcs'
          if (normalizedUnit === 'pcs') {
            unit = 'pc';
          } else if (defaultUnits.includes(singularUnit)) {
            unit = singularUnit;
          } else {
            unit = copiedUnit; // 如果不是默认单位，保持原样
          }
        }
        unitPrice = parseFloat(row[4]) || 0;
      }
    } else {
      // 单列：只有名称
      partName = row[0].trim();
    }

    const newItem = {
      id: items.length + 1,
      partName,
      description,
      quantity: Math.floor(quantity), // 确保数量是整数
      unit,
      unitPrice,
      amount: Math.floor(quantity) * unitPrice
    };
    items.push(newItem);
  }

  return items;
};

// 辅助函数：检查是否为数字
function isNumeric(value: string): boolean {
  if (!value) return false;
  const num = value.trim().replace(/,/g, '');
  return !isNaN(Number(num)) && num.length > 0;
}

/**
 * 解析单个Excel单元格的内容
 */
export const parseExcelCell = (text: string): string => {
  if (!text) return '';
  // 移除开头和结尾的引号
  return text.replace(/^"|"$/g, '').trim();
};

/**
 * 解析数字单元格
 */
export const parseNumberCell = (text: string): number | null => {
  if (!text) return null;
  // 移除引号并解析数字
  const value = parseFloat(text.replace(/^"|"$/g, '').trim());
  return isNaN(value) ? null : value;
}; 