// 轻量智能解析：多分隔符、表头识别、2~5列容错、货币/小数逗号、单位规范化
const SEP = /[\t,;]|\s{2,}/; // tab, comma, semicolon, 或 2+ spaces
const HEADER_HINTS = /line\s*no|item|part\s*no|description|qty|quantity|unit|price|amount|u\/price|单价|数量|名称|单位|序号|编号|no\.|num|index|#|line|part|desc/i;

const UNIT_MAP: Record<string, string> = {
  pcs: 'pc', 
  个: 'pc', 
  件: 'pc', 
  套: 'set', 
  台: 'set', 
  套件: 'set',
  pairs: 'pair',
  对: 'pair',
  组: 'set',
  米: 'm',
  厘米: 'cm',
  公斤: 'kg',
  克: 'g',
  磅: 'lb',
};

function cleanTextContent(s?: string) {
  if (!s) return '';
  // 去除前后的引号和空白，处理内部的双引号转义
  return s.trim()
    .replace(/^["']|["']$/g, '') // 移除外部引号
    .replace(/""/g, '"') // 双引号转义还原
    .trim();
}

function isLikelySequenceNumber(s?: string, index?: number): boolean {
  if (!s) return false;
  const cleaned = cleanTextContent(s).trim();
  
  // 检查是否是纯数字
  const num = parseInt(cleaned, 10);
  if (!Number.isInteger(num) || num <= 0) return false;
  
  // 如果提供了索引，检查数字是否与行索引相符（考虑可能的序号偏移）
  if (typeof index === 'number') {
    // 允许一定的偏移量（比如从1开始，或者有表头）
    const expectedRange = [index, index + 1, index + 2];
    if (!expectedRange.includes(num)) return false;
  }
  
  // 检查长度，序号通常不会太长
  return cleaned.length <= 4; // 支持到9999
}

function detectSequenceColumn(rows: string[][]): number | null {
  if (rows.length < 2) return null;
  
  // 检查前几列是否可能是序号列
  for (let col = 0; col < Math.min(2, rows[0].length); col++) {
    let sequenceScore = 0;
    let validRows = 0;
    
    for (let row = 0; row < Math.min(5, rows.length); row++) {
      const cell = rows[row]?.[col];
      if (cell && cell.trim()) {
        validRows++;
        if (isLikelySequenceNumber(cell, row + 1)) {
          sequenceScore++;
        }
      }
    }
    
    // 如果70%以上的行都像序号，认为这一列是序号列
    if (validRows > 0 && sequenceScore / validRows >= 0.7) {
      return col;
    }
  }
  
  return null;
}

function isLikelyDescriptionRow(cells: string[]): boolean {
  if (cells.length === 0) return false;
  
  // 检查是否大部分单元格都是非数字的描述性文本
  let textCells = 0;
  let totalCells = 0;
  
  for (const cell of cells) {
    const cleaned = cleanTextContent(cell);
    if (cleaned) {
      totalCells++;
      
      // 检查是否包含描述性关键字
      const hasDescKeywords = /maker|brand|genuine|parts|specs|specification|note|remark|description|型号|规格|说明|备注|厂家|品牌/i.test(cleaned);
      
      // 检查是否包含长文本（超过15个字符通常是描述）
      const isLongText = cleaned.length > 15;
      
      // 检查是否包含技术规格格式（如V52、22M、P/SUB等）
      const hasTechSpecs = /[A-Z]\d+|\/[A-Z]+|\d+[A-Z]+|\*[A-Z]|\([A-Z]\)/i.test(cleaned);
      
      // 检查是否不是纯数字（数量、价格等）
      const isNotNumber = isNaN(parseFloat(cleaned)) || cleaned.length > 8;
      
      if (hasDescKeywords || isLongText || hasTechSpecs || isNotNumber) {
        textCells++;
      }
    }
  }
  
  // 如果80%以上的单元格都是描述性文本，认为这是说明行
  return totalCells > 0 && textCells / totalCells >= 0.8;
}

function findDataStartRow(allRowCells: string[][], headerRowIndex: number): number {
  // 从表头的下一行开始查找真正的数据行
  let startRow = headerRowIndex + 1;
  
  // 跳过连续的说明行
  while (startRow < allRowCells.length) {
    const cells = allRowCells[startRow];
    
    if (isLikelyDescriptionRow(cells)) {
      startRow++; // 跳过说明行
      continue;
    }
    
    // 检查这一行是否包含数量和价格等数据特征
    let hasQuantity = false;
    let hasPrice = false;
    
    for (const cell of cells) {
      const cleaned = cleanTextContent(cell);
      const num = parseFloat(cleaned);
      
      if (!isNaN(num) && num > 0) {
        // 简单判断：小于1000的可能是数量，大于1的可能是价格
        if (num < 1000 && Number.isInteger(num)) {
          hasQuantity = true;
        } else if (num >= 1) {
          hasPrice = true;
        }
      }
    }
    
    // 如果找到包含数量或价格的行，认为数据开始了
    if (hasQuantity || hasPrice) {
      break;
    }
    
    startRow++;
  }
  
  return startRow;
}

function normUnit(u?: string) {
  if (!u) return 'pc';
  const cleaned = cleanTextContent(u);
  const k = cleaned.toLowerCase();
  return UNIT_MAP[k] || (k.endsWith('s') && UNIT_MAP[k.slice(0, -1)] ? UNIT_MAP[k.slice(0, -1)] : cleaned);
}

function parseNumberLike(s?: string) {
  if (!s) return 0;
  
  // 去掉前后空白和引号
  s = s.trim().replace(/^["']|["']$/g, '');
  
  // 移除货币符号和其他非数字字符，但保留小数点和逗号
  const t = s.replace(/[^\d.,-]/g, '');
  if (!t) return 0;
  
  // 处理小数逗号（欧洲格式）
  const commaAsDecimal = t.includes(',') && !t.includes('.');
  const canon = commaAsDecimal ? t.replace(',', '.') : t.replace(/,/g, ''); // 移除千位分隔符
  const val = parseFloat(canon);
  return Number.isFinite(val) ? val : 0;
}

export interface ParsedRow {
  partName: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
}

export interface ParseResult {
  rows: ParsedRow[];
  skipped: number;
  confidence: number;
  detectedFormat?: string;
}

function parseCSVLikeText(text: string): string[] {
  // 处理Excel复制的数据，可能包含引号包围的单元格和内部换行
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < text.length) {
    const char = text[i];
    
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        // 双引号转义
        currentLine += '"';
        i += 2;
        continue;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
        currentLine += char;
      }
    } else if (char === '\n' || char === '\r') {
      if (inQuotes) {
        // 引号内的换行符，保留为单元格内容
        currentLine += char;
      } else {
        // 真正的行结束
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = '';
        // 跳过 \r\n 的 \n 部分
        if (char === '\r' && text[i + 1] === '\n') {
          i++;
        }
      }
    } else {
      currentLine += char;
    }
    i++;
  }
  
  // 添加最后一行
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines;
}

function parseRowCells(line: string): string[] {
  // 解析一行中的单元格，处理引号和Tab分隔
  const cells: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 双引号转义
        currentCell += '"';
        i += 2;
        continue;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
        // 不添加引号到最终内容中
      }
    } else if (char === '\t' && !inQuotes) {
      // Tab分隔符，且不在引号内
      cells.push(currentCell.trim());
      currentCell = '';
    } else {
      currentCell += char;
    }
    i++;
  }
  
  // 添加最后一个单元格
  cells.push(currentCell.trim());
  
  return cells.filter(cell => cell.length > 0 || cells.length <= 1); // 保留空单元格，但过滤完全空的行
}

export function quickSmartParse(text: string): ParseResult {
  const lines = parseCSVLikeText(text);
  let skipped = 0;
  if (lines.length === 0) return { rows: [], skipped, confidence: 0 };

  // 表头识别：若首行含关键字则跳过
  const maybeHeader = HEADER_HINTS.test(lines[0]);
  const headerRowIndex = maybeHeader ? 0 : -1;
  let detectedFormat = '';

  // 预处理：解析所有行的单元格
  const allRowCells: string[][] = [];
  for (let i = 0; i < lines.length; i++) {
    let cells = parseRowCells(lines[i]);
    if (cells.length < 2) {
      cells = lines[i].split(SEP).map(s => s.trim()).filter(x => x.length > 0);
    }
    if (cells.length >= 1) { // 放宽条件，包含说明行
      allRowCells.push(cells);
    }
  }

  // 找到真正的数据开始行（跳过表头和说明行）
  const dataStartRow = maybeHeader ? findDataStartRow(allRowCells, headerRowIndex) : 0;
  
  // 如果检测到说明行，在格式中标记
  if (maybeHeader && dataStartRow > headerRowIndex + 1) {
    detectedFormat += 'desc-';
  }

  // 只对数据行检测序号列
  const dataRowCells = allRowCells.slice(dataStartRow);
  const sequenceColIndex = detectSequenceColumn(dataRowCells);
  let sequenceDetected = false;
  if (sequenceColIndex !== null) {
    detectedFormat += sequenceColIndex === 0 ? 'seq-' : `col${sequenceColIndex}seq-`;
    sequenceDetected = true;
  }

  const rows: ParsedRow[] = [];

  // 只处理数据行，跳过表头和说明行
  for (let i = 0; i < dataRowCells.length; i++) {
    let cells = dataRowCells[i];
    
    // 如果检测到序号列，跳过它
    if (sequenceColIndex !== null) {
      cells = cells.slice(); // 复制数组
      cells.splice(sequenceColIndex, 1); // 移除序号列
    }
    
    if (cells.length < 2) { 
      skipped++; 
      continue; 
    }

    const [c0, c1, c2, c3, c4] = cells;
    const name = cleanTextContent(c0);
    if (!name) { 
      skipped++; 
      continue; 
    }

    let matched = false;

    // 尝试推断列意义
    // 情况 A：4~5 列：name, qty, unit, price, [desc] 或 name, desc, qty, unit, price
    const qty1 = parseNumberLike(c1);
    const qty2 = parseNumberLike(c2);
    
    if (cells.length >= 4) {
      // 模式1: name, qty, unit, price
      const c2IsUnitLike = c2 && c2.length <= 8 && !/^\d+\.?\d*$/.test(c2);
      const price3 = parseNumberLike(c3);
      
      if (qty1 > 0 && c2IsUnitLike && (price3 > 0 || c3 === '' || c3 === undefined)) {
        rows.push({ 
          partName: name, 
          quantity: qty1, 
          unit: normUnit(c2), 
          unitPrice: price3 || 0, 
          description: cleanTextContent(c4)
        });
        if (!detectedFormat) detectedFormat = 'name-qty-unit-price';
        matched = true;
      }
      // 模式2: name, desc, qty, unit, price (5列)
      else if (cells.length >= 5) {
        const qty2 = parseNumberLike(c2);
        const c3IsUnitLike = c3 && c3.length <= 8 && !/^\d+\.?\d*$/.test(c3);
        const price4 = parseNumberLike(c4);
        
        if (qty2 > 0 && c3IsUnitLike) {
          rows.push({ 
            partName: name, 
            description: cleanTextContent(c1),
            quantity: qty2, 
            unit: normUnit(c3), 
            unitPrice: price4 || 0 
          });
          if (!detectedFormat) detectedFormat = 'name-desc-qty-unit-price';
          matched = true;
        }
      }
      // 模式3: name, desc, qty, price (4列，无单位)
      if (!matched) {
        const price3 = parseNumberLike(c3);
        if (qty2 > 0) {
          rows.push({ 
            partName: name, 
            description: cleanTextContent(c1),
            quantity: qty2, 
            unit: 'pc', 
            unitPrice: price3 || 0 
          });
          if (!detectedFormat) detectedFormat = 'name-desc-qty-price';
          matched = true;
        }
      }
    }

    // 情况 B：3 列：name, qty, price
    if (!matched && cells.length === 3) {
      const price2 = parseNumberLike(c2);
      if (qty1 > 0) {
        rows.push({ 
          partName: name, 
          quantity: qty1, 
          unit: 'pc', 
          unitPrice: price2 || 0 
        });
        if (!detectedFormat) detectedFormat = 'name-qty-price';
        matched = true;
      }
    }

    // 情况 C：2 列：name, qty
    if (!matched && cells.length === 2 && qty1 >= 0) {
      rows.push({ 
        partName: name, 
        quantity: qty1, 
        unit: 'pc', 
        unitPrice: 0 
      });
      if (!detectedFormat) detectedFormat = 'name-qty';
      matched = true;
    }

    if (!matched) {
      skipped++;
    }
  }

  // 简单"置信度"估算：成功率 * 结构稳定性
  const ok = rows.length;
  const total = ok + skipped;
  const rate = total > 0 ? ok / total : 0;
  const structureBonus = Math.min(1, ok / 10); // 行数越多，越稳定
  const headerBonus = maybeHeader ? 0.12 : 0; // 有表头加分
  
  // Excel格式加分（包含Tab分隔符）
  const hasTabSeparator = text.includes('\t');
  const excelBonus = hasTabSeparator ? 0.12 : 0;
  
  // 序号列检测加分（说明数据结构化程度高）
  const sequenceBonus = sequenceDetected ? 0.1 : 0;
  
  // 说明行检测加分（说明表格格式规范）
  const descriptionBonus = detectedFormat.includes('desc-') ? 0.1 : 0;
  
  const confidence = Math.min(1, 0.42 * rate + 0.2 * structureBonus + headerBonus + excelBonus + sequenceBonus + descriptionBonus);

  return { 
    rows, 
    skipped, 
    confidence, 
    detectedFormat: detectedFormat || 'unknown' 
  };
}
