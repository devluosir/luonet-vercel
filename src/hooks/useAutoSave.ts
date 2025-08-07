import { useEffect, useRef } from 'react';

interface UseAutoSaveOptions<T> {
  data: T;
  key: string;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({ data, key, delay = 1000, enabled = true }: UseAutoSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    if (!enabled) return;

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 序列化当前数据
    const serializedData = JSON.stringify(data);
    
    // 如果数据没有变化，不保存
    if (serializedData === lastSavedRef.current) {
      return;
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, serializedData);
        lastSavedRef.current = serializedData;
        console.log(`自动保存到 ${key}`);
      } catch (error) {
        console.warn('自动保存失败:', error);
      }
    }, delay);

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, key, delay, enabled]);

  // 手动保存函数
  const saveNow = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
      lastSavedRef.current = serializedData;
      console.log(`手动保存到 ${key}`);
    } catch (error) {
      console.warn('手动保存失败:', error);
    }
  };

  // 清除保存的数据
  const clearSaved = () => {
    try {
      localStorage.removeItem(key);
      lastSavedRef.current = '';
      console.log(`清除保存的数据 ${key}`);
    } catch (error) {
      console.warn('清除保存数据失败:', error);
    }
  };

  return { saveNow, clearSaved };
} 