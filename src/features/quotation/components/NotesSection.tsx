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
import { NOTES_CONTENT_MAP, PAYMENT_TERMS_OPTIONS, DELIVERY_TERMS_OPTIONS, DEFAULT_NOTES_CONFIG, NOTES_TEMPLATES_BILINGUAL, extractEnglishContent } from '../types/notes';
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
    <div className="space-y-3">
      {/* 标题和设置按钮 */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 dark:text-[#F5F5F7]">
          Notes
        </h3>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowConfig(!showConfig);
          }}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
          title="配置Notes显示"
        >
          <Settings className="w-3 h-3 text-gray-600 dark:text-[#98989D]" />
        </button>
      </div>

      {/* 批量操作条 */}
      {showConfig && (
        <div className="bg-gray-50 dark:bg-[#2C2C2E] rounded-lg p-3 space-y-2">
          <h4 className="text-xs font-medium text-gray-700 dark:text-[#F5F5F7]">
            批量操作
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                notesConfig.forEach(note => {
                  if (!note.visible) {
                    handleVisibilityToggle(note.id, note.visible);
                  }
                });
              }}
              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
            >
              全选
            </button>
            <button
              type="button"
              onClick={() => {
                notesConfig.forEach(note => {
                  if (note.visible) {
                    handleVisibilityToggle(note.id, note.visible);
                  }
                });
              }}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              全不选
            </button>
            <button
              type="button"
              onClick={() => {
                // 仅显示常用条款
                notesConfig.forEach(note => {
                  const isCommon = ['delivery_time', 'price_based_on', 'delivery_terms', 'payment_terms', 'validity'].includes(note.id);
                  if (note.visible !== isCommon) {
                    handleVisibilityToggle(note.id, note.visible);
                  }
                });
              }}
              className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
            >
              仅常用
            </button>
            <button
              type="button"
              onClick={() => {
                // 恢复默认顺序
                const { setNotesConfig } = useQuotationStore.getState();
                setNotesConfig(DEFAULT_NOTES_CONFIG);
              }}
              className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors"
            >
              恢复默认
            </button>
          </div>
          
          {/* 模板选择 */}
          <div className="mt-2">
            <h5 className="text-xs font-medium text-gray-700 dark:text-[#F5F5F7] mb-2">快速模板</h5>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  // EXW模板
                  const { setNotesConfig, updateSpecialNoteOption } = useQuotationStore.getState();
                  const template = [
                    { id: 'delivery_time', visible: true, order: 0 },
                    { id: 'price_based_on', visible: true, order: 1 },
                    { id: 'delivery_terms', visible: true, order: 2 },
                    { id: 'payment_terms', visible: true, order: 3 },
                    { id: 'validity', visible: true, order: 4 },
                    { id: 'quality_terms', visible: false, order: 5 },
                    { id: 'warranty_terms', visible: false, order: 6 },
                    { id: 'custom_note_1', visible: false, order: 7 },
                    { id: 'custom_note_2', visible: false, order: 8 },
                  ];
                  setNotesConfig(template);
                  // 设置EXW模板内容
                  updateSpecialNoteOption('payment_terms', 'custom_30 days net.');
                  updateSpecialNoteOption('delivery_terms', 'custom_As stated above, subject to prior sale.');
                }}
                className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors"
              >
                EXW工厂交货
              </button>
              <button
                type="button"
                onClick={() => {
                  // FOB模板
                  const { setNotesConfig, updateSpecialNoteOption } = useQuotationStore.getState();
                  const template = [
                    { id: 'delivery_time', visible: true, order: 0 },
                    { id: 'price_based_on', visible: true, order: 1 },
                    { id: 'delivery_terms', visible: true, order: 2 },
                    { id: 'payment_terms', visible: true, order: 3 },
                    { id: 'validity', visible: true, order: 4 },
                    { id: 'quality_terms', visible: true, order: 5 },
                    { id: 'warranty_terms', visible: false, order: 6 },
                    { id: 'custom_note_1', visible: false, order: 7 },
                    { id: 'custom_note_2', visible: false, order: 8 },
                  ];
                  setNotesConfig(template);
                  updateSpecialNoteOption('payment_terms', 'custom_30% advance payment, 70% before shipment.');
                  updateSpecialNoteOption('delivery_terms', 'custom_As stated above, subject to prior sale.');
                }}
                className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/30 transition-colors"
              >
                FOB离岸价
              </button>
              <button
                type="button"
                onClick={() => {
                  // CIF模板
                  const { setNotesConfig, updateSpecialNoteOption } = useQuotationStore.getState();
                  const template = [
                    { id: 'delivery_time', visible: true, order: 0 },
                    { id: 'price_based_on', visible: true, order: 1 },
                    { id: 'delivery_terms', visible: true, order: 2 },
                    { id: 'payment_terms', visible: true, order: 3 },
                    { id: 'validity', visible: true, order: 4 },
                    { id: 'quality_terms', visible: false, order: 5 },
                    { id: 'warranty_terms', visible: false, order: 6 },
                    { id: 'custom_note_1', visible: false, order: 7 },
                    { id: 'custom_note_2', visible: false, order: 8 },
                  ];
                  setNotesConfig(template);
                  updateSpecialNoteOption('payment_terms', 'custom_100% T/T in advance.');
                  updateSpecialNoteOption('delivery_terms', 'custom_As stated above, subject to prior sale.');
                }}
                className="px-2 py-1 text-xs bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded hover:bg-teal-200 dark:hover:bg-teal-900/30 transition-colors"
              >
                CIF到岸价
              </button>
            </div>
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
            <div className="space-y-2">
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
    delivery_time: 'Delivery Time',
    price_based_on: 'Price Based On',
    delivery_terms: 'Delivery Terms',
    payment_terms: 'Payment Terms',
    validity: 'Validity',
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

  // 获取当前Note在可见列表中的序号
  const { notesConfig } = useQuotationStore();
  const visibleNotes = notesConfig
    .filter(n => n.visible)
    .sort((a, b) => a.order - b.order);
  const noteIndex = visibleNotes.findIndex(n => n.id === note.id) + 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-2 transition-all duration-200 cursor-grab active:cursor-grabbing hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded ${
        isDragging ? 'shadow-lg scale-105 bg-gray-100 dark:bg-[#3A3A3C]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          {/* 可视化开关 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVisibilityToggle(note.id, note.visible);
            }}
            className={`w-4 h-4 rounded border-2 transition-colors ${
              note.visible 
                ? 'bg-[#007AFF] dark:bg-[#0A84FF] border-[#007AFF] dark:border-[#0A84FF]' 
                : 'bg-transparent border-gray-300 dark:border-gray-600'
            }`}
            title={note.visible ? '隐藏条款' : '显示条款'}
          >
            {note.visible && (
              <svg className="w-2 h-2 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
          {/* 序号显示（仅对可见项编号） */}
          <div className="flex items-center space-x-1">
            <span className="text-xs font-medium text-gray-500 dark:text-[#98989D] min-w-[20px]">
              {note.visible ? `${noteIndex}.` : ''}
            </span>
            <span className={`text-xs font-medium ${note.visible ? 'text-gray-700 dark:text-[#F5F5F7]' : 'text-gray-400 dark:text-[#6B6B6B]'}`}>
              {getNoteDisplayName(note.id)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* 拖拽句柄 */}
          <div className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3 h-3 text-gray-400" />
          </div>
        </div>
      </div>
      
      {/* 内联选择器 */}
      {isSpecialNote && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-[#98989D]">
              选择选项：
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOptions(!showOptions);
              }}
              className="text-xs text-[#007AFF] dark:text-[#0A84FF] hover:underline flex items-center gap-1"
            >
              {selectedOption ? selectedOption.chinese : '选择选项'}
              <ChevronDown className={`w-3 h-3 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {showOptions && (
            <div className="bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-lg p-2 max-h-32 overflow-y-auto">
              <div className="space-y-1">
                {options.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateSpecialOption(note.id, option.id);
                    setShowOptions(false);
                  }}
                    className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                    selectedOptionId === option.id
                      ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white'
                        : 'text-gray-700 dark:text-[#F5F5F7] hover:bg-gray-100 dark:hover:bg-[#3A3A3C]'
                  }`}
                  title={option.english}
                >
                    <div className="font-medium">{option.chinese}</div>
                    <div className="text-xs opacity-75">{option.english}</div>
                </button>
              ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="text-xs text-gray-600 dark:text-[#98989D]">
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
          className="w-full p-1 text-xs border-0 bg-transparent text-gray-800 dark:text-[#F5F5F7] resize-none focus:outline-none focus:ring-0"
          rows={1}
          placeholder="输入条款内容..."
        />
        
        {/* 空值防御提示 */}
        {note.visible && !getNoteContent(note.id, data, selectedOption).trim() && (
          <div className="mt-1 px-2 py-1 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
            ⚠️ 此条款可见但内容为空，建议填写内容或隐藏条款
          </div>
        )}
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
  
  // 新增的Notes类型处理
  if (noteId === 'delivery_time') {
    return NOTES_CONTENT_MAP[noteId] || 'Delivery Time: 30-45 days after order confirmation';
  }
  if (noteId === 'price_based_on') {
    return NOTES_CONTENT_MAP[noteId] || 'Price Based On: FOB Shanghai, China';
  }
  if (noteId === 'validity') {
    return NOTES_CONTENT_MAP[noteId] || 'Validity: This quotation is valid for 30 days';
  }
  if (noteId === 'quality_terms') {
    return NOTES_CONTENT_MAP[noteId] || 'Quality Terms: According to customer requirements';
  }
  if (noteId === 'warranty_terms') {
    return NOTES_CONTENT_MAP[noteId] || 'Warranty: 12 months from delivery date';
  }
  
  // 默认Notes从映射中获取
  return NOTES_CONTENT_MAP[noteId] || '';
}
