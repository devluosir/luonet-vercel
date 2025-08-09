// 数据质量校验与修复模块
export type ValidationType =
  | 'MISSING_UNIT'
  | 'SUSPICIOUS_UNIT'
  | 'QTY_ZERO'
  | 'PRICE_ZERO'
  | 'TINY_PRICE'
  | 'LARGE_QTY'
  | 'NAME_TOO_SHORT'
  | 'DUPLICATE_NAME'
  | 'MIXED_CURRENCY';

export interface ValidationWarning {
  type: ValidationType;
  message: string;
  rowIndex: number;
  field?: keyof ParsedRow;
}

// 复用quickSmartParse中的类型定义
import type { ParsedRow as SmartParseRow } from '../../features/quotation/utils/quickSmartParse';

export interface ParsedRow {
  partName: string;
  description?: string;
  quantity: number;
  unit?: string; // 兼容原有类型，可能为undefined
  unitPrice: number;
  currency?: string; // 可选：若系统已有全局币种，这里可忽略
}

const UNIT_MAP: Record<string, string> = {
  pc: 'pc', pcs: 'pc', piece: 'pc', pieces: 'pc', 
  set: 'set', sets: 'set',
  kg: 'kg', g: 'g', lb: 'lb', 
  m: 'm', mm: 'mm', cm: 'cm', inch: 'inch', ft: 'ft',
  l: 'l', ml: 'ml', gal: 'gal',
  box: 'box', boxes: 'box',
  pack: 'pack', packs: 'pack',
  roll: 'roll', rolls: 'roll',
  // 中文单位
  个: 'pc', 件: 'pc', 套: 'set', 台: 'set',
  公斤: 'kg', 克: 'g', 米: 'm', 毫米: 'mm', 厘米: 'cm',
  升: 'l', 毫升: 'ml', 箱: 'box', 包: 'pack', 卷: 'roll'
};

const SUSPICIOUS_UNITS = new Set(['', '-', 'unit', 'ea', 'qty', 'n/a', 'NA', 'null', 'undefined', '?', 'TBD']);

export interface ValidatorConfig {
  minNameLen: number;
  tinyPrice: number;         // e.g. 0.01
  largeQty: number;          // e.g. 1e6
  requireUnit: boolean;
}

export const DEFAULT_VALIDATOR_CONFIG: ValidatorConfig = {
  minNameLen: 2,
  tinyPrice: 0.01,
  largeQty: 1_000_000,
  requireUnit: true,
};

export function normalizeUnit(u?: string): string {
  if (!u) return '';
  const key = u.trim().toLowerCase();
  return UNIT_MAP[key] ?? key;
}

export function detectCurrencyPrefix(text?: string): string | null {
  if (!text) return null;
  if (/^\s*\$/.test(text)) return 'USD';
  if (/^\s*€/.test(text)) return 'EUR';
  if (/^\s*¥/.test(text)) return 'CNY';
  if (/^\s*£/.test(text)) return 'GBP';
  if (/^\s*HK\$/.test(text)) return 'HKD';
  if (/^\s*S\$/.test(text)) return 'SGD';
  if (/^\s*AU\$/.test(text)) return 'AUD';
  if (/^\s*CA\$/.test(text)) return 'CAD';
  return null;
}

/** 纯数清洗：去掉千分位、货币符号，保留小数点和负号 */
export function cleanNumberLike(text: string | number): number {
  if (typeof text === 'number') return text;
  let s = text.trim();
  
  // 去除货币符号和千分位逗号、空格
  s = s.replace(/[,$€£¥\s]/g, '');
  // 去除货币代码前缀
  s = s.replace(/^(USD|EUR|CNY|GBP|HKD|SGD|AUD|CAD|RMB)\s*/i, '');
  // 处理开头的小数点
  s = s.replace(/^\./, '0.');
  
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function validateRows(rows: ParsedRow[], cfg: ValidatorConfig = DEFAULT_VALIDATOR_CONFIG): ValidationWarning[] {
  const warns: ValidationWarning[] = [];
  const nameIndex: Record<string, number[]> = {};
  const currencies = new Set<string>();

  rows.forEach((r, i) => {
    const unitNorm = normalizeUnit(r.unit || '');
    
    // 单位相关检查
    if (cfg.requireUnit && !unitNorm) {
      warns.push({ 
        type: 'MISSING_UNIT', 
        message: `第 ${i+1} 行缺少单位`, 
        rowIndex: i, 
        field: 'unit' 
      });
    }
    if (unitNorm && SUSPICIOUS_UNITS.has(unitNorm.toLowerCase())) {
      warns.push({ 
        type: 'SUSPICIOUS_UNIT', 
        message: `第 ${i+1} 行单位可疑：${r.unit}`, 
        rowIndex: i, 
        field: 'unit' 
      });
    }
    
    // 数量检查
    if (!r.quantity || r.quantity <= 0) {
      warns.push({ 
        type: 'QTY_ZERO', 
        message: `第 ${i+1} 行数量为0或缺失`, 
        rowIndex: i, 
        field: 'quantity' 
      });
    } else if (r.quantity > cfg.largeQty) {
      warns.push({ 
        type: 'LARGE_QTY', 
        message: `第 ${i+1} 行数量异常大（${r.quantity.toLocaleString()}）`, 
        rowIndex: i, 
        field: 'quantity' 
      });
    }
    
    // 价格检查
    if (r.unitPrice === 0) {
      warns.push({ 
        type: 'PRICE_ZERO', 
        message: `第 ${i+1} 行单价为0`, 
        rowIndex: i, 
        field: 'unitPrice' 
      });
    } else if (r.unitPrice > 0 && r.unitPrice < cfg.tinyPrice) {
      warns.push({ 
        type: 'TINY_PRICE', 
        message: `第 ${i+1} 行单价过小（${r.unitPrice}）`, 
        rowIndex: i, 
        field: 'unitPrice' 
      });
    }
    
    // 名称检查
    if (!r.partName || r.partName.trim().length < cfg.minNameLen) {
      warns.push({ 
        type: 'NAME_TOO_SHORT', 
        message: `第 ${i+1} 行名称过短`, 
        rowIndex: i, 
        field: 'partName' 
      });
    }
    
    // 收集重名和货币信息
    const key = r.partName?.trim().toLowerCase();
    if (key) (nameIndex[key] ??= []).push(i);
    
    if (r.currency) {
      currencies.add(r.currency);
    }
  });

  // 重名检测
  Object.entries(nameIndex).forEach(([name, indices]) => {
    if (indices.length > 1) {
      indices.forEach((rowIndex) => {
        warns.push({ 
          type: 'DUPLICATE_NAME', 
          message: `名称重复（将被合并）：${rows[rowIndex].partName}`, 
          rowIndex 
        });
      });
    }
  });
  
  // 混合货币检测
  if (currencies.size > 1) {
    const currencyList = Array.from(currencies).join(', ');
    rows.forEach((r, i) => {
      if (r.currency && currencies.size > 1) {
        warns.push({
          type: 'MIXED_CURRENCY',
          message: `检测到混合货币（${currencyList}）`,
          rowIndex: i,
          field: 'unitPrice'
        });
      }
    });
  }

  return warns;
}
