/**
 * 防抖Hook - 减少高频输入导致的状态更新
 */

import { useState, useEffect, useMemo, useRef } from 'react';

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
export function useDebouncedObject<T extends Record<string, unknown>>(
  values: T,
  delay = 250
): T {
  const [debouncedValues, setDebouncedValues] = useState<T>(values);
  const latestValuesRef = useRef(values);
  latestValuesRef.current = values;
  const serializedValues = useMemo(() => JSON.stringify(values), [values]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValues(latestValuesRef.current);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [serializedValues, delay]); // 使用序列化结果进行深度比较

  return debouncedValues;
}
