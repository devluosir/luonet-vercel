/**
 * localStorage配额管理器
 * 提供智能的存储空间管理和数据清理策略
 */

const STORAGE_KEYS = {
  quotation: 'quotation_history',
  invoice: 'invoice_history',
  packing: 'packing_history',
  purchase: 'purchase_history'
};

const isQuotaExceededError = (error: unknown): boolean => (
  error instanceof DOMException &&
  (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
);

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : String(error)
);

/**
 * 检查localStorage使用情况
 */
export function checkStorageUsage(): { used: number; available: number; percentage: number } {
  if (typeof window === 'undefined') {
    return { used: 0, available: 0, percentage: 0 };
  }

  let used = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length;
    }
  }

  // 大多数浏览器的localStorage限制是5-10MB
  const available = 5 * 1024 * 1024; // 5MB
  const percentage = (used / available) * 100;

  return { used, available, percentage };
}

/**
 * 智能清理localStorage
 */
export function smartCleanup(): { cleaned: number; freed: number } {
  if (typeof window === 'undefined') {
    return { cleaned: 0, freed: 0 };
  }

  let cleaned = 0;
  let freed = 0;

  // 清理优先级：临时数据 > 草稿数据 > 缓存数据 > 历史记录
  const cleanupPriority = [
    // 1. 临时数据（最优先清理）
    (key: string) => key.includes('temp') || key.includes('cache'),
    // 2. 草稿数据
    (key: string) => key.includes('draft') || key.includes('v2'),
    // 3. 其他非关键数据
    (key: string) => !Object.values(STORAGE_KEYS).includes(key) &&
                     !key.includes('quotation') &&
                     !key.includes('invoice') &&
                     !key.includes('packing') &&
                     !key.includes('purchase')
  ];

  for (const predicate of cleanupPriority) {
    const keysToClean = Object.keys(localStorage).filter(predicate);

    for (const key of keysToClean) {
      try {
        const size = localStorage[key].length;
        localStorage.removeItem(key);
        cleaned++;
        freed += size;
      } catch (error) {
        console.warn(`清理键 ${key} 失败:`, error);
      }
    }
  }

  console.log(`清理了 ${cleaned} 个键，释放了 ${(freed / 1024).toFixed(2)}KB 空间`);
  return { cleaned, freed };
}

/**
 * 安全保存数据到localStorage
 */
export function safeSaveToStorage(
  key: string,
  data: unknown,
  maxRetries: number = 3
): { success: boolean; message: string; trimmed?: boolean } {
  if (typeof window === 'undefined') {
    return { success: false, message: 'localStorage不可用' };
  }

  const serialized = JSON.stringify(data);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      localStorage.setItem(key, serialized);
      return { success: true, message: '保存成功' };
    } catch (error: unknown) {
      if (isQuotaExceededError(error)) {
        console.warn(`存储配额超限，尝试 ${attempt + 1}/${maxRetries}...`);

        if (attempt === 0) {
          // 第一次尝试：智能清理
          smartCleanup();
        } else if (attempt === 1) {
          // 第二次尝试：清理更多数据
          const { cleaned } = smartCleanup();
          if (cleaned === 0) {
            // 如果无法清理更多数据，尝试压缩数据
            return compressAndSave(key, data);
          }
        } else {
          // 最后一次尝试：压缩数据
          return compressAndSave(key, data);
        }
      } else {
        return { success: false, message: `保存失败: ${getErrorMessage(error)}` };
      }
    }
  }

  return { success: false, message: '保存失败，已达到最大重试次数' };
}

/**
 * 压缩数据并保存
 */
function compressAndSave(key: string, data: unknown): { success: boolean; message: string; trimmed: boolean } {
  try {
    // 如果是数组，尝试保留更多记录
    if (Array.isArray(data)) {
      // 先尝试保留90%的记录
      let trimmedData = data;
      for (let ratio = 0.9; ratio >= 0.5; ratio -= 0.1) {
        const keepCount = Math.floor(data.length * ratio);
        if (keepCount > 0) {
          trimmedData = data.slice(-keepCount);
          try {
            localStorage.setItem(key, JSON.stringify(trimmedData));
            console.log(`压缩保存成功，保留了 ${keepCount}/${data.length} 条记录`);
            return { success: true, message: '压缩保存成功', trimmed: true };
          } catch (error) {
            // 继续尝试更小的比例
            continue;
          }
        }
      }
    }

    return { success: false, message: '数据太大，无法保存', trimmed: false };
  } catch (error) {
    return { success: false, message: `压缩保存失败: ${error}`, trimmed: false };
  }
}

/**
 * 获取存储使用统计
 */
export function getStorageStats(): { [key: string]: { size: number; count: number } } {
  if (typeof window === 'undefined') {
    return {};
  }

  const stats: { [key: string]: { size: number; count: number } } = {};

  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const size = localStorage[key].length;
      const data = JSON.parse(localStorage[key] || '[]');
      const count = Array.isArray(data) ? data.length : 1;

      stats[key] = { size, count };
    }
  }

  return stats;
}

/**
 * 监控存储使用情况
 */
export function monitorStorageUsage(): void {
  if (typeof window === 'undefined') return;

  const { used: _used, available: _available, percentage } = checkStorageUsage();

  if (percentage > 80) {
    console.warn(`⚠️ localStorage使用率过高: ${percentage.toFixed(2)}%`);
    console.log('建议清理浏览器数据或减少保存的记录数量');
  }

  if (percentage > 95) {
    console.error(`🚨 localStorage使用率严重过高: ${percentage.toFixed(2)}%`);
    console.log('自动执行清理...');
    smartCleanup();
  }
}
