// 增强列识别和数据质量验证系统
import { ColumnField, ColumnEvidence, ColumnInference, ValidationWarning, ParsedRow } from './quickSmartParse';
import { hungarian, buildCostMatrix } from '../../../utils/hungarian';

// 重用现有的单位映射和词典
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

const CURRENCY_SYMBOLS = /[$€¥£₹₩¢₨₽₡₪₦₨]/;
const CURRENCY_CODES = /\b(USD|EUR|CNY|JPY|GBP|CAD|AUD|CHF|HKD|SGD|RMB)\b/i;

function normUnit(u?: string) {
  if (!u) return 'pc';
  const cleaned = u.trim().replace(/^["']|["']$/g, '');
  const k = cleaned.toLowerCase();
  return UNIT_MAP[k] || (k.endsWith('s') && UNIT_MAP[k.slice(0, -1)] ? UNIT_MAP[k.slice(0, -1)] : cleaned);
}

function cleanTextContent(s?: string) {
  if (!s) return '';
  return s.trim()
    .replace(/^["']|["']$/g, '') 
    .replace(/""/g, '"') 
    .trim();
}

interface ColumnStats {
  index: number;
  samples: string[];
  numericRatio: number;
  positiveRatio: number;
  decimalRatio: number;
  currencyRatio: number;
  unitMatchRatio: number;
  avgLength: number;
  containsSpecs: boolean;
}

function analyzeColumnPatterns(rows: string[][]): ColumnStats[] {
  if (rows.length === 0) return [];
  
  const maxCols = Math.max(...rows.map(r => r.length));
  const stats: ColumnStats[] = [];
  
  for (let colIndex = 0; colIndex < maxCols; colIndex++) {
    const samples = rows.map(r => r[colIndex] || '').filter(s => s.trim());
    const cleanSamples = samples.map(s => cleanTextContent(s));
    
    let numericCount = 0;
    let positiveCount = 0;
    let decimalCount = 0;
    let currencyCount = 0;
    let unitMatchCount = 0;
    let totalLength = 0;
    let specsCount = 0;
    
    for (const sample of cleanSamples) {
      totalLength += sample.length;
      
      // 数字检测
      const num = parseFloat(sample.replace(/[^\d.-]/g, ''));
      if (!isNaN(num)) {
        numericCount++;
        if (num > 0) positiveCount++;
        if (sample.includes('.') || sample.includes(',')) decimalCount++;
      }
      
      // 货币符号检测
      if (CURRENCY_SYMBOLS.test(sample) || CURRENCY_CODES.test(sample)) {
        currencyCount++;
      }
      
      // 单位检测
      const normalized = normUnit(sample);
      if (UNIT_DICT.has(normalized) || UNIT_DICT.has(sample.toLowerCase())) {
        unitMatchCount++;
      }
      
      // 规格描述检测 (M6, Φ20, SS304, etc.)
      if (/[A-Z]\d+|Φ\d+|M\d+|SS\d+|PN\d+|\d+[A-Z]+/.test(sample)) {
        specsCount++;
      }
    }
    
    const sampleCount = cleanSamples.length || 1;
    stats.push({
      index: colIndex,
      samples: cleanSamples.slice(0, 5), // 保留前5个样本用于调试
      numericRatio: numericCount / sampleCount,
      positiveRatio: positiveCount / sampleCount,
      decimalRatio: decimalCount / sampleCount,
      currencyRatio: currencyCount / sampleCount,
      unitMatchRatio: unitMatchCount / sampleCount,
      avgLength: totalLength / sampleCount,
      containsSpecs: specsCount > 0
    });
  }
  
  return stats;
}

function scoreColumns(stats: ColumnStats[]): Map<number, Map<ColumnField, ColumnEvidence>> {
  const scores = new Map<number, Map<ColumnField, ColumnEvidence>>();
  
  for (const colStat of stats) {
    const colScores = new Map<ColumnField, ColumnEvidence>();
    
    // 数量列检测
    if (colStat.numericRatio >= 0.8 && colStat.positiveRatio >= 0.8 && colStat.avgLength <= 8) {
      colScores.set('qty', {
        rule: 'qty_detection',
        weight: 1.0,
        hit: Math.round(colStat.numericRatio * 100),
        score: colStat.numericRatio * colStat.positiveRatio * (colStat.decimalRatio <= 0.3 ? 1.2 : 0.8)
      });
    }
    
    // 价格列检测
    if (colStat.numericRatio >= 0.8 && colStat.positiveRatio >= 0.8) {
      const priceScore = colStat.numericRatio * colStat.positiveRatio * 
        (colStat.currencyRatio > 0 ? 1.3 : 1) * 
        (colStat.decimalRatio >= 0.3 ? 1.2 : 0.9);
      colScores.set('price', {
        rule: 'price_detection',
        weight: 1.0,
        hit: Math.round(colStat.numericRatio * 100),
        score: priceScore
      });
    }
    
    // 单位列检测
    if (colStat.unitMatchRatio >= 0.6 && colStat.avgLength <= 8) {
      colScores.set('unit', {
        rule: 'unit_detection',
        weight: 1.0,
        hit: Math.round(colStat.unitMatchRatio * 100),
        score: colStat.unitMatchRatio * 1.2
      });
    }
    
    // 名称列检测
    if (colStat.numericRatio <= 0.2 && colStat.avgLength >= 2 && colStat.avgLength <= 40) {
      colScores.set('name', {
        rule: 'name_detection',
        weight: 1.0,
        hit: Math.round((1 - colStat.numericRatio) * 100),
        score: (1 - colStat.numericRatio) * Math.min(1, colStat.avgLength / 10)
      });
    }
    
    // 描述列检测
    if (colStat.numericRatio <= 0.3 && (colStat.avgLength > 15 || colStat.containsSpecs)) {
      colScores.set('desc', {
        rule: 'desc_detection', 
        weight: 1.0,
        hit: colStat.containsSpecs ? 100 : Math.round(colStat.avgLength / 2),
        score: (colStat.containsSpecs ? 1.0 : 0.6) * Math.min(1, colStat.avgLength / 20)
      });
    }
    
    scores.set(colStat.index, colScores);
  }
  
  return scores;
}

function chooseBestMapping(colScores: Map<number, Map<ColumnField, ColumnEvidence>>): ColumnField[] {
  const numCols = colScores.size;
  if (numCols === 0) return [];
  
  // 构建得分矩阵 [列][字段]
  const fields: ColumnField[] = ['name', 'desc', 'qty', 'unit', 'price'];
  const scoreMatrix: number[][] = [];
  
  for (let colIndex = 0; colIndex < numCols; colIndex++) {
    const colFieldScores = colScores.get(colIndex) || new Map();
    const scoreRow: number[] = [];
    
    for (const field of fields) {
      const evidence = colFieldScores.get(field);
      scoreRow.push(evidence?.score || 0);
    }
    scoreMatrix.push(scoreRow);
  }
  
  // 使用匈牙利算法求最优分配
  const { matrix: costMatrix, fieldMapping } = buildCostMatrix(scoreMatrix, fields, true);
  const { assignment } = hungarian(costMatrix);
  
  // 将分配结果映射回ColumnField数组
  const mapping: ColumnField[] = [];
  for (let colIndex = 0; colIndex < numCols; colIndex++) {
    const assignedFieldIndex = assignment[colIndex];
    if (assignedFieldIndex !== undefined && assignedFieldIndex < fieldMapping.length) {
      mapping.push(fieldMapping[assignedFieldIndex] as ColumnField);
    } else {
      mapping.push('ignore');
    }
  }
  
  return mapping;
}

function detectMixedFormats(rows: string[][], mapping: ColumnField[]): boolean {
  // 检测同一列在不同行中的格式是否一致
  const colVariances: number[] = [];
  
  for (let colIndex = 0; colIndex < mapping.length; colIndex++) {
    const field = mapping[colIndex];
    if (field === 'ignore') continue;
    
    const colValues = rows.map(r => r[colIndex] || '').filter(v => v.trim());
    if (colValues.length < 2) continue;
    
    // 计算长度方差作为格式一致性指标
    const lengths = colValues.map(v => v.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    colVariances.push(variance);
  }
  
  // 如果任一列的方差过大，认为是混合格式
  return colVariances.some(v => v > 100);
}

function calcConfidence(colScores: Map<number, Map<ColumnField, ColumnEvidence>>, rowCount: number, mixed: boolean): number {
  if (colScores.size === 0) return 0;
  
  // 构建得分数组便于统计
  const allScores: number[] = [];
  let colBestSum = 0;
  
  // 使用Array.from避免迭代器兼容性问题
  Array.from(colScores.values()).forEach(fieldScores => {
    let bestScore = 0;
    Array.from(fieldScores.values()).forEach(evidence => {
      allScores.push(evidence.score);
      bestScore = Math.max(bestScore, evidence.score);
    });
    colBestSum += bestScore;
  });
  
  // 列最佳得分平均值 (0-1)
  const colBestAvg = colBestSum / colScores.size;
  
  // 一致性：方差越小越好 (0-1)
  const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const variance = allScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / allScores.length;
  const consistency = 1 - Math.min(1, Math.sqrt(variance));
  
  // 样本数加成：行数越多越可信，最高+0.2
  const rowBonus = Math.min(0.2, rowCount / 250);
  
  // 混合格式惩罚
  const mixedPenalty = mixed ? 0.15 : 0;
  
  // 综合得分
  let confidence = colBestAvg * 0.7 + consistency * 0.3 + rowBonus - mixedPenalty;
  confidence = Math.max(0, Math.min(1, confidence));
  
  // 返回百分比形式 (0-100)
  return Math.round(confidence * 100);
}

export function enhancedColumnDetection(rows: string[][]): ColumnInference {
  if (rows.length === 0) {
    return {
      mapping: [],
      confidence: 0,
      evidence: [],
      mixedFormat: false
    };
  }
  
  const colStats = analyzeColumnPatterns(rows);
  const colScores = scoreColumns(colStats);
  const mapping = chooseBestMapping(colScores);
  const mixed = detectMixedFormats(rows, mapping);
  const confidence = calcConfidence(colScores, rows.length, mixed);
  
  // 生成证据链
  const evidence: ColumnEvidence[] = [];
  Array.from(colScores.entries()).forEach(([colIndex, fieldScores]) => {
    const bestField = mapping[colIndex];
    if (bestField !== 'ignore' && fieldScores.has(bestField)) {
      evidence.push(fieldScores.get(bestField)!);
    }
  });
  
  return {
    mapping,
    confidence,
    evidence,
    mixedFormat: mixed
  };
}

// === 数据质量验证系统 ===

export function validateRow(row: ParsedRow): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  // 大数量检测
  if (row.quantity != null && row.quantity > 10000) {
    warnings.push({
      type: 'large_quantity',
      field: 'quantity',
      message: `数量过大: ${row.quantity}`,
      severity: 'warning'
    });
  }
  
  // 微小价格检测
  if (row.unitPrice != null && row.unitPrice > 0 && row.unitPrice < 0.01) {
    warnings.push({
      type: 'tiny_price',
      field: 'unitPrice',
      message: `价格过小: ${row.unitPrice}`,
      severity: 'warning'
    });
  }
  
  // 可疑单位检测
  if (row.unit && !UNIT_DICT.has(normUnit(row.unit)) && !UNIT_DICT.has(row.unit.toLowerCase())) {
    warnings.push({
      type: 'suspicious_unit',
      field: 'unit',
      message: `未识别的单位: ${row.unit}`,
      severity: 'info'
    });
  }
  
  // 零值检测
  if (row.quantity === 0 || row.unitPrice === 0) {
    warnings.push({
      type: 'zero_qty_or_price',
      field: row.quantity === 0 ? 'quantity' : 'unitPrice',
      message: `存在零值`,
      severity: 'warning'
    });
  }
  
  // 名称太短检测
  if (row.partName && row.partName.trim().length < 2) {
    warnings.push({
      type: 'name_too_short',
      field: 'partName',
      message: `名称过短: "${row.partName}"`,
      severity: 'error'
    });
  }
  
  return warnings;
}

// === 解析管线与投影系统 ===

/**
 * 投影器：将原始行数据按列映射转换为标准字段对象
 */
export function projectByMapping(row: string[], mapping: ColumnField[]): Partial<ParsedRow> {
  const result: Partial<ParsedRow> = {};
  
  for (let i = 0; i < Math.min(row.length, mapping.length); i++) {
    const field = mapping[i];
    const value = row[i]?.trim();
    
    if (!value || field === 'ignore') continue;
    
    switch (field) {
      case 'name':
        result.partName = cleanTextContent(value);
        break;
      case 'desc':
        result.description = cleanTextContent(value);
        break;
      case 'qty':
        result.quantity = parseQuantity(value);
        break;
      case 'unit':
        result.unit = normUnit(value);
        break;
      case 'price':
        result.unitPrice = parsePrice(value);
        break;
    }
  }
  
  return result;
}

/**
 * 解析数量：支持小数和整数
 */
function parseQuantity(s: string): number {
  const cleaned = s.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.max(0, num);
}

/**
 * 解析价格：支持货币符号和小数逗号
 */
function parsePrice(s: string): number {
  // 移除货币符号和非数字字符，保留小数点和负号
  let cleaned = s.replace(/[^\d.,-]/g, '');
  
  // 处理小数逗号：如果有逗号但没有点，且逗号后<=2位数字，当作小数点
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    const commaIndex = cleaned.lastIndexOf(',');
    const afterComma = cleaned.slice(commaIndex + 1);
    if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
      cleaned = cleaned.replace(',', '.');
    }
  }
  
  // 移除千位分隔符（逗号）
  cleaned = cleaned.replace(/,/g, '');
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.max(0, num);
}

/**
 * 采样解析：对大数据集只取前N行进行列推断
 */
export function sampleBasedColumnDetection(rows: string[][], maxSampleSize = 50): ColumnInference {
  const sampleRows = rows.slice(0, Math.min(rows.length, maxSampleSize));
  return enhancedColumnDetection(sampleRows);
}

/**
 * 批量投影：优化版本，适用于大数据集
 */
export function batchProjectByMapping(rows: string[][], mapping: ColumnField[]): ParsedRow[] {
  const results: ParsedRow[] = [];
  
  for (const row of rows) {
    const projected = projectByMapping(row, mapping);
    
    // 只有当有有效数据时才添加
    if (projected.partName || projected.quantity || projected.unitPrice) {
      results.push({
        partName: projected.partName || '',
        description: projected.description || '',
        quantity: projected.quantity || 0,
        unit: projected.unit || 'pc',
        unitPrice: projected.unitPrice || 0
      });
    }
  }
  
  return results;
}

// === 性能优化：缓存和防抖 ===

// 简单的LRU缓存
const parseCache = new Map<string, any>();
const MAX_CACHE_SIZE = 1000;

function getCachedResult<T>(key: string, factory: () => T): T {
  if (parseCache.has(key)) {
    return parseCache.get(key);
  }
  
  const result = factory();
  
  if (parseCache.size >= MAX_CACHE_SIZE) {
    const firstKey = parseCache.keys().next().value;
    if (firstKey !== undefined) {
      parseCache.delete(firstKey);
    }
  }
  
  parseCache.set(key, result);
  return result;
}

/**
 * 缓存版本的单位规范化
 */
export function cachedNormUnit(unit: string): string {
  return getCachedResult(`unit:${unit}`, () => normUnit(unit));
}

/**
 * 快速哈希函数（用于粘贴内容缓存）
 */
export function quickHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}
