import React from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { BaseDocument } from '../types';

// 基础状态接口
export interface BaseDocumentState<T extends BaseDocument> {
  // 数据状态
  data: T;
  isLoading: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  error: string | null;
  
  // 操作状态
  isDirty: boolean;
  lastSaved: string | null;
  
  // 基础操作
  setData: (data: Partial<T>) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  // 高级操作
  markDirty: () => void;
  markClean: () => void;
  updateLastSaved: () => void;
}

// 创建基础单据Store的工厂函数
export function createBaseDocumentStore<T extends BaseDocument>(
  initialState: T,
  storeName: string
) {
  return create<BaseDocumentState<T>>()(
    subscribeWithSelector((set, get) => ({
      // 初始状态
      data: initialState,
      isLoading: false,
      isSaving: false,
      isGenerating: false,
      error: null,
      isDirty: false,
      lastSaved: null,

      // 基础操作
      setData: (patch: Partial<T>) => {
        set((state) => ({
          data: { ...state.data, ...patch },
          isDirty: true,
          error: null,
        }));
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setSaving: (saving: boolean) => {
        set({ isSaving: saving });
      },

      setGenerating: (generating: boolean) => {
        set({ isGenerating: generating });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      reset: () => {
        set({
          data: initialState,
          isLoading: false,
          isSaving: false,
          isGenerating: false,
          error: null,
          isDirty: false,
          lastSaved: null,
        });
      },

      // 高级操作
      markDirty: () => {
        set({ isDirty: true });
      },

      markClean: () => {
        set({ isDirty: false });
      },

      updateLastSaved: () => {
        set({ 
          lastSaved: new Date().toISOString(),
          isDirty: false 
        });
      },
    }))
  );
}

// 通用单据Store Hook
export function useBaseDocumentStore<T extends BaseDocument>(
  store: ReturnType<typeof createBaseDocumentStore<T>>,
  selector?: (state: BaseDocumentState<T>) => any
) {
  if (selector) {
    return store(selector);
  }
  return store();
}

// 选择器工具
export const createSelectors = <T extends BaseDocument>() => ({
  // 数据选择器
  data: (state: BaseDocumentState<T>) => state.data,
  isLoading: (state: BaseDocumentState<T>) => state.isLoading,
  isSaving: (state: BaseDocumentState<T>) => state.isSaving,
  isGenerating: (state: BaseDocumentState<T>) => state.isGenerating,
  error: (state: BaseDocumentState<T>) => state.error,
  isDirty: (state: BaseDocumentState<T>) => state.isDirty,
  lastSaved: (state: BaseDocumentState<T>) => state.lastSaved,

  // 操作选择器
  setData: (state: BaseDocumentState<T>) => state.setData,
  setLoading: (state: BaseDocumentState<T>) => state.setLoading,
  setSaving: (state: BaseDocumentState<T>) => state.setSaving,
  setGenerating: (state: BaseDocumentState<T>) => state.setGenerating,
  setError: (state: BaseDocumentState<T>) => state.setError,
  reset: (state: BaseDocumentState<T>) => state.reset,
  markDirty: (state: BaseDocumentState<T>) => state.markDirty,
  markClean: (state: BaseDocumentState<T>) => state.markClean,
  updateLastSaved: (state: BaseDocumentState<T>) => state.updateLastSaved,

  // 计算选择器
  hasChanges: (state: BaseDocumentState<T>) => state.isDirty,
  canSave: (state: BaseDocumentState<T>) => state.isDirty && !state.isSaving,
  canGenerate: (state: BaseDocumentState<T>) => !state.isGenerating,
  hasError: (state: BaseDocumentState<T>) => !!state.error,
});

// 自动保存Hook
export function useAutoSave<T extends BaseDocument>(
  store: ReturnType<typeof createBaseDocumentStore<T>>,
  saveFunction: () => Promise<void>,
  delay: number = 300
) {
  const { data, isDirty, markClean, updateLastSaved } = store();
  const { setSaving, setError } = store();

  React.useEffect(() => {
    if (!isDirty) return;

    const timeoutId = setTimeout(async () => {
      try {
        setSaving(true);
        setError(null);
        await saveFunction();
        updateLastSaved();
        markClean();
      } catch (error) {
        setError(error instanceof Error ? error.message : '保存失败');
      } finally {
        setSaving(false);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [data, isDirty, delay, saveFunction, setSaving, setError, updateLastSaved, markClean]);

  return {
    isDirty,
    lastSaved: store(state => state.lastSaved),
  };
}
