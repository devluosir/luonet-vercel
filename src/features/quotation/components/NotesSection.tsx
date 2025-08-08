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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EyeOff, GripVertical, Settings, ChevronDown } from 'lucide-react';
import { useQuotationStore } from '../state/useQuotationStore';
import { NOTES_CONTENT_MAP, PAYMENT_TERMS_OPTIONS, DELIVERY_TERMS_OPTIONS, DEFAULT_NOTES_CONFIG } from '../types/notes';
import type { NoteConfig } from '../types/notes';

interface NotesSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                  updateSpecialNoteOption('delivery_time', 'custom_As stated above, subject to prior sale.');
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
                  updateSpecialNoteOption('delivery_time', 'custom_As stated above, subject to prior sale.');
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
                  updateSpecialNoteOption('delivery_time', 'custom_As stated above, subject to prior sale.');
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



// 可拖拽的Note组件
interface SortableNoteProps {
  note: NoteConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  onVisibilityToggle: (noteId: string, currentVisible: boolean) => void;
  onUpdateSpecialOption: (noteId: string, optionId: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const isSpecialNote = note.id === 'payment_terms' || note.id === 'delivery_time';
  const options = note.id === 'payment_terms' ? PAYMENT_TERMS_OPTIONS : DELIVERY_TERMS_OPTIONS;
  const selectedOptionId = (note as NoteConfig & { selectedOption?: string }).selectedOption;
  const selectedOption = options.find(opt => opt.id === selectedOptionId);
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // 获取当前Note在可见列表中的序号
  const { notesConfig } = useQuotationStore();
  const visibleNotes = notesConfig
    .filter(n => n.visible)
    .sort((a, b) => a.order - b.order);
  const noteIndex = visibleNotes.findIndex(n => n.id === note.id) + 1;

  // 编辑相关函数
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(getNoteContent(note.id, data, selectedOption));
  };

  const handleSaveEdit = () => {
    if (isSpecialNote) {
      // 特殊Notes - 保存自定义内容
      onUpdateSpecialOption(note.id, `custom_${editValue}`);
    } else {
      // 普通Notes - 更新data.notes
      const noteIndex = note.id === 'custom_note_1' ? 0 : 1;
      const newNotes = [...(data.notes || [])];
      newNotes[noteIndex] = editValue;
      onChange({ ...data, notes: newNotes });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue('');
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
        showOptions 
          ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 shadow-md' 
          : isEditing
          ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
          : 'border-gray-100 dark:border-[#3A3A3C]'
      }`}
    >
      {/* 主行：开关 + 序号 + 内容 + 操作 */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          {/* 左侧：开关 + 序号 + 内容 */}
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
      
            {/* 内容区域 - 分离拖拽和编辑 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                {/* 内容区域 */}
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    {isSpecialNote ? (
                      // 特殊Notes：显示选择的内容或自定义内容
                      isEditing ? (
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={handleSaveEdit}
                          className="w-full text-sm border border-gray-300 dark:border-[#3A3A3C] rounded px-2 py-1 bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] resize-none"
                          rows={1}
                          placeholder="输入自定义内容..."
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div 
                            className="text-sm text-gray-600 dark:text-[#98989D] cursor-text hover:bg-gray-100 dark:hover:bg-[#3A3A3C] px-2 py-1 rounded -mx-2 flex-1"
                            onClick={handleStartEdit}
                            title="点击编辑自定义内容"
                          >
                            {selectedOption ? selectedOption.english : getNoteContent(note.id, data, selectedOption) || '点击编辑自定义内容...'}
                          </div>
                          {/* 收缩态标签提示 */}
                          {selectedOption && !showOptions && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 flex-shrink-0">
                              {selectedOption.chinese}
                            </span>
                          )}
                        </div>
                      )
                    ) : (
                      // 普通Notes：可编辑文本框
                      isEditing ? (
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
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
                          title="双击编辑"
                        >
                          {getNoteContent(note.id, data, selectedOption) || '点击编辑...'}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 右侧：操作按钮 */}
          <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
            {/* 特殊Notes的展开/收缩按钮 */}
      {isSpecialNote && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOptions(!showOptions);
              }}
                className={`p-1 rounded transition-all duration-200 ${
                  showOptions 
                    ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white' 
                    : 'hover:bg-gray-100 dark:hover:bg-[#3A3A3C] text-gray-400'
                }`}
                title={note.id === 'payment_terms' ? '选择付款方式' : '选择交货时间'}
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showOptions ? 'rotate-180' : ''}`} />
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
      
      {/* 展开选项面板（特殊Notes） */}
      {isSpecialNote && showOptions && (
        <div className="border-t border-gray-200 dark:border-[#3A3A3C] bg-gray-50 dark:bg-[#2C2C2E]">
          <div className="p-3">
            {/* 搜索框 */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="搜索选项..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#3A3A3C] rounded-lg bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#007AFF] dark:focus:ring-[#0A84FF]"
                onChange={(_e) => {
                  // TODO: 实现搜索过滤功能
                }}
              />
            </div>
            
            {/* 分组选项 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 常用选项组 */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-[#98989D] mb-2 uppercase tracking-wide">
                  📅 常用选项
                </h4>
                <div className="space-y-1">
                  {options.slice(0, 5).map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateSpecialOption(note.id, option.id);
                        setShowOptions(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedOptionId === option.id
                          ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white'
                          : 'text-gray-700 dark:text-[#F5F5F7] hover:bg-gray-100 dark:hover:bg-[#3A3A3C]'
                      }`}
                      title={option.english}
                    >
                      <div className="font-medium">{option.chinese}</div>
                      <div className="text-xs opacity-75 mt-0.5">{option.english}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 其他选项组 */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-[#98989D] mb-2 uppercase tracking-wide">
                  ⚡ 其他选项
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {options.slice(5).map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateSpecialOption(note.id, option.id);
                    setShowOptions(false);
                  }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedOptionId === option.id
                      ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white'
                          : 'text-gray-700 dark:text-[#F5F5F7] hover:bg-gray-100 dark:hover:bg-[#3A3A3C]'
                  }`}
                  title={option.english}
                >
                      <div className="font-medium">{option.chinese}</div>
                      <div className="text-xs opacity-75 mt-0.5">{option.english}</div>
                </button>
              ))}
                </div>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-200 dark:border-[#3A3A3C]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                  setShowOptions(false);
                  }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-[#98989D] hover:text-gray-800 dark:hover:text-[#F5F5F7] transition-colors"
                >
                取消
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                  setShowOptions(false);
                  }}
                className="px-3 py-1.5 text-sm bg-[#007AFF] dark:bg-[#0A84FF] text-white rounded-lg hover:bg-[#0056CC] dark:hover:bg-[#0066CC] transition-colors"
                >
                确定
                </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 空值防御提示 */}
      {note.visible && !getNoteContent(note.id, data, selectedOption).trim() && (
        <div className="px-3 pb-3">
          <div className="px-2 py-1 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
            ⚠️ 此条款可见但内容为空，建议填写内容或隐藏条款
          </div>
      </div>
      )}
    </div>
  );
};

// 获取Note内容
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNoteContent(noteId: string, data: any, selectedOption?: any): string {
  // 特殊Notes（付款方式和交货时间）
  if (noteId === 'payment_terms' && selectedOption) {
    // 检查是否为自定义编辑的内容
    if (selectedOption.id && selectedOption.id.startsWith('custom_')) {
      return selectedOption.id.replace('custom_', '');
    }
    return selectedOption.english || '';
  }
  if (noteId === 'delivery_time' && selectedOption) {
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
