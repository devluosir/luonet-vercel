// 增强智能解析：自适应列识别 + 数据质量警告
import { enhancedColumnDetection, validateRow, sampleBasedColumnDetection, batchProjectByMapping } from './enhancedColumnDetection';
import { parseMetrics, getFeatureFlags } from './parseMetrics';

const SEP = /[\t,;]|\s{2,}/; // tab, comma, semicolon, 或 2+ spaces
const HEADER_HINTS = /line\s*no|item|part\s*no|description|qty|quantity|unit|price|amount|u\/price|单价|数量|名称|单位|序号|编号|no\.|num|index|#|line|part|desc/i;

// === 新增类型定义 ===
export type ColumnField = 'name' | 'desc' | 'qty' | 'unit' | 'price' | 'remark' | 'ignore';

export interface ColumnEvidence {
  rule: string;
  weight: number;
  hit: number;
  score: number;
}

export interface ColumnInference {
  mapping: ColumnField[];
  confidence: number;
  evidence: Array<ColumnEvidence>;
  mixedFormat: boolean;
}

export type ValidationWarningType = 
  | 'large_quantity' 
  | 'tiny_price' 
  | 'suspicious_unit' 
  | 'zero_qty_or_price' 
  | 'mixed_currency' 
  | 'name_too_short'
  | 'amount_mismatch';

export interface ValidationWarning {
  type: ValidationWarningType;
  field?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

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
  箱: 'box',
  盒: 'box',
  包: 'pack',
  卷: 'roll',
  张: 'sheet',
  根: 'root',
  条: 'strip',
  块: 'block',
  片: 'piece',
  只: 'pc',
  支: 'pc',
};

// 单位词典集合 (用于识别)
const UNIT_DICT = new Set([
  'pc', 'pcs', 'piece', 'pieces', 'set', 'sets', 'pair', 'pairs', 
  'box', 'boxes', 'pack', 'packs', 'roll', 'rolls', 'sheet', 'sheets',
  'root', 'roots', 'strip', 'strips', 'block', 'blocks',
  'm', 'meter', 'meters', 'cm', 'mm', 'km', 'inch', 'ft', 'yard',
  'kg', 'kilogram', 'g', 'gram', 'lb', 'pound', 'oz', 'ton',
  'l', 'liter', 'ml', 'gallon', 'qt', 'quart',
  '个', '件', '套', '台', '套件', '对', '组', '箱', '盒', '包', 
  '卷', '张', '根', '条', '块', '片', '只', '支', '米', '厘米', 
  '毫米', '公斤', '克', '磅', '升', '毫升'
]);

// 货币符号检测
const CURRENCY_SYMBOLS = /[$€¥£₹₩¢₨₽₡₪₦₨]/;
const CURRENCY_CODES = /\b(USD|EUR|CNY|JPY|GBP|CAD|AUD|CHF|HKD|SGD|RMB)\b/i;

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
  remarks?: string;
}

export interface MergedCell {
  column: 'remarks' | 'description';
  startRow: number; // 相对数据区第一行的0基索引
  endRow: number;   // 相对数据区第一行的0基索引（含）
  content: string;  // 合并单元格文本
}

export interface ParseResult {
  rows: ParsedRow[];
  skipped: number;
  confidence: number;
  detectedFormat?: string;
  // === 新增字段 ===
  inference: ColumnInference;
  stats: {
    toInsert: number;
    toSkip: number;
    warnings: ValidationWarning[];
  };
  // === 合并单元格元数据 ===
  dataStartRow: number;       // 原始行号用于调试
  remarkCol: number;          // 去序号列后的"备注列"索引
  descCol: number;            // 去序号列后的"描述列"索引
  mergedRemarks: MergedCell[];// UI可直接使用的备注合并定义
  mergedDescriptions: MergedCell[];// UI可直接使用的描述合并定义
  colMap: Record<string, number>; // 去序号列后的列映射
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
  
  return cells; // 保留所有单元格，包括空单元格
}

export function quickSmartParse(text: string): ParseResult {
  // 获取特性开关配置
  const featureFlags = getFeatureFlags();
  
  // 开始性能计时
  parseMetrics.startTiming();
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[QuickSmartParse] 开始解析文本，长度:', text.length);
  }
  
  const lines = parseCSVLikeText(text);
  let skipped = 0;
  if (lines.length === 0) {
    parseMetrics.recordInsertResult(0, 0, 'legacy');
    parseMetrics.send();
    return { 
      rows: [], 
      skipped, 
      confidence: 0, 
      inference: { mapping: [], confidence: 0, evidence: [], mixedFormat: false },
      stats: { toInsert: 0, toSkip: 0, warnings: [] },
      dataStartRow: 0,
      remarkCol: 7,
      descCol: 0, // 修复：Description 应该是 0，不是 1
      mergedRemarks: [],
      mergedDescriptions: [],
      colMap: {}
    };
  }

  // 表头识别：若首行含关键字则跳过
  const maybeHeader = HEADER_HINTS.test(lines[0]);
  const headerRowIndex = maybeHeader ? 0 : -1;
  let detectedFormat = '';
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[QuickSmartParse] 原始行数:', lines.length);
    console.log('[QuickSmartParse] 检测到表头:', maybeHeader);
    console.log('[QuickSmartParse] 前几行:', lines.slice(0, 3));
  }

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
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[QuickSmartParse] 数据开始行:', dataStartRow);
    console.log('[QuickSmartParse] 所有行单元格:', allRowCells);
  }

  // 只对数据行检测序号列
  const dataRowCells = allRowCells.slice(dataStartRow);
  const sequenceColIndex = detectSequenceColumn(dataRowCells);
  let sequenceDetected = false;
  if (sequenceColIndex !== null) {
    detectedFormat += sequenceColIndex === 0 ? 'seq-' : `col${sequenceColIndex}seq-`;
    sequenceDetected = true;
  }
  
  // 修复：在数据预处理阶段统一移除序号列，确保所有行的一致性
  const processedDataRowCells = dataRowCells.map(row => {
    if (sequenceColIndex !== null && row.length > sequenceColIndex) {
      const newRow = row.slice(); // 复制数组
      newRow.splice(sequenceColIndex, 1); // 移除序号列
      return newRow;
    }
    return row;
  });
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[QuickSmartParse] 处理后的数据行:', processedDataRowCells.map((row, idx) => ({
      row: idx,
      length: row.length,
      remarks: row.length > 7 ? cleanTextContent(row[7]) : 'N/A'
    })));
  }

  let rows: ParsedRow[] = [];
  
  // 续行合并逻辑
  let currentItem: ParsedRow | null = null;
  let prevHasStarted = false; // 标记上一条是否已经开始
  
  // 辅助函数：判断是否为金额
  function looksLikeMoney(v?: string) {
    return !!v && /^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(v.trim());
  }
  
  // 辅助函数：判断是否为数量
  function looksLikeQty(v?: string) {
    return !!v && /^\d+(\.\d+)?$/.test(v.trim());
  }
  
  // 辅助函数：判断是否为单位
  function looksLikeUnit(v?: string) {
    return !!v && /^[A-Z]{2,6}$/.test(v.trim()); // PCS/SET/EA…
  }
  
  // 辅助函数：判断是否为总计行
  function isTotalLine(c0?: string, c1?: string, c2?: string, c3?: string) {
    const text = [c0, c1, c2].filter(Boolean).join(' ').toUpperCase();
    return /TOTAL\s+AMOUNT|TOTAL\b/.test(text) && looksLikeMoney(c3);
  }
  
  // 辅助函数：判断是否为服务费用
  function isServiceFee(desc?: string) {
    const t = (desc || '').toLowerCase();
    return /(packing|handling|service|bank|admin|documentation)\b/.test(t);
  }
  
  // 检测是否为续行
  function isContinuationRow(cells: string[]): boolean {
    if (cells.length < 2) return false;
    
    const [c0, c1, c2, c3, c4, c5] = cells.map(s => (s || '').trim()); // 0:Desc, 1:?, 2:Qty, 3:Unit, 4:Price(可能)
    
    // 修复：在续行检测中，cells已经移除了序号列，所以c0是描述列
    // 我们需要检查是否有数量、单位、价格来判断是否为独立行
    const hasQty = looksLikeQty(c2);
    const hasUnit = looksLikeUnit(c3);
    const hasMoney = looksLikeMoney(c4);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[QuickSmartParse] 续行检测: c0="${c0}", hasQty=${hasQty}, hasUnit=${hasUnit}, hasMoney=${hasMoney}`);
    }
    
    // 1) 明确新条目的强信号：有数量且(有单价或有单位)
    if (hasQty && (hasUnit || hasMoney)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[QuickSmartParse] 有数量+单价/单位，不是续行`);
      }
      return false;
    }

    // 2) 总计行一律不是续行
    if (isTotalLine(c0, c1, c2, cells[cells.length - 1])) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[QuickSmartParse] 是总计行，不是续行`);
      }
      return false;
    }

    // 3) 服务/费用行：如果有数量/单价/单位，则单独成行
    if (isServiceFee(c0) && (hasQty || hasUnit || hasMoney)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[QuickSmartParse] 是服务费用行且有数量/单价/单位，不是续行`);
      }
      return false;
    }

    // 4) 仅当"无数量/单价/单位"且上一条已开始时，才认为是描述续行
    const looksLikeBareDesc = !hasQty && !hasUnit && !hasMoney;
    const result = prevHasStarted && looksLikeBareDesc;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[QuickSmartParse] 续行判断: prevHasStarted=${prevHasStarted}, looksLikeBareDesc=${looksLikeBareDesc}, result=${result}`);
    }
    
    return result;
  }
  
  // 检测是否为服务项
  function isServiceLike(desc: string): boolean {
    return /(packing|handling|service|fee|charge|银行费|手续费)/i.test(desc || '');
  }
  
  // 检测是否为合计行
  function isTotalRow(cells: string[]): boolean {
    const text = cells.join(' ').toLowerCase();
    return /^(grand\s*)?total\b|total amount\b|合计/.test(text);
  }

  // 合并块检测（鲁棒实现）
  function detectMergedBlocks(
    processed: string[][],       // 去序号列后的数据区
    dataStartRow: number,
    remarkCol: number,
    descCol: number,
    rawCellCounts?: number[]     // 原始行的 cells.length（含表头/标题）
  ): MergedCell[] {
    const merged: MergedCell[] = [];
    const n = processed.length;

    const isServiceLike = (desc: string) =>
      /^packing|handling|charge|fee|subtotal|total/i.test(desc.trim());

    // 检测备注列合并
    let i = 0;
    while (i < n) {
      const remark = processed[i]?.[remarkCol]?.trim() ?? '';
      if (!remark) { 
        i++; 
        continue; 
      }

      const baseRawLen = rawCellCounts?.[i] ?? 0;
      let j = i + 1;

      while (j < n) {
        const nextRemark = processed[j]?.[remarkCol]?.trim() ?? '';

        if (nextRemark) break; // 新锚点，停止吞并

        const desc = processed[j]?.[descCol] ?? '';
        if (isServiceLike(desc)) break; // 服务/费用行，视为分隔

        const rawLen = rawCellCounts?.[j] ?? baseRawLen;
        if (rawLen + 2 <= baseRawLen) break; // 结构突降，谨慎停

        j++;
      }

      if (j - i >= 2) {
        merged.push({ 
          column: 'remarks', 
          startRow: i, 
          endRow: j - 1, 
          content: remark 
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[QuickSmartParse] 检测到备注合并块: ${i}-${j-1}, 内容: "${remark.substring(0, 50)}..."`);
        }
      }
      i = j;
    }

    // 检测描述列合并 - 暂时禁用
    // i = 0;
    // while (i < n) {
    //   const desc = processed[i]?.[descCol]?.trim() ?? '';
    //   if (!desc) { 
    //     i++; 
    //     continue; 
    //   }

    //   const baseRawLen = rawCellCounts?.[i] ?? 0;
    //   let j = i + 1;

    //   while (j < n) {
    //     const nextDesc = processed[j]?.[descCol]?.trim() ?? '';

    //     if (nextDesc) break; // 新锚点，停止吞并

    //     // 检查当前行的其他列是否有服务/费用标识
    //     const currentRowDesc = processed[j]?.[descCol] ?? '';
    //     const currentRowName = processed[j]?.[0] ?? ''; // 检查名称列
    //     if (isServiceLike(currentRowName)) break; // 服务/费用行，视为分隔

    //     const rawLen = rawCellCounts?.[j] ?? baseRawLen;
    //     if (rawLen + 2 <= baseRawLen) break; // 结构突降，谨慎停

    //     j++;
    //   }

    //   if (j - i >= 2) {
    //     merged.push({ 
    //       column: 'description', 
    //       startRow: i, 
    //       endRow: j - 1, 
    //       content: desc 
    //     });
        
    //     if (process.env.NODE_ENV === 'development') {
    //       console.log(`[QuickSmartParse] 检测到描述合并块: ${i}-${j-1}, 内容: "${desc.substring(0, 50)}..."`);
    //     }
    //   }
    //   i = j;
    // }
    
    return merged;
  }

  // 只处理数据行，跳过表头和说明行
  for (let i = 0; i < processedDataRowCells.length; i++) {
    let cells = processedDataRowCells[i];
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[QuickSmartParse] 处理第${i}行:`, cells);
    }
    
    if (cells.length < 2) { 
      if (process.env.NODE_ENV === 'development') {
        console.log(`[QuickSmartParse] 第${i}行跳过：列数不足`);
      }
      skipped++; 
      continue; 
    }

    const [c0, c1, c2, c3, c4] = cells;
    // 修复：根据是否有行号来确定名称字段位置
    const hasLineNo = !!c0 && /^\d+$/.test(c0.trim()) && c0.trim() !== '';
    const name = hasLineNo ? cleanTextContent(c1) : cleanTextContent(c0);
    
    // 跳过合计行 - 使用更严格的判断
    if (isTotalLine(c0, c1, c2, cells[cells.length - 1])) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[QuickSmartParse] 第${i}行跳过：总计行`);
      }
      skipped++;
      continue;
    }
    
    // 检查是否为续行
    if (isContinuationRow(cells) && currentItem) {
      const line = cells.join(' ').trim();
      if (process.env.NODE_ENV === 'development') {
        console.log(`[QuickSmartParse] 第${i}行识别为续行，合并到上一条:`, line);
      }
      
      // 根据内容把续行追加到更合适的字段
      if (/^\*?NFC|VEGA|V52|model|part\s*no/i.test(line)) {
        // 型号信息，追加到描述
        currentItem.description = currentItem.description
          ? `${currentItem.description}\n${line}`
          : line;
      } else if (/(obsolete|replacement|建议|替代|note|kindly)/i.test(line)) {
        // 备注信息，追加到备注
        currentItem.remarks = currentItem.remarks
          ? `${currentItem.remarks}\n${line}`
          : line;
      } else if (line.length > 0) {
        // 其他信息，追加到描述
        currentItem.description = currentItem.description
          ? `${currentItem.description}\n${line}`
          : line;
      }
      continue;
    }
    
    if (!name) { 
      if (process.env.NODE_ENV === 'development') {
        console.log(`[QuickSmartParse] 第${i}行跳过：名称为空`);
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`[QuickSmartParse] 第${i}行匹配模式1: name-qty-unit-price`);
      }
      const newItem = { 
        partName: name, 
        quantity: qty1, 
        unit: normUnit(c2), 
        unitPrice: price3 || 0, 
        description: cleanTextContent(c4)
      };
      rows.push(newItem);
      currentItem = newItem;
      prevHasStarted = true; // 标记已开始新条目
      if (!detectedFormat) detectedFormat = 'name-qty-unit-price';
      matched = true;
    }
      // 模式2: name, desc, qty, unit, price (5列)
      else if (cells.length >= 5) {
        const qty2 = parseNumberLike(c2);
        const c3IsUnitLike = c3 && c3.length <= 8 && !/^\d+\.?\d*$/.test(c3);
        const price4 = parseNumberLike(c4);
        
        if (qty2 > 0 && c3IsUnitLike && cleanTextContent(c1)) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[QuickSmartParse] 第${i}行匹配模式2: name-desc-qty-unit-price`);
          }
          const newItem = { 
            partName: name, 
            description: cleanTextContent(c1),
            quantity: qty2, 
            unit: normUnit(c3), 
            unitPrice: price4 || 0 
          };
          rows.push(newItem);
          currentItem = newItem;
          prevHasStarted = true; // 标记已开始新条目
          if (!detectedFormat) detectedFormat = 'name-desc-qty-unit-price';
          matched = true;
        }
      }
      // 模式3: name, desc, qty, price (4列，无单位)
      if (!matched) {
        const price3 = parseNumberLike(c3);
        if (qty2 > 0 && cleanTextContent(c1) && (!c3 || c3 === '' || /^\d+\.?\d*$/.test(c3))) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[QuickSmartParse] 第${i}行匹配模式3: name-desc-qty-price`);
          }
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
        if (process.env.NODE_ENV === 'development') {
          console.log(`[QuickSmartParse] 第${i}行匹配模式4: name-qty-price`);
        }
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`[QuickSmartParse] 第${i}行匹配模式5: name-qty`);
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`[QuickSmartParse] 第${i}行尝试特殊格式匹配`);
      }
      
      // 新增：处理特殊格式的表格（如您的表格）
      // 动态检测序号列，然后确定数量字段位置
      let qtyIndex, unitIndex, priceIndex;
      
      // 检查第1列是否是序号
      const hasLineNo = !!cells[0] && /^\d+$/.test(cells[0]?.trim()) && cells[0]?.trim() !== '';
      if (cells.length > 3 && hasLineNo) {
        // 有序号列：序号, 描述, 空, 数量, 单位, 价格, ...
        qtyIndex = 3; // 第4列（0-based index）
        unitIndex = 4; // 第5列
        priceIndex = 5; // 第6列
      } else {
        // 无序号列：名称, 空, 数量, 单位, 价格, ...
        qtyIndex = 2; // 第3列（0-based index）
        unitIndex = 3; // 第4列
        priceIndex = 4; // 第5列
      }
      
      if (cells.length > qtyIndex) {
        const qty = parseNumberLike(cells[qtyIndex]);
        const unit = cells.length > unitIndex ? cells[unitIndex] : '';
        const price = cells.length > priceIndex ? parseNumberLike(cells[priceIndex]) : 0;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[QuickSmartParse] 第${i}行特殊匹配: qty=${qty}, unit=${unit}, price=${price}`);
        }
        
        if (qty > 0 && !name.toLowerCase().includes('total')) {
          // 修复：根据是否有行号来确定描述字段位置
          const description = hasLineNo ? cleanTextContent(cells[1]) : cleanTextContent(cells[0]);
          const isService = isServiceLike(description);
          
          // 服务项：允许0单价；普通项：允许0单价（停产/替代建议场景）
          const shouldAccept = isService || true; // 暂时允许所有0单价
          
          if (shouldAccept) {
            // 处理备注内容
            const remarks = cells.length > 7 ? cleanTextContent(cells[7]) : '';
            
            const newItem = { 
              partName: name, 
              description: '', // 修复：不重复设置描述，只保留在partName中
              quantity: qty, 
              unit: normUnit(unit), 
              unitPrice: price,
              remarks: remarks
            };
            
            rows.push(newItem);
            currentItem = newItem; // 更新当前项，用于续行合并
            prevHasStarted = true; // 标记已开始新条目
            
            if (!detectedFormat) detectedFormat = 'table-format';
            matched = true;
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[QuickSmartParse] 第${i}行特殊匹配成功${isService ? '(服务项)' : ''}`);
              console.log(`[QuickSmartParse] 第${i}行备注提取: cells.length=${cells.length}, remark="${cells.length > 7 ? cleanTextContent(cells[7]) : ''}"`);
              console.log(`[QuickSmartParse] 第${i}行完整数据:`, {
                partName: name,
                quantity: qty,
                unit: normUnit(unit),
                unitPrice: price,
                remarks: remarks
              });
            }
          } else if (process.env.NODE_ENV === 'development') {
            console.log(`[QuickSmartParse] 第${i}行特殊匹配失败: 0单价被过滤`);
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.log(`[QuickSmartParse] 第${i}行特殊匹配失败: qty=${qty}, name包含total=${name.toLowerCase().includes('total')}`);
        }
      }
    }
    
    if (!matched) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[QuickSmartParse] 第${i}行跳过：不匹配任何模式`);
      }
      skipped++;
    }
  }

  // === 新增：增强列推断与管线集成 ===
  
  // 采样进行列推断（大数据集优化）
  // 使用包含表头的完整行数据，让表头识别能够工作
  const fullRows = maybeHeader ? allRowCells : dataRowCells;
  const sampleSize = Math.min(featureFlags.maxSampleSize, fullRows.length);
  const inference = featureFlags.enhancedInferenceEnabled 
    ? sampleBasedColumnDetection(fullRows, sampleSize)
    : { mapping: [], confidence: 0, evidence: [], mixedFormat: false };
  
  // 记录推断指标
  if (featureFlags.enhancedInferenceEnabled) {
    const mappingRecord: Record<string, number> = {};
    inference.mapping.forEach((field, index) => {
      if (field !== 'ignore') {
        mappingRecord[field] = index;
      }
    });
    
    parseMetrics.recordInference(
      inference.confidence,
      dataRowCells.length,
      Math.max(...dataRowCells.map(r => r.length)),
      inference.mixedFormat,
      mappingRecord
    );
    
    parseMetrics.recordMappingDistribution(inference.mapping);
  }
  
  // 基于推断结果重新解析行数据
  let enhancedRows: ParsedRow[] = [];
  let enhancedSkipped = 0;
  const allWarnings: ValidationWarning[] = [];
  
  if (false && featureFlags.enhancedInferenceEnabled && inference.confidence >= featureFlags.autoInsertThreshold) {
    // 高置信度：使用新的投影方式
    // 如果有表头，需要跳过表头行进行投影
    const rowsToProject = maybeHeader ? dataRowCells : dataRowCells;
    const projectedRows = batchProjectByMapping(rowsToProject, inference.mapping);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[QuickSmartParse] 增强解析结果:', {
        projectedRows: projectedRows.length,
        inference: inference.mapping,
        confidence: inference.confidence
      });
    }
    
    for (const projected of projectedRows) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[QuickSmartParse] 投影行:', projected);
      }
      
      if (projected.partName && projected.partName.trim()) {
        // 计算金额
        const quantity = projected.quantity || 0;
        const unitPrice = projected.unitPrice || 0;
        const completeRow: ParsedRow = {
          ...projected,
          partName: projected.partName,
          description: projected.description || '',
          quantity,
          unit: projected.unit || 'pc',
          unitPrice,
        };
        
        enhancedRows.push(completeRow);
        
        // 数据质量检查
        const warnings = validateRow(completeRow);
        allWarnings.push(...warnings);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('[QuickSmartParse] 跳过投影行，partName为空:', projected.partName);
        }
        enhancedSkipped++;
      }
    }
    
    // 使用增强结果替换原结果
    rows = enhancedRows;
    skipped = enhancedSkipped;
    
    // 记录成功使用增强解析
    parseMetrics.recordInsertResult(rows.length, skipped, 'enhanced');
  } else {
    // 低置信度：回退到原有逻辑，但仍做质量检查
    for (const row of rows) {
      const warnings = validateRow(row);
      allWarnings.push(...warnings);
    }
    
    // 记录使用传统解析
    parseMetrics.recordInsertResult(rows.length, skipped, 'legacy');
    
    // 记录回退原因
    if (featureFlags.enhancedInferenceEnabled) {
      let reason: 'low_confidence' | 'mixed_format' | 'too_many_columns' = 'low_confidence';
      if (inference.mixedFormat) reason = 'mixed_format';
      if (inference.mapping.filter(f => f === 'ignore').length >= 2) reason = 'too_many_columns';
      
      parseMetrics.recordPreviewReason(reason, {
        confidence: inference.confidence,
        rowCount: dataRowCells.length,
        colCount: Math.max(...dataRowCells.map(r => r.length))
      });
    }
  }
  
  // 记录警告统计
  if (featureFlags.showWarnings && allWarnings.length > 0) {
    parseMetrics.recordWarnings(allWarnings);
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
  
  // 使用增强列推断的置信度（已经是百分比），否则使用原有算法
  const enhancedConfidence = inference.confidence / 100; // 转换为0-1范围
  const originalConfidence = Math.min(1, 0.42 * rate + 0.2 * structureBonus + headerBonus + excelBonus + sequenceBonus + descriptionBonus);
  
  // 如果增强推断可用且置信度更高，使用增强结果
  const confidence = inference.confidence >= 65 ? enhancedConfidence : originalConfidence;

  // 发送指标数据
  parseMetrics.send();
  
  // 生成列映射
  const colMap: Record<string, number> = {};
  if (processedDataRowCells.length > 0) {
    const maxCols = Math.max(...processedDataRowCells.map(row => row.length));
    // 根据列数推断列映射（移除序号列后的索引）
    if (maxCols >= 8) {
      colMap.partName = 0;
      colMap.description = 0; // 修复：Description 应该是 0，不是 1
      colMap.quantity = 2;
      colMap.unit = 3;
      colMap.unitPrice = 4;
      colMap.amount = 5;
      colMap.deliveryTime = 6;
      colMap.remarks = 7;
    }
  }
  
  // 检测合并单元格
  const remarkCol = colMap.remarks ?? 7;
  const descCol = colMap.description ?? 0; // 修复：Description 应该是 0，不是 1
  const rawCellCounts = allRowCells.map(row => row.length).slice(dataStartRow);
  const mergedCells = detectMergedBlocks(processedDataRowCells, 0, remarkCol, descCol, rawCellCounts);
  
  // 分离备注和描述的合并信息
  const mergedRemarks = mergedCells.filter(cell => cell.column === 'remarks');
  // 暂时禁用description列的合并单元格检测
  const mergedDescriptions: MergedCell[] = [];
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[Parse:merged]', { 
      dataStartRow, 
      remarkCol,
      descCol,
      mergedRemarks,
      mergedDescriptions,
      colMap 
    });
  }
  
  return { 
    rows, 
    skipped, 
    confidence, 
    detectedFormat: detectedFormat || 'unknown',
    inference,
    stats: {
      toInsert: ok,
      toSkip: skipped,
      warnings: allWarnings
    },
    dataStartRow,
    remarkCol,
    descCol,
    mergedRemarks,
    mergedDescriptions,
    colMap
  };
}
