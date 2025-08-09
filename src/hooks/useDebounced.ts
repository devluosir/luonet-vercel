/**
 * 防抖Hook - 减少高频输入导致的状态更新
 */

import { useState, useEffect } from 'react';

/**
 * 对值进行防抖处理
 * @param value 需要防抖的值
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的值
 */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 对多个值进行防抖处理
 * @param values 需要防抖的值对象
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的值对象
 */
export function useDebouncedObject<T extends Record<string, any>>(
  values: T, 
  delay = 250
): T {
  const [debouncedValues, setDebouncedValues] = useState<T>(values);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValues(values);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [JSON.stringify(values), delay]); // 使用JSON.stringify进行深度比较

  return debouncedValues;
}
