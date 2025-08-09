'use client';

import React, { useState, useEffect } from 'react';
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
import { EyeOff, GripVertical, Plus, MoreHorizontal, Truck, Ship, Globe } from 'lucide-react';
import { useQuotationStore } from '../state/useQuotationStore';
import { NOTES_TEMPLATES_BILINGUAL, PAYMENT_TERMS_OPTIONS, DELIVERY_TERMS_OPTIONS, DEFAULT_NOTES_CONFIG, extractEnglishContent } from '../types/notes';
import type { NoteConfig } from '../types/notes';

interface NotesSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (data: any) => void;
}

export const NotesSection: React.FC<NotesSectionProps> = () => {
  const { notesConfig, updateNoteVisibility, updateNoteOrder, updateNoteContent, addNote, removeNote } = useQuotationStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 配置传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4, // 降低拖拽触发距离
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 获取可见的Notes并按顺序排序
  const visibleNotes = notesConfig
    .filter(note => note.visible)
    .sort((a, b) => a.order - b.order);

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
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
  };

  // 处理显示/隐藏切换
  const handleVisibilityToggle = (noteId: string, currentVisible: boolean) => {
    updateNoteVisibility(noteId, !currentVisible);
  };

  // 应用模板
  const applyTemplate = (templateKey: 'exw' | 'fob' | 'cif') => {
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
  };

  return (
    <div className="space-y-3">
      {/* 标题 + 精简操作按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-800 dark:text-[#F5F5F7]">Notes</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => applyTemplate('exw')}
              className="p-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-300"
              title="套用 EXW 模板"
            >
              <Truck className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('fob')}
              className="p-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300"
              title="套用 FOB 模板"
            >
              <Ship className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('cif')}
              className="p-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-600 dark:text-teal-300"
              title="套用 CIF 模板"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={addNote}
              className="p-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-300"
              title="新增条款"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Notes列表 */}
      {visibleNotes.length > 0 ? (
        mounted ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleNotes.map(note => note.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5">
                {visibleNotes.map((note) => (
                  <SortableNote
                    key={note.id}
                    note={note}
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
          <div className="space-y-1.5">
            {visibleNotes.map((note) => (
              <SortableNote
                key={note.id}
                note={note}
                onVisibilityToggle={handleVisibilityToggle}
                onUpdateContent={updateNoteContent}
                onRemove={removeNote}
              />
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>没有显示的Notes</p>
          <p className="text-xs mt-1">点击配置按钮选择要显示的Notes</p>
        </div>
      )}
    </div>
  );
};

// 可拖拽的Note组件
interface SortableNoteProps {
  note: NoteConfig;
  onVisibilityToggle: (noteId: string, currentVisible: boolean) => void;
  onUpdateContent: (noteId: string, content: string) => void;
  onRemove: (noteId: string) => void;
}

const SortableNote: React.FC<SortableNoteProps> = ({ note, onVisibilityToggle, onUpdateContent, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // 检查是否为特殊Notes（支持选项选择）
  const isSpecialNote = note.id === 'payment_terms' || note.id === 'delivery_time';
  const options = note.id === 'payment_terms' ? PAYMENT_TERMS_OPTIONS : DELIVERY_TERMS_OPTIONS;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.content || '');
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    if (showOptions) {
      document.addEventListener('mousedown', handleClickOutside, true);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [showOptions]);

  // 获取当前Note在可见列表中的序号
  const { notesConfig } = useQuotationStore();
  const visibleNotes = notesConfig
    .filter(n => n.visible)
    .sort((a, b) => a.order - b.order);
  const noteIndex = visibleNotes.findIndex(n => n.id === note.id) + 1;

  // 编辑相关函数
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(note.content || '');
  };

  const handleSaveEdit = () => {
    onUpdateContent(note.id, editValue);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(note.content || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };



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
      <div className="p-2.5">
        <div className="flex items-center justify-between">
          {/* 左侧：开关 + 序号 + 标题 + 内容 */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* 序号开关合并 */}
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onVisibilityToggle(note.id, note.visible);
                }}
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
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveEdit}
                      className="w-full h-auto min-h-8 max-h-32 box-border text-sm leading-5 border border-gray-300 dark:border-[#3A3A3C] rounded px-2 py-1 bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-[#F5F5F7] focus:outline-none focus:ring-1 focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] resize-none overflow-auto"
                      rows={1}
                      placeholder="输入条款内容..."
                      autoFocus
                      onInput={(e) => {
                        const el = e.currentTarget;
                        el.style.height = 'auto';
                        const capped = Math.min(el.scrollHeight, 128); // ~ max-h-32
                        el.style.height = `${capped}px`;
                      }}
                    />
                  ) : (
                    <div 
                      className="min-h-8 box-border text-sm leading-5 text-gray-600 dark:text-[#98989D] cursor-text hover:bg-gray-100 dark:hover:bg-[#3A3A3C] px-2 py-1 rounded -mx-2 border border-transparent whitespace-pre-wrap break-words"
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
            {/* 特殊Notes的选项按钮（与 PaymentTermsSection 风格统一） */}
            {isSpecialNote && (
              <div className="relative" ref={optionsRef}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-300"
                  onClick={() => setShowOptions((v) => !v)}
                  title={note.id === 'payment_terms' ? '选择付款方式' : '选择交货时间'}
                >
                  <MoreHorizontal size={14} />
                </button>
                {showOptions && (
                  <div className="absolute right-0 z-10 mt-2 w-64 sm:w-72 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-1 shadow-md">
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className="w-full truncate text-left text-xs px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                        onClick={() => {
                          onUpdateContent(note.id, opt.english);
                          setShowOptions(false);
                        }}
                      >
                        {opt.chinese}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
};
