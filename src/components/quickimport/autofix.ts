// 数据自动修复模块
import { ParsedRow, normalizeUnit, cleanNumberLike } from './validators';

export interface FixPatch {
  rowIndex?: number;                    // 作用于行
  replace?: Partial<ParsedRow>;         // 字段替换
  dropRow?: boolean;                    // 删除无效行
  mergeInto?: number;                   // 合并到指定行
}

export interface AutoFixOptions {
  defaultUnit: string;                  // e.g. 'pc'
  roundPriceTo?: number;                // 小数位，e.g. 2
  mergeDuplicates?: boolean;            // 是否合并重名项
  keepFirstCurrency?: boolean;          // 保留第一条的币种
  cleanNumbers?: boolean;               // 是否清洗数字格式
  minQuantity?: number;                 // 最小有效数量
  maxQuantity?: number;                 // 最大有效数量
}

export const DEFAULT_AUTOFIX: AutoFixOptions = {
  defaultUnit: 'pc',
  roundPriceTo: 2,
  mergeDuplicates: true,
  keepFirstCurrency: true,
  cleanNumbers: true,
  minQuantity: 0.001,
  maxQuantity: 1_000_000,
};

export interface FixReport {
  totalPatches: number;
  droppedRows: number;
  mergedRows: number;
  fixedUnits: number;
  fixedNumbers: number;
  summary: string;
}

export function generateAutoFixes(rows: ParsedRow[], opts: AutoFixOptions = DEFAULT_AUTOFIX): { patches: FixPatch[], report: FixReport } {
  const patches: FixPatch[] = [];
  let droppedRows = 0;
  let fixedUnits = 0;
  let fixedNumbers = 0;
  let mergedRows = 0;

  // 第一轮：清洗和标准化
  rows.forEach((r, i) => {
    const next: Partial<ParsedRow> = {};
    let hasChanges = false;

    // 清洗数量/单价（如果有原始字符串数据）
    if (opts.cleanNumbers) {
      const rawQty = (r as any)._rawQuantity;
      const rawPrice = (r as any)._rawUnitPrice;
      
      if (typeof rawQty === 'string') {
        const q = cleanNumberLike(rawQty);
        if (Number.isFinite(q) && q !== r.quantity) {
          next.quantity = q;
          hasChanges = true;
          fixedNumbers++;
        }
      }
      
      if (typeof rawPrice === 'string') {
        const p = cleanNumberLike(rawPrice);
        if (Number.isFinite(p) && p !== r.unitPrice) {
          next.unitPrice = p;
          hasChanges = true;
          fixedNumbers++;
        }
      }
    }

    // 单位归一化与兜底
    const unitNorm = normalizeUnit(r.unit || '');
    if (!unitNorm) {
      next.unit = opts.defaultUnit;
      hasChanges = true;
      fixedUnits++;
    } else if (unitNorm !== r.unit) {
      next.unit = unitNorm;
      hasChanges = true;
      fixedUnits++;
    }

    // 价格四舍五入
    const price = next.unitPrice ?? r.unitPrice;
    if (typeof price === 'number' && Number.isFinite(price) && opts.roundPriceTo !== undefined) {
      const pow = Math.pow(10, opts.roundPriceTo);
      const rounded = Math.round(price * pow) / pow;
      if (rounded !== price) {
        next.unitPrice = rounded;
        hasChanges = true;
      }
    }

    // 数量边界检查
    const quantity = next.quantity ?? r.quantity;
    if (opts.minQuantity !== undefined && quantity < opts.minQuantity) {
      next.quantity = opts.minQuantity;
      hasChanges = true;
    }
    if (opts.maxQuantity !== undefined && quantity > opts.maxQuantity) {
      next.quantity = opts.maxQuantity;
      hasChanges = true;
    }

    // 检查是否需要删除行（无效数据）
    const finalQty = next.quantity ?? r.quantity;
    const finalPrice = next.unitPrice ?? r.unitPrice;
    const finalName = (next.partName ?? r.partName)?.trim();
    
    if (!finalName || 
        !Number.isFinite(finalQty) || finalQty <= 0 ||
        !Number.isFinite(finalPrice) || finalPrice < 0) {
      patches.push({ rowIndex: i, dropRow: true });
      droppedRows++;
      return;
    }

    if (hasChanges) {
      patches.push({ rowIndex: i, replace: next });
    }
  });

  // 第二轮：合并重复项
  if (opts.mergeDuplicates) {
    const mergePatches = mergeDuplicateRows(rows, patches);
    patches.push(...mergePatches);
    mergedRows = mergePatches.filter(p => p.dropRow).length;
  }

  const report: FixReport = {
    totalPatches: patches.length,
    droppedRows,
    mergedRows,
    fixedUnits,
    fixedNumbers,
    summary: generateSummary(droppedRows, mergedRows, fixedUnits, fixedNumbers)
  };

  return { patches, report };
}

function generateSummary(dropped: number, merged: number, units: number, numbers: number): string {
  const parts: string[] = [];
  if (units > 0) parts.push(`标准化${units}个单位`);
  if (numbers > 0) parts.push(`清洗${numbers}个数值`);
  if (merged > 0) parts.push(`合并${merged}个重复项`);
  if (dropped > 0) parts.push(`移除${dropped}个无效行`);
  
  return parts.length > 0 ? parts.join('，') : '无需修复';
}

/** 合并重名项：数量相加，保留第一条描述/币种/单价 */
function mergeDuplicateRows(rows: ParsedRow[], existingPatches: FixPatch[]): FixPatch[] {
  const byName = new Map<string, number[]>();
  const toBeDropped = new Set(existingPatches.filter(p => p.dropRow).map(p => p.rowIndex));
  
  rows.forEach((r, i) => {
    if (toBeDropped.has(i)) return; // 跳过将被删除的行
    
    const key = r.partName?.trim().toLowerCase();
    if (!key) return;
    
    const arr = byName.get(key) ?? [];
    arr.push(i);
    byName.set(key, arr);
  });

  const patches: FixPatch[] = [];
  
  byName.forEach((indices) => {
    if (indices.length <= 1) return;
    
    indices.sort((a, b) => a - b);
    const keepIndex = indices[0];
    let totalQty = 0;
    
    // 计算总数量
    indices.forEach((idx) => {
      const existingReplace = existingPatches.find(p => p.rowIndex === idx)?.replace;
      const qty = existingReplace?.quantity ?? rows[idx].quantity ?? 0;
      totalQty += qty;
    });

    // 更新保留行的数量
    patches.push({ 
      rowIndex: keepIndex, 
      replace: { quantity: totalQty } 
    });
    
    // 标记其他行为删除
    indices.slice(1).forEach((idx) => {
      patches.push({ rowIndex: idx, dropRow: true });
    });
  });
  
  return patches;
}

/** 应用修复补丁 */
export function applyFixes(rows: ParsedRow[], patches: FixPatch[]): ParsedRow[] {
  const result = rows.map((r) => ({ ...r }));
  
  // 按rowIndex排序，确保稳定的处理顺序
  const sortedPatches = [...patches].sort((a, b) => 
    (a.rowIndex ?? -1) - (b.rowIndex ?? -1)
  );
  
  // 应用替换操作
  sortedPatches.forEach((patch) => {
    if (patch.rowIndex === undefined) return;
    if (patch.replace && !patch.dropRow) {
      result[patch.rowIndex] = { ...result[patch.rowIndex], ...patch.replace };
    }
  });
  
  // 过滤掉要删除的行
  const indicesToDrop = new Set(
    sortedPatches
      .filter(p => p.dropRow && p.rowIndex !== undefined)
      .map(p => p.rowIndex!)
  );
  
  return result.filter((_, index) => !indicesToDrop.has(index));
}

/** 预览修复效果（不实际应用） */
export function previewFixes(rows: ParsedRow[], patches: FixPatch[]): {
  original: ParsedRow[];
  fixed: ParsedRow[];
  changes: Array<{
    rowIndex: number;
    action: 'modify' | 'drop' | 'merge';
    details: string;
  }>;
} {
  const changes: Array<{
    rowIndex: number;
    action: 'modify' | 'drop' | 'merge';
    details: string;
  }> = [];
  
  patches.forEach((patch) => {
    if (patch.rowIndex === undefined) return;
    
    if (patch.dropRow) {
      changes.push({
        rowIndex: patch.rowIndex,
        action: 'drop',
        details: '行将被删除（无效数据或重复项）'
      });
    } else if (patch.replace) {
      const details = Object.entries(patch.replace)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      changes.push({
        rowIndex: patch.rowIndex,
        action: 'modify',
        details: `将修改: ${details}`
      });
    }
  });
  
  return {
    original: [...rows],
    fixed: applyFixes(rows, patches),
    changes
  };
}
