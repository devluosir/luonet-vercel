/**
 * 解析Excel粘贴的文本数据
 * 处理规则：
 * 1. 普通单元格用制表符（\t）分隔
 * 2. 引号内的所有内容（包括换行符）被视为同一个单元格的内容
 * 3. 引号仅作为边界标识，不作为内容的一部分
 * 4. 单元格内的软回车（Alt+Enter产生的\n）保留在单元格内
 */
export const parseExcelData = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  
  // 先预处理文本，将\r\n统一为\n
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // 遍历每个字符
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    const nextChar = normalizedText[i + 1];
    const prevChar = normalizedText[i - 1];
    
    // 处理引号 - 检测Excel的引号边界
    if (char === '"') {
      // 开始引号：前面是制表符、换行符或字符串开头
      if (!inQuotes && (i === 0 || prevChar === '\t' || prevChar === '\n')) {
        inQuotes = true;
        continue;
      }
      // 结束引号：后面是制表符、换行符或字符串结尾
      else if (inQuotes && (nextChar === '\t' || nextChar === '\n' || nextChar === undefined)) {
        inQuotes = false;
        continue;
      }
      // 引号内的双引号转义（""表示一个引号字符）
      else if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // 跳过下一个引号
        continue;
      }
    }
    
    // 处理制表符（仅在引号外有效，表示单元格分隔）
    if (char === '\t' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }
    
    // 处理换行符
    if (char === '\n') {
      if (inQuotes) {
        // 引号内的换行符是单元格内的软回车，保留
        currentCell += char;
      } else {
        // 引号外的换行符表示行结束
        currentRow.push(currentCell);
        
        // 只有非空行才添加到结果中
        if (currentRow.some(cell => cell.trim())) {
          rows.push([...currentRow]);
        }
        
        // 重置当前行和单元格
        currentRow = [];
        currentCell = '';
      }
      continue;
    }
    
    // 收集单元格内容
    currentCell += char;
  }
  
  // 处理最后一个单元格和行
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell);
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

    // 清理单元格内容，移除首尾空白但保留软回车
    const cleanRow = row.map(cell => cell.trim());

    let partName = '';
    let description = '';
    let quantity = 0;
    let unit = existingItems[i]?.unit || 'pc'; // 使用现有项目的单位，如果没有则默认为 'pc'
    let unitPrice = 0;

    // 根据列数和数字列位置处理不同格式
    if (cleanRow.length === 3) {
      // 如果最后一列是数字，那就是 名称 描述 数量 格式
      if (isNumeric(cleanRow[2])) {
        partName = cleanRow[0];
        description = cleanRow[1];
        quantity = parseInt(cleanRow[2]) || 0;
      }
      // 如果中间列是数字，那就是 名称 数量 单价 格式
      else if (isNumeric(cleanRow[1])) {
        partName = cleanRow[0];
        quantity = parseInt(cleanRow[1]) || 0;
        unitPrice = parseFloat(cleanRow[2]) || 0;
      }
    } else if (cleanRow.length === 2) {
      // 2列格式：名称 数量
      partName = cleanRow[0];
      quantity = parseInt(cleanRow[1]) || 0;
    } else if (cleanRow.length >= 4) {
      // 智能识别4列格式
      if (cleanRow.length === 4) {
        // 检查是否是 "名称 数量 单位 单价" 格式
        // 判断逻辑：第2列是数字（数量），第4列是数字或空（单价）
        if (isNumeric(cleanRow[1]) && (isNumeric(cleanRow[3]) || cleanRow[3] === '' || cleanRow[3] === '0')) {
          // 4列格式：名称 数量 单位 单价
          partName = cleanRow[0];
          quantity = parseInt(cleanRow[1]) || 0;
          const copiedUnit = cleanRow[2] || '';
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
          unitPrice = parseFloat(cleanRow[3]) || 0;
        } else {
          // 4列格式：名称 描述 数量 单位 [单价]
          partName = cleanRow[0];
          description = cleanRow[1];
          quantity = parseInt(cleanRow[2]) || 0;
          const copiedUnit = cleanRow[3] || '';
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
          unitPrice = parseFloat(cleanRow[4]) || 0;
        }
      } else {
        // 5列或更多：名称 描述 数量 单位 [单价]
        partName = cleanRow[0];
        description = cleanRow[1];
        quantity = parseInt(cleanRow[2]) || 0;
        const copiedUnit = cleanRow[3] || '';
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
        unitPrice = parseFloat(cleanRow[4]) || 0;
      }
    } else {
      // 单列：只有名称
      partName = cleanRow[0];
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