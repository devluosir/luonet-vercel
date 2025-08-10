/**
 * 安全的localStorage操作工具
 * 处理JSON解析错误和类型转换
 */

// 安全地获取localStorage中的JSON数据
export function getLocalStorageJSON<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  
  try {
    const data = localStorage.getItem(key);
    if (data === null) {
      return defaultValue;
    }
    
    // 尝试解析JSON
    const parsed = JSON.parse(data);
    return parsed as T;
  } catch (error) {
    console.warn(`Failed to parse localStorage key: ${key}`, error);
    return defaultValue;
  }
}

// 安全地获取localStorage中的字符串数据
export function getLocalStorageString(key: string, defaultValue: string = ''): string {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  
  try {
    const data = localStorage.getItem(key);
    return data || defaultValue;
  } catch (error) {
    console.warn(`Failed to get localStorage key: ${key}`, error);
    return defaultValue;
  }
}

// 安全地设置localStorage数据
export function setLocalStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    if (typeof value === 'string') {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn(`Failed to set localStorage key: ${key}`, error);
  }
}

// 安全地移除localStorage数据
export function removeLocalStorage(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove localStorage key: ${key}`, error);
  }
}
