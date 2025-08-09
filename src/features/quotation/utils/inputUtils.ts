/**
 * 输入处理工具函数
 * 提供规范化和安全比较功能
 */

/**
 * 安全的字符串相等比较（规范化后比较）
 * @param a 字符串A
 * @param b 字符串B  
 * @param normalize 是否进行trim规范化
 * @returns 是否相等
 */
export const safeStringEqual = (a?: string, b?: string, normalize = true): boolean => {
  const normalizeA = a ?? '';
  const normalizeB = b ?? '';
  
  if (normalize) {
    return normalizeA.trim() === normalizeB.trim();
  }
  
  return normalizeA === normalizeB;
};

/**
 * 规范化字符串输入
 * @param value 输入值
 * @returns 规范化后的值
 */
export const normalizeStringInput = (value?: string): string => {
  return (value ?? '').trim();
};

/**
 * 检查字符串值是否有实际变化（规范化后比较）
 * @param newValue 新值
 * @param oldValue 旧值
 * @returns 是否有变化
 */
export const hasStringChanged = (newValue?: string, oldValue?: string): boolean => {
  return !safeStringEqual(newValue, oldValue, true);
};
