import { useEffect, useRef, useCallback } from 'react';
import { pickDraft } from '../utils/sanitizeQuotation';

interface UseAutoSaveOptions<T> {
  data: T;
  key: string;
  delay?: number;
  enabled?: boolean;
}

// 安全的localStorage写入函数
const safeSet = (key: string, obj: any) => {
  const serialized = JSON.stringify(obj);
  const size = new Blob([serialized]).size;
  const maxSize = 4_500_000; // ~4.5MB限制
  
  if (size > maxSize) {
    throw new Error('Draft too large');
  }
  
  localStorage.setItem(key, serialized);
  return size;
};

export function useAutoSave<T>({ data, key, delay = 1000, enabled = true }: UseAutoSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const autoSaveEnabledRef = useRef(true);

  // 清理旧数据
  const cleanupOldData = () => {
    const keysToClean = Object.keys(localStorage).filter(k => 
      k.includes('quotation') || k.includes('draft') || k.includes('v2')
    );
    keysToClean.forEach(k => localStorage.removeItem(k));
  };

  // 保存函数
  const saveData = useCallback((dataToSave: T) => {
    if (!autoSaveEnabledRef.current) return;

    try {
      // 使用精简数据
      const draft = pickDraft(dataToSave as any);
      const serializedData = JSON.stringify(draft);
      
      // 如果数据没有变化，不保存
      if (serializedData === lastSavedRef.current) {
        return;
      }

      try {
        safeSet(key, draft);
        lastSavedRef.current = serializedData;
        console.log(`自动保存到 ${key}`);
      } catch (error: any) {
        if (error?.name === 'QuotaExceededError' || /too large/i.test(error?.message)) {
          console.warn('存储空间不足，尝试清理后重试');
          cleanupOldData();
          
          try {
            // 重试保存
            safeSet(key, draft);
            lastSavedRef.current = serializedData;
            console.log(`清理后重新保存到 ${key}`);
          } catch (retryError) {
            console.error('清理后仍然无法保存，禁用自动保存');
            autoSaveEnabledRef.current = false;
            // 可以在这里显示用户提示
            console.warn('草稿较大，已暂停自动保存。请手动保存或精简内容。');
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.warn('自动保存失败:', error);
    }
  }, [key]);

  useEffect(() => {
    if (!enabled || !autoSaveEnabledRef.current) return;

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      saveData(data);
    }, delay);

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, saveData]);

  // 手动保存函数
  const saveNow = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    saveData(data);
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

  // 重新启用自动保存
  const enableAutoSave = () => {
    autoSaveEnabledRef.current = true;
  };

  return { saveNow, clearSaved, enableAutoSave, isEnabled: autoSaveEnabledRef.current };
}