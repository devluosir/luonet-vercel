'use client';

import React, { useState } from 'react';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, GripVertical, Settings, ChevronDown, Check } from 'lucide-react';
import { useQuotationStore } from '../state/useQuotationStore';
import { NOTES_CONTENT_MAP, PAYMENT_TERMS_OPTIONS, DELIVERY_TERMS_OPTIONS } from '../types/notes';
import type { NoteConfig } from '../types/notes';

interface NotesSectionProps {
  data: any;
  onChange: (data: any) => void;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ data, onChange }) => {
  const { notesConfig, updateNoteVisibility, updateNoteOrder, updateSpecialNoteOption } = useQuotationStore();
  const [showConfig, setShowConfig] = useState(false);

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

  return (
    <div className="space-y-4">
      {/* 配置按钮 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7]">
          Notes
        </h3>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
          title="配置Notes显示"
        >
          <Settings className="w-4 h-4 text-gray-600 dark:text-[#98989D]" />
        </button>
      </div>

      {/* 配置面板 */}
      {showConfig && (
        <div className="bg-gray-50 dark:bg-[#3A3A3C] rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-[#F5F5F7] mb-3">
            选择显示的Notes
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {notesConfig.map((note) => (
              <label
                key={note.id}
                className="flex items-center space-x-3 p-3 bg-white dark:bg-[#2C2C2E] rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3A3A3C] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={note.visible}
                  onChange={() => handleVisibilityToggle(note.id, note.visible)}
                  className="w-4 h-4 text-[#007AFF] bg-gray-100 border-gray-300 rounded focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-[#F5F5F7]">
                  {getNoteDisplayName(note.id)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Notes列表 */}
      {visibleNotes.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleNotes.map(note => note.id)}
            strategy={verticalListSortingStrategy}
          >
            <div>
              {visibleNotes.map((note) => (
                <SortableNote
                  key={note.id}
                  note={note}
                  data={data}
                  onVisibilityToggle={handleVisibilityToggle}
                  onUpdateSpecialOption={updateSpecialNoteOption}
                  onChange={onChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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

// 获取Note显示名称
function getNoteDisplayName(noteId: string): string {
  const displayNames: Record<string, string> = {
    payment_terms: 'Payment Terms',
    delivery_terms: 'Delivery Terms',
    quality_terms: 'Quality Terms',
    warranty_terms: 'Warranty Terms',
    custom_note_1: 'Custom Note 1',
    custom_note_2: 'Custom Note 2',
  };
  return displayNames[noteId] || noteId;
}

// 可拖拽的Note组件
interface SortableNoteProps {
  note: NoteConfig;
  data: any;
  onVisibilityToggle: (noteId: string, currentVisible: boolean) => void;
  onUpdateSpecialOption: (noteId: string, optionId: string) => void;
  onChange: (data: any) => void;
}

const SortableNote: React.FC<SortableNoteProps> = ({ note, data, onVisibilityToggle, onUpdateSpecialOption, onChange }) => {
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
  const isSpecialNote = note.id === 'payment_terms' || note.id === 'delivery_terms';
  const options = note.id === 'payment_terms' ? PAYMENT_TERMS_OPTIONS : DELIVERY_TERMS_OPTIONS;
  const selectedOptionId = (note as any).selectedOption;
  const selectedOption = options.find(opt => opt.id === selectedOptionId);
  const [showOptions, setShowOptions] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-[#2C2C2E] rounded-xl p-4 border border-[#E5E5EA] dark:border-[#3A3A3C] transition-all duration-200 cursor-grab active:cursor-grabbing mb-3 ${
        isDragging ? 'shadow-lg scale-105' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-[#F5F5F7]">
            {getNoteDisplayName(note.id)}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation(); // 防止触发拖拽
            onVisibilityToggle(note.id, note.visible);
          }}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
          title="隐藏此Note"
        >
          <EyeOff className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      
      {/* 特殊Notes的选项选择器 */}
      {isSpecialNote && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-[#98989D]">
              当前选择：
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOptions(!showOptions);
              }}
              className="text-xs text-[#007AFF] dark:text-[#0A84FF] hover:underline"
            >
              {selectedOption ? selectedOption.chinese : '点击选择'}
            </button>
          </div>
          {showOptions && (
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1 bg-gray-50 dark:bg-[#3A3A3C] rounded">
              {(showAllOptions ? options : options.slice(0, 8)).map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateSpecialOption(note.id, option.id);
                    setShowOptions(false);
                    setShowAllOptions(false);
                  }}
                  className={`px-2 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                    selectedOptionId === option.id
                      ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white'
                      : 'bg-white dark:bg-[#2C2C2E] text-gray-700 dark:text-[#F5F5F7] hover:bg-gray-100 dark:hover:bg-[#4A4A4C]'
                  }`}
                  title={option.english}
                >
                  {option.chinese}
                </button>
              ))}
              {options.length > 8 && !showAllOptions && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllOptions(true);
                  }}
                  className="px-2 py-1 rounded text-xs bg-white dark:bg-[#2C2C2E] text-gray-500 dark:text-[#98989D] hover:bg-gray-100 dark:hover:bg-[#4A4A4C]"
                >
                  +{options.length - 8}更多
                </button>
              )}
              {showAllOptions && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllOptions(false);
                  }}
                  className="px-2 py-1 rounded text-xs bg-white dark:bg-[#2C2C2E] text-gray-500 dark:text-[#98989D] hover:bg-gray-100 dark:hover:bg-[#4A4A4C]"
                >
                  收起
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="text-sm text-gray-600 dark:text-[#98989D]">
        <textarea
          value={getNoteContent(note.id, data, selectedOption)}
          onChange={(e) => {
            // 直接更新条款内容
            const newContent = e.target.value;
            if (isSpecialNote) {
              // 特殊Notes（付款方式和交货期）
              onUpdateSpecialOption(note.id, `custom_${newContent}`);
            } else {
              // 普通Notes，更新data.notes
              const noteIndex = note.id === 'custom_note_1' ? 0 : 1;
              const newNotes = [...(data.notes || [])];
              newNotes[noteIndex] = newContent;
              onChange({ ...data, notes: newNotes });
            }
          }}
          className="w-full p-2 text-sm border border-gray-300 dark:border-[#3A3A3C] rounded bg-white dark:bg-[#2C2C2E] text-gray-800 dark:text-[#F5F5F7] resize-none"
          rows={2}
          placeholder="输入条款内容..."
        />
      </div>
    </div>
  );
};

// 获取Note内容
function getNoteContent(noteId: string, data: any, selectedOption?: any): string {
  // 特殊Notes（付款方式和交货期）
  if (noteId === 'payment_terms' && selectedOption) {
    // 检查是否为自定义编辑的内容
    if (selectedOption.id && selectedOption.id.startsWith('custom_')) {
      return selectedOption.id.replace('custom_', '');
    }
    return selectedOption.english || '';
  }
  if (noteId === 'delivery_terms' && selectedOption) {
    // 检查是否为自定义编辑的内容
    if (selectedOption.id && selectedOption.id.startsWith('custom_')) {
      return selectedOption.id.replace('custom_', '');
    }
    return selectedOption.english || '';
  }
  
  // 自定义Notes从data中获取
  if (noteId === 'custom_note_1' && data.notes && data.notes[0]) {
    return data.notes[0];
  }
  if (noteId === 'custom_note_2' && data.notes && data.notes[1]) {
    return data.notes[1];
  }
  
  // 默认Notes从映射中获取
  return NOTES_CONTENT_MAP[noteId] || '';
}
