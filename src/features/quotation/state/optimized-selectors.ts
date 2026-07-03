import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { NoteConfig } from '../types/notes';

// 🚀 优化后的Notes选择器
export interface NotesSelectors {
  // 基础选择器
  visibleNotes: () => NoteConfig[];
  visibleNoteIds: () => string[];
  noteById: (id: string) => NoteConfig | undefined;
  noteIndex: (id: string) => number;

  // 计算属性
  visibleNotesCount: () => number;
  hasVisibleNotes: () => boolean;
  canDragNote: (id: string) => boolean;

  // 批量操作选择器
  allNotesVisible: () => boolean;
  allNotesHidden: () => boolean;
  customNotesCount: () => number;

  // 性能优化选择器
  memoizedVisibleNotes: NoteConfig[];
  memoizedVisibleNoteIds: string[];
}

// 创建优化的选择器store
export const useNotesSelectors = create<{
  notesConfig: NoteConfig[];
  selectors: NotesSelectors;
  setNotesConfig: (config: NoteConfig[]) => void;
}>()(
  subscribeWithSelector((set, _get) => {
    // 内部计算函数，使用闭包缓存
    let cachedVisibleNotes: NoteConfig[] = [];
    let cachedVisibleNoteIds: string[] = [];
    let lastConfigHash = '';

    const computeVisibleNotes = (config: NoteConfig[]): NoteConfig[] => {
      // 简单的哈希计算，用于检测配置变化
      const configHash = config.map(n => `${n.id}-${n.visible}-${n.order}`).join('|');

      if (configHash !== lastConfigHash) {
        cachedVisibleNotes = config
          .filter(note => note.visible)
          .sort((a, b) => a.order - b.order);
        cachedVisibleNoteIds = cachedVisibleNotes.map(note => note.id);
        lastConfigHash = configHash;
      }

      return cachedVisibleNotes;
    };

    const createSelectors = (config: NoteConfig[]): NotesSelectors => ({
      // 基础选择器
      visibleNotes: () => computeVisibleNotes(config),
      visibleNoteIds: () => {
        computeVisibleNotes(config); // 确保缓存更新
        return cachedVisibleNoteIds;
      },
      noteById: (id: string) => config.find(note => note.id === id),
      noteIndex: (id: string) => {
        const visibleNotes = computeVisibleNotes(config);
        return visibleNotes.findIndex(note => note.id === id);
      },

      // 计算属性
      visibleNotesCount: () => computeVisibleNotes(config).length,
      hasVisibleNotes: () => computeVisibleNotes(config).length > 0,
      canDragNote: (id: string) => {
        const note = config.find(n => n.id === id);
        return note ? note.visible : false;
      },

      // 批量操作选择器
      allNotesVisible: () => config.every(note => note.visible),
      allNotesHidden: () => config.every(note => !note.visible),
      customNotesCount: () => config.filter(note => note.id.startsWith('custom_note_')).length,

      // 性能优化选择器 - 直接返回缓存值
      memoizedVisibleNotes: cachedVisibleNotes,
      memoizedVisibleNoteIds: cachedVisibleNoteIds,
    });

    return {
      notesConfig: [],
      selectors: createSelectors([]),
      setNotesConfig: (config) => set(() => ({
        notesConfig: config,
        selectors: createSelectors(config)
      })),
    };
  })
);

// 🚀 高性能Notes操作hooks
export const useOptimizedNotesActions = () => {
  const store = useNotesSelectors();

  return {
    // 批量显示/隐藏
    showAllNotes: () => {
      const newConfig = store.notesConfig.map(note => ({ ...note, visible: true }));
      store.setNotesConfig(newConfig);
    },

    hideAllNotes: () => {
      const newConfig = store.notesConfig.map(note => ({ ...note, visible: false }));
      store.setNotesConfig(newConfig);
    },

    // 只显示常用Notes
    showCommonNotesOnly: () => {
      const commonNoteIds = ['delivery_time', 'price_based_on', 'delivery_terms', 'payment_terms', 'validity'];
      const newConfig = store.notesConfig.map(note => ({
        ...note,
        visible: commonNoteIds.includes(note.id)
      }));
      store.setNotesConfig(newConfig);
    },

    // 重置为默认顺序
    resetToDefaultOrder: () => {
      const newConfig = [...store.notesConfig].sort((a, b) => {
        // 按预定义顺序排序
        const defaultOrder = ['delivery_time', 'price_based_on', 'delivery_terms', 'payment_terms', 'validity'];
        const aIndex = defaultOrder.indexOf(a.id);
        const bIndex = defaultOrder.indexOf(b.id);

        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.order - b.order;
      }).map((note, index) => ({ ...note, order: index }));

      store.setNotesConfig(newConfig);
    },

    // 智能排序（常用在前）
    smartSort: () => {
      const priorityNotes = ['delivery_time', 'payment_terms', 'price_based_on', 'validity', 'delivery_terms'];
      const newConfig = [...store.notesConfig].sort((a, b) => {
        const aPriority = priorityNotes.indexOf(a.id);
        const bPriority = priorityNotes.indexOf(b.id);

        if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
        if (aPriority !== -1) return -1;
        if (bPriority !== -1) return 1;
        return a.order - b.order;
      }).map((note, index) => ({ ...note, order: index }));

      store.setNotesConfig(newConfig);
    },
  };
};

// 🚀 防抖更新hook
export const useDebouncedNotesUpdate = (delay = 300) => {
  let timeoutId: NodeJS.Timeout;

  return (updateFn: () => void) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(updateFn, delay);
  };
};

// 🚀 性能监控hook
export const useNotesPerformance = () => {
  const startTime = Date.now();

  return {
    measureRender: (componentName: string) => {
      const endTime = Date.now();
      const renderTime = endTime - startTime;

      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`[NotesPerf] ${componentName} 渲染时间过长: ${renderTime}ms`);
      }

      return renderTime;
    },

    measureAction: (actionName: string, action: () => void) => {
      const actionStart = performance.now();
      action();
      const actionEnd = performance.now();
      const actionTime = actionEnd - actionStart;

      if (process.env.NODE_ENV === 'development' && actionTime > 10) {
        console.warn(`[NotesPerf] ${actionName} 执行时间: ${actionTime.toFixed(2)}ms`);
      }

      return actionTime;
    },
  };
};
