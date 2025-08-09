/**
 * 智能相等判定工具
 * 针对不同数据类型提供合适的比较逻辑
 */

/**
 * 智能相等判定，根据数据类型和字段名选择合适的比较策略
 * @param a 值A
 * @param b 值B  
 * @param key 字段名（用于特殊处理）
 * @returns 是否相等
 */
export const smartEqual = (a: any, b: any, key: string): boolean => {
  // null/undefined 处理
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  // 字符串：trim后比较
  if (typeof a === 'string' && typeof b === 'string') {
    return a.trim() === b.trim();
  }

  // 数组：浅比较
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // 对象：特殊字段的深比较
  if (typeof a === 'object' && typeof b === 'object') {
    // templateConfig 特殊处理
    if (key === 'templateConfig') {
      return shallowObjectEqual(a, b);
    }
    // 其他对象按引用比较（可按需扩展）
    return a === b;
  }

  // 基础类型：直接比较
  return a === b;
};

/**
 * 浅层对象相等比较
 * @param a 对象A
 * @param b 对象B
 * @returns 是否相等
 */
const shallowObjectEqual = (a: Record<string, any>, b: Record<string, any>): boolean => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  
  return true;
};

/**
 * 检查值是否真正发生变化（考虑类型和字段特性）
 * @param newValue 新值
 * @param oldValue 旧值
 * @param key 字段名
 * @returns 是否有变化
 */
export const hasChanged = (newValue: any, oldValue: any, key: string): boolean => {
  return !smartEqual(newValue, oldValue, key);
};
