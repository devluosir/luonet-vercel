'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EyeOff, GripVertical, Settings, Plus, X } from 'lucide-react';
import { useQuotationStore } from '../state/useQuotationStore';
import { NOTES_TEMPLATES_BILINGUAL, PAYMENT_TERMS_OPTIONS, DELIVERY_TERMS_OPTIONS, DEFAULT_NOTES_CONFIG, extractEnglishContent } from '../types/notes';
import type { NoteConfig } from '../types/notes';

interface NotesSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (data: any) => void;
}

// 🚀 优化1: 使用memo包装主组件，避免不必要的重渲染
export const OptimizedNotesSection: React.FC<NotesSectionProps> = memo(() => {
  const { notesConfig, updateNoteVisibility, updateNoteOrder, updateNoteContent, addNote, removeNote } = useQuotationStore();
  const [showConfig, setShowConfig] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 🚀 优化2: 缓存传感器配置，避免每次渲染重新创建
  const sensors = useMemo(() => useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4, // 降低拖拽触发距离
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  ), []);

  // 🚀 优化3: 使用useMemo缓存可见Notes列表，减少重复计算
  const visibleNotes = useMemo(() => {
    return notesConfig
      .filter(note => note.visible)
      .sort((a, b) => a.order - b.order);
  }, [notesConfig]);

  // 🚀 优化4: 使用useMemo缓存notes ID列表，减少SortableContext的重渲染
  const visibleNoteIds = useMemo(() => {
    return visibleNotes.map(note => note.id);
  }, [visibleNotes]);

  // 🚀 优化5: 使用useCallback缓存事件处理函数，避免子组件重渲染
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = visibleNotes.findIndex(note => note.id === active.id);
    const newIndex = visibleNotes.findIndex(note => note.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // 获取在完整配置中的索引
      const fromConfigIndex = notesConfig.findIndex(note => note.id === active.id);
      const toConfigIndex = notesConfig.findIndex(note => note.id === over.id);

      if (fromConfigIndex !== -1 && toConfigIndex !== -1) {
        updateNoteOrder(fromConfigIndex, toConfigIndex);
      }
    }
  }, [visibleNotes, notesConfig, updateNoteOrder]);

  // 🚀 优化6: 缓存显示/隐藏切换处理函数
  const handleVisibilityToggle = useCallback((noteId: string, currentVisible: boolean) => {
    updateNoteVisibility(noteId, !currentVisible);
  }, [updateNoteVisibility]);

  // 🚀 优化7: 缓存模板应用函数
  const applyTemplate = useCallback((templateKey: 'exw' | 'fob' | 'cif') => {
    const template = NOTES_TEMPLATES_BILINGUAL[templateKey];
    const { setNotesConfig } = useQuotationStore.getState();
    
    // 重置为默认配置
    setNotesConfig(DEFAULT_NOTES_CONFIG);
    
    // 应用模板内容
    setTimeout(() => {
      updateNoteContent('delivery_time', extractEnglishContent(template[0]));
      updateNoteContent('price_based_on', extractEnglishContent(template[1]));
      updateNoteContent('delivery_terms', extractEnglishContent(template[2]));
      updateNoteContent('payment_terms', extractEnglishContent(template[3]));
      updateNoteContent('validity', extractEnglishContent(template[4]));
    }, 100);
  }, [updateNoteContent]);

  // 🚀 优化8: 缓存配置切换函数
  const toggleConfig = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfig(!showConfig);
  }, [showConfig]);

  return (
    <div className="space-y-3">
      {/* 标题和设置按钮 */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 dark:text-[#F5F5F7]">
          Notes
        </h3>
        <button
          type="button"
          onClick={toggleConfig}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
          title="配置Notes显示"
        >
          <Settings className="w-3 h-3 text-gray-600 dark:text-[#98989D]" />
        </button>
      </div>

      {/* 配置面板 */}
      {showConfig && (
        <ConfigPanel onApplyTemplate={applyTemplate} onAddNote={addNote} />
      )}

      {/* Notes列表 */}
      {visibleNotes.length > 0 ? (
        mounted ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleNoteIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {visibleNotes.map((note, index) => (
                  <OptimizedSortableNote
                    key={note.id}
                    note={note}
                    noteIndex={index + 1}
                    onVisibilityToggle={handleVisibilityToggle}
                    onUpdateContent={updateNoteContent}
                    onRemove={removeNote}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          // SSR 阶段显示静态列表，避免 hydration 不匹配
          <div className="space-y-2">
            {visibleNotes.map((note, index) => (
              <OptimizedSortableNote
                key={note.id}
                note={note}
                noteIndex={index + 1}
                onVisibilityToggle={handleVisibilityToggle}
                onUpdateContent={updateNoteContent}
                onRemove={removeNote}
              />
            ))}
          </div>
        )
      ) : (
        <EmptyState />
      )}
    </div>
  );
});

OptimizedNotesSection.displayName = 'OptimizedNotesSection';

// 🚀 优化9: 配置面板独立组件，减少主组件重渲染
const ConfigPanel = memo<{ 
  onApplyTemplate: (templateKey: 'exw' | 'fob' | 'cif') => void;
  onAddNote: () => void;
}>(({ onApplyTemplate, onAddNote }) => {
  const handleExwClick = useCallback(() => onApplyTemplate('exw'), [onApplyTemplate]);
  const handleFobClick = useCallback(() => onApplyTemplate('fob'), [onApplyTemplate]);
  const handleCifClick = useCallback(() => onApplyTemplate('cif'), [onApplyTemplate]);

  return (
    <div className="bg-gray-50 dark:bg-[#2C2C2E] rounded-lg p-2 sm:p-3">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 sm:gap-2">
        <button
          type="button"
          onClick={handleExwClick}
          className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors"
        >
          EXW工厂交货
        </button>
        <button
          type="button"
          onClick={handleFobClick}
          className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/30 transition-colors"
        >
          FOB离岸价
        </button>
        <button
          type="button"
          onClick={handleCifClick}
          className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded hover:bg-teal-200 dark:hover:bg-teal-900/30 transition-colors"
        >
          CIF到岸价
        </button>
        <button
          type="button"
          onClick={onAddNote}
          className="flex items-center justify-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
        >
          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">新增条款</span>
          <span className="sm:hidden">新增</span>
        </button>
      </div>
    </div>
  );
});

ConfigPanel.displayName = 'ConfigPanel';

// 🚀 优化10: 空状态独立组件
const EmptyState = memo(() => (
  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
    <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
    <p>没有显示的Notes</p>
    <p className="text-xs mt-1">点击配置按钮选择要显示的Notes</p>
  </div>
));

EmptyState.displayName = 'EmptyState';

// 🚀 优化11: 可拖拽的Note组件优化
interface OptimizedSortableNoteProps {
  note: NoteConfig;
  noteIndex: number; // 直接传递index，避免重复计算
  onVisibilityToggle: (noteId: string, currentVisible: boolean) => void;
  onUpdateContent: (noteId: string, content: string) => void;
  onRemove: (noteId: string) => void;
}

const OptimizedSortableNote: React.FC<OptimizedSortableNoteProps> = memo(({ 
  note, 
  noteIndex, 
  onVisibilityToggle, 
  onUpdateContent, 
  onRemove 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
  }), [transform, transition]);

  // 检查是否为特殊Notes（支持选项选择）
  const isSpecialNote = note.id === 'payment_terms' || note.id === 'delivery_time';
  const options = note.id === 'payment_terms' ? PAYMENT_TERMS_OPTIONS : DELIVERY_TERMS_OPTIONS;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.content || '');

  // 🚀 优化12: 使用useCallback缓存编辑相关函数
  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setEditValue(note.content || '');
  }, [note.content]);

  const handleSaveEdit = useCallback(() => {
    onUpdateContent(note.id, editValue);
    setIsEditing(false);
  }, [note.id, editValue, onUpdateContent]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue(note.content || '');
  }, [note.content]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  // 🚀 优化13: 缓存按钮点击处理函数
  const handleVisibilityClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onVisibilityToggle(note.id, note.visible);
  }, [note.id, note.visible, onVisibilityToggle]);

  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(note.id);
  }, [note.id, onRemove]);

  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      const selectedOption = options.find(opt => opt.id === e.target.value);
      if (selectedOption) {
        onUpdateContent(note.id, selectedOption.english);
      }
    }
  }, [note.id, options, onUpdateContent]);

  const handleEditValueChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-300 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg border ${
        isDragging ? 'shadow-lg scale-105 bg-gray-100 dark:bg-[#3A3A3C]' : ''
      } ${
        isEditing
          ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
          : 'border-gray-100 dark:border-[#3A3A3C]'
      }`}
    >
      {/* 主行：开关 + 序号 + 标题 + 内容 + 操作 */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          {/* 左侧：开关 + 序号 + 标题 + 内容 */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* 序号开关合并 */}
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={handleVisibilityClick}
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                  note.visible 
                    ? 'bg-[#007AFF] dark:bg-[#0A84FF] border-[#007AFF] dark:border-[#0A84FF] text-white shadow-md hover:bg-red-500 dark:hover:bg-red-600 hover:border-red-500 dark:hover:border-red-600' 
                    : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                title={note.visible ? `隐藏条款 (当前序号: ${noteIndex})` : '显示条款'}
              >
                {note.visible ? (
                  <span className="text-xs font-bold">{noteIndex}</span>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* 内容区域 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 sm:space-x-2">
                {/* 内容区域 */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <textarea
                      value={editValue}
                      onChange={handleEditValueChange}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveEdit}
                      className="w-full text-sm border border-gray-300 dark:border-[#3A3A3C] rounded px-2 py-1 bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] resize-none"
                      rows={1}
                      placeholder="输入条款内容..."
                      autoFocus
                    />
                  ) : (
                    <div 
                      className="text-sm text-gray-600 dark:text-[#98989D] cursor-text hover:bg-gray-100 dark:hover:bg-[#3A3A3C] px-2 py-1 rounded -mx-2"
                      onClick={handleStartEdit}
                      title="点击编辑"
                    >
                      {note.content || '点击编辑...'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 右侧：操作按钮 */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-2 sm:ml-3">
            {/* 特殊Notes的下拉选择 */}
            {isSpecialNote && (
              <select
                value=""
                onChange={handleSelectChange}
                className="text-xs border border-gray-300 dark:border-[#3A3A3C] rounded px-1 py-0.5 bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-[#F5F5F7] focus:outline-none focus:ring-1 focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] min-w-16"
                title={note.id === 'payment_terms' ? '选择付款方式' : '选择交货时间'}
              >
                <option value="">选择...</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.chinese}
                  </option>
                ))}
              </select>
            )}
            
            {/* 删除按钮 - 仅对自定义条款显示 */}
            {note.id.startsWith('custom_note_') && (
              <button
                type="button"
                onClick={handleRemoveClick}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors"
                title="删除条款"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            {/* 拖拽句柄 - 只在非编辑状态下可用 */}
            {!isEditing && (
              <div 
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-[#3A3A3C] rounded"
                title="拖拽排序"
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

OptimizedSortableNote.displayName = 'OptimizedSortableNote';
