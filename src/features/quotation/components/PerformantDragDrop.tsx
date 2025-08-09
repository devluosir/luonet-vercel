'use client';

import React, { useMemo, useCallback, memo, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { NoteConfig } from '../types/notes';

// 🚀 性能优化配置
const DROP_ANIMATION: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

// 🚀 优化的传感器配置
const DRAG_SENSORS_CONFIG = {
  pointer: {
    activationConstraint: {
      distance: 3, // 减少拖拽触发距离，提升响应性
    },
  },
  keyboard: {
    coordinateGetter: sortableKeyboardCoordinates,
  },
};

interface PerformantDragDropProps {
  notes: NoteConfig[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  renderNote: (note: NoteConfig, index: number, isDragging?: boolean) => React.ReactNode;
  className?: string;
}

export const PerformantDragDrop = memo<PerformantDragDropProps>(({
  notes,
  onReorder,
  renderNote,
  className = '',
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // 🚀 使用useRef缓存计算结果，避免重复计算
  const notesMapRef = useRef<Map<string, { note: NoteConfig; index: number }>>(new Map());
  const noteIdsRef = useRef<string[]>([]);

  // 🚀 更新缓存的notes映射
  useMemo(() => {
    notesMapRef.current.clear();
    noteIdsRef.current = notes.map((note, index) => {
      notesMapRef.current.set(note.id, { note, index });
      return note.id;
    });
  }, [notes]);

  // 🚀 优化传感器配置 - 使用useMemo缓存，避免重复创建
  const sensors = useMemo(() => useSensors(
    useSensor(PointerSensor, DRAG_SENSORS_CONFIG.pointer),
    useSensor(KeyboardSensor, DRAG_SENSORS_CONFIG.keyboard)
  ), []);

  // 🚀 获取当前拖拽的note
  const activeNote = useMemo(() => {
    if (!activeId) return null;
    const noteData = notesMapRef.current.get(activeId);
    return noteData ? noteData.note : null;
  }, [activeId]);

  // 🚀 拖拽开始处理
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
    
    // 性能监控
    if (process.env.NODE_ENV === 'development') {
      console.time('drag-operation');
    }
  }, []);

  // 🚀 拖拽过程处理 - 使用节流减少频繁更新
  const dragOverTimeoutRef = useRef<NodeJS.Timeout>();
  const handleDragOver = useCallback((event: DragOverEvent) => {
    // 使用requestAnimationFrame进行性能优化
    if (dragOverTimeoutRef.current) {
      clearTimeout(dragOverTimeoutRef.current);
    }
    
    dragOverTimeoutRef.current = setTimeout(() => {
      // 这里可以添加拖拽过程中的视觉反馈逻辑
      // 例如高亮drop zone等
    }, 16); // 约60fps
  }, []);

  // 🚀 拖拽结束处理 - 优化批量更新
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setIsDragging(false);
    
    if (dragOverTimeoutRef.current) {
      clearTimeout(dragOverTimeoutRef.current);
    }

    if (over && active.id !== over.id) {
      const activeData = notesMapRef.current.get(active.id as string);
      const overData = notesMapRef.current.get(over.id as string);
      
      if (activeData && overData) {
        // 使用React的批量更新机制
        React.startTransition(() => {
          onReorder(activeData.index, overData.index);
        });
      }
    }
    
    // 性能监控
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd('drag-operation');
    }
  }, [onReorder]);

  return (
    <div className={className}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={noteIdsRef.current}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {notes.map((note, index) => (
              <SortableNoteItem
                key={note.id}
                note={note}
                index={index}
                isDraggingAny={isDragging}
                isBeingDragged={activeId === note.id}
                renderNote={renderNote}
              />
            ))}
          </div>
        </SortableContext>
        
        {/* 🚀 拖拽覆盖层 - 只在拖拽时渲染 */}
        <DragOverlay dropAnimation={DROP_ANIMATION}>
          {activeNote && (
            <div className="bg-white dark:bg-[#1C1C1E] shadow-2xl rounded-lg border-2 border-[#007AFF] dark:border-[#0A84FF] opacity-95">
              {renderNote(activeNote, -1, true)}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
});

PerformantDragDrop.displayName = 'PerformantDragDrop';

// 🚀 优化的可排序项组件
interface SortableNoteItemProps {
  note: NoteConfig;
  index: number;
  isDraggingAny: boolean;
  isBeingDragged: boolean;
  renderNote: (note: NoteConfig, index: number, isDragging?: boolean) => React.ReactNode;
}

const SortableNoteItem = memo<SortableNoteItemProps>(({
  note,
  index,
  isDraggingAny,
  isBeingDragged,
  renderNote,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: note.id,
    // 🚀 优化动画配置
    animateLayoutChanges: ({ isSorting, wasDragging }) => 
      isSorting || wasDragging ? false : true,
  });

  // 🚀 优化样式计算 - 使用useMemo缓存transform
  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    // 🚀 硬件加速
    willChange: isDragging ? 'transform' : 'auto',
    // 🚀 减少重绘
    backfaceVisibility: 'hidden' as const,
    perspective: 1000,
  }), [transform, transition, isDragging]);

  // 🚀 动态className计算
  const itemClassName = useMemo(() => {
    const baseClasses = 'relative';
    const dragClasses = [];
    
    if (isDragging) {
      dragClasses.push('opacity-50', 'scale-105', 'z-50');
    } else if (isDraggingAny) {
      dragClasses.push('transition-transform', 'duration-200');
    }
    
    if (isBeingDragged) {
      dragClasses.push('shadow-2xl');
    }
    
    return [baseClasses, ...dragClasses].join(' ');
  }, [isDragging, isDraggingAny, isBeingDragged]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={itemClassName}
      {...attributes}
    >
      {/* 🚀 将拖拽句柄作为独立组件，减少重渲染影响 */}
      <DragHandle listeners={listeners} />
      {renderNote(note, index, isDragging)}
    </div>
  );
});

SortableNoteItem.displayName = 'SortableNoteItem';

// 🚀 独立的拖拽句柄组件
interface DragHandleProps {
  listeners?: any;
}

const DragHandle = memo<DragHandleProps>(({ listeners }) => (
  <div 
    {...listeners}
    className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-[#3A3A3C] rounded z-10"
    title="拖拽排序"
  >
    <GripVertical className="w-4 h-4 text-gray-400" />
  </div>
));

DragHandle.displayName = 'DragHandle';

// 🚀 性能增强hooks
export const useDragPerformance = () => {
  const [metrics, setMetrics] = useState({
    dragCount: 0,
    averageDragTime: 0,
    lastDragTime: 0,
  });

  const measureDrag = useCallback((callback: () => void) => {
    const startTime = performance.now();
    callback();
    const endTime = performance.now();
    const dragTime = endTime - startTime;

    setMetrics(prev => ({
      dragCount: prev.dragCount + 1,
      averageDragTime: (prev.averageDragTime * prev.dragCount + dragTime) / (prev.dragCount + 1),
      lastDragTime: dragTime,
    }));

    // 性能警告
    if (process.env.NODE_ENV === 'development' && dragTime > 100) {
      console.warn(`[DragPerf] 拖拽操作耗时过长: ${dragTime.toFixed(2)}ms`);
    }

    return dragTime;
  }, []);

  return { metrics, measureDrag };
};

// 🚀 拖拽防抖hook
export const useDragDebounce = (delay = 16) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((callback: () => void) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(callback, delay);
  }, [delay]);
};
