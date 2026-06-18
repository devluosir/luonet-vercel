'use client';

import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  X, 
  GripVertical, 
  EyeOff, 
  ChevronDown, 
  ChevronUp,
  Edit3,
  Check,
  MoreHorizontal,
  Eye,
  Trash2,
  Move,
} from 'lucide-react';
import type { NoteConfig } from '../types/notes';

// 🚀 移动端优化配置
const MOBILE_BREAKPOINT = 768;
const TOUCH_TARGET_SIZE = 44; // iOS推荐的最小触摸目标尺寸

// 🚀 检测设备类型
const useDeviceType = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTouchDevice };
};

// 🚀 触摸手势处理
const useTouchGestures = () => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [gestureState, setGestureState] = useState<{
    isDragging: boolean;
    isLongPress: boolean;
    swipeDirection: 'left' | 'right' | null;
  }>({
    isDragging: false,
    isLongPress: false,
    swipeDirection: null,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    
    // 长按检测
    setTimeout(() => {
      if (touchStartRef.current) {
        setGestureState(prev => ({ ...prev, isLongPress: true }));
      }
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 10) {
      setGestureState(prev => ({ 
        ...prev, 
        isDragging: true,
        isLongPress: false,
      }));

      // 滑动方向检测
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        const direction = deltaX > 0 ? 'right' : 'left';
        setGestureState(prev => ({ ...prev, swipeDirection: direction }));
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    setGestureState({
      isDragging: false,
      isLongPress: false,
      swipeDirection: null,
    });
  }, []);

  return {
    gestureState,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};

interface MobileOptimizedNotesProps {
  notes: NoteConfig[];
  onUpdateVisibility: (id: string, visible: boolean) => void;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateOrder: (fromIndex: number, toIndex: number) => void;
  onAddNote: () => void;
  onRemoveNote: (id: string) => void;
  onApplyTemplate: (template: 'exw' | 'fob' | 'cif') => void;
}

export const MobileOptimizedNotes = memo<MobileOptimizedNotesProps>(({
  notes,
  onUpdateVisibility,
  onUpdateContent,
  onUpdateOrder,
  onAddNote,
  onRemoveNote,
  onApplyTemplate,
}) => {
  const { isMobile, isTouchDevice } = useDeviceType();
  const [showConfig, setShowConfig] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [contextMenuNote, setContextMenuNote] = useState<string | null>(null);

  // 🚀 获取可见Notes
  const visibleNotes = useMemo(() => {
    return notes
      .filter(note => note.visible)
      .sort((a, b) => a.order - b.order);
  }, [notes]);

  // 🚀 移动端配置面板
  const MobileConfigPanel = () => (
    <div className="bg-gray-50 dark:bg-[#2C2C2E] rounded-xl p-4 space-y-4">
      {/* 模板选择 */}
      <div>
        <h4 className="text-sm font-medium text-gray-800 dark:text-[#F5F5F7] mb-3">
          快速模板
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {[
            { key: 'exw' as const, label: 'EXW工厂交货', className: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-800' },
            { key: 'fob' as const, label: 'FOB离岸价', className: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800' },
            { key: 'cif' as const, label: 'CIF到岸价', className: 'bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-900/30 border-teal-200 dark:border-teal-800' },
          ].map(({ key, label, className }) => (
            <button
              key={key}
              type="button"
              onClick={() => onApplyTemplate(key)}
              className={`flex items-center justify-center h-12 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 border ${className}`}
              style={{ minHeight: TOUCH_TARGET_SIZE }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 批量操作 */}
      <div>
        <h4 className="text-sm font-medium text-gray-800 dark:text-[#F5F5F7] mb-3">
          批量操作
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => notes.forEach(note => onUpdateVisibility(note.id, true))}
            className="flex items-center justify-center h-10 rounded-lg text-xs font-medium
              bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300
              hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
          >
            全部显示
          </button>
          <button
            type="button"
            onClick={() => notes.forEach(note => onUpdateVisibility(note.id, false))}
            className="flex items-center justify-center h-10 rounded-lg text-xs font-medium
              bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300
              hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
          >
            全部隐藏
          </button>
        </div>
      </div>

      {/* 添加条款 */}
      <button
        type="button"
        onClick={onAddNote}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-lg
          bg-[#007AFF] dark:bg-[#0A84FF] text-white font-medium
          hover:bg-[#0056CC] dark:hover:bg-[#0056CC] 
          active:scale-95 transition-all duration-200"
        style={{ minHeight: TOUCH_TARGET_SIZE }}
      >
        <Plus className="w-5 h-5" />
        新增条款
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold text-gray-800 dark:text-[#F5F5F7] ${
          isMobile ? 'text-lg' : 'text-base'
        }`}>
          Notes
        </h3>
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center justify-center rounded-lg transition-all duration-200 active:scale-95
            hover:bg-gray-100 dark:hover:bg-[#3A3A3C]"
          style={{ 
            width: TOUCH_TARGET_SIZE, 
            height: TOUCH_TARGET_SIZE,
            minWidth: TOUCH_TARGET_SIZE,
            minHeight: TOUCH_TARGET_SIZE,
          }}
          title="配置Notes显示"
        >
          <Settings className={`text-gray-600 dark:text-[#98989D] ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
        </button>
      </div>

      {/* 配置面板 */}
      {showConfig && <MobileConfigPanel />}

      {/* Notes列表 */}
      {visibleNotes.length > 0 ? (
        <div className="space-y-3">
          {visibleNotes.map((note, index) => (
            <MobileNoteItem
              key={note.id}
              note={note}
              index={index + 1}
              isEditing={editingNoteId === note.id}
              showContextMenu={contextMenuNote === note.id}
              isMobile={isMobile}
              isTouchDevice={isTouchDevice}
              onEdit={() => setEditingNoteId(note.id)}
              onSaveEdit={(content) => {
                onUpdateContent(note.id, content);
                setEditingNoteId(null);
              }}
              onCancelEdit={() => setEditingNoteId(null)}
              onToggleVisibility={() => onUpdateVisibility(note.id, !note.visible)}
              onRemove={() => onRemoveNote(note.id)}
              onShowContextMenu={() => setContextMenuNote(note.id)}
              onHideContextMenu={() => setContextMenuNote(null)}
            />
          ))}
        </div>
      ) : (
        <MobileEmptyState onAddNote={onAddNote} />
      )}
    </div>
  );
});

MobileOptimizedNotes.displayName = 'MobileOptimizedNotes';

// 🚀 移动端优化的Note项组件
interface MobileNoteItemProps {
  note: NoteConfig;
  index: number;
  isEditing: boolean;
  showContextMenu: boolean;
  isMobile: boolean;
  isTouchDevice: boolean;
  onEdit: () => void;
  onSaveEdit: (content: string) => void;
  onCancelEdit: () => void;
  onToggleVisibility: () => void;
  onRemove: () => void;
  onShowContextMenu: () => void;
  onHideContextMenu: () => void;
}

const MobileNoteItem = memo<MobileNoteItemProps>(({
  note,
  index,
  isEditing,
  showContextMenu,
  isMobile,
  isTouchDevice,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleVisibility,
  onRemove,
  onShowContextMenu,
  onHideContextMenu,
}) => {
  const [editValue, setEditValue] = useState(note.content || '');
  const { gestureState, touchHandlers } = useTouchGestures();
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 🚀 更新编辑值
  useEffect(() => {
    if (isEditing) {
      setEditValue(note.content || '');
    }
  }, [isEditing, note.content]);

  // 🚀 保存编辑
  const handleSave = useCallback(() => {
    onSaveEdit(editValue);
  }, [editValue, onSaveEdit]);

  // 自动调整textarea高度的函数
  const adjustTextareaHeight = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    const minHeight = isMobile ? 100 : 80; // 对应 min-h-[100px] 和 min-h-[80px]
    const maxHeight = 200;
    const capped = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
    textarea.style.height = `${capped}px`;
  }, [isMobile]);

  // 当进入编辑状态时，立即调整textarea高度
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      // 使用setTimeout确保DOM已更新
      setTimeout(() => {
        if (textareaRef.current) {
          adjustTextareaHeight(textareaRef.current);
        }
      }, 0);
    }
  }, [isEditing, adjustTextareaHeight]);

  // 🚀 键盘处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Escape 键取消编辑
      e.preventDefault();
      onCancelEdit();
    }
    // Enter 键和 Shift+Enter 键都允许换行，不做特殊处理
    // 失去焦点时会自动保存
  }, [onCancelEdit]);

  // 🚀 长按处理
  useEffect(() => {
    if (gestureState.isLongPress && isTouchDevice) {
      onShowContextMenu();
    }
  }, [gestureState.isLongPress, isTouchDevice, onShowContextMenu]);

  return (
    <div 
      className={`relative rounded-xl border transition-all duration-300 ${
        isEditing 
          ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800' 
          : 'bg-white dark:bg-[#1C1C1E] border-gray-200 dark:border-[#3A3A3C] hover:border-gray-300 dark:hover:border-[#48484A]'
      } ${gestureState.isDragging ? 'scale-105 shadow-lg' : ''}`}
      {...(isTouchDevice ? touchHandlers : {})}
    >
      {/* 主内容区域 */}
      <div className="p-4">
        {/* 顶部行：序号 + 操作按钮 */}
        <div className="flex items-center justify-between mb-3">
          {/* 序号按钮 */}
          <button
            type="button"
            onClick={onToggleVisibility}
            className={`flex items-center justify-center rounded-full transition-all duration-200 ${
              isMobile ? 'w-8 h-8' : 'w-5 h-5'
            } ${
              note.visible 
                ? 'text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400' 
                : 'text-gray-400'
            }`}
            style={{ 
              minWidth: isMobile ? 32 : 20, 
              minHeight: isMobile ? 32 : 20 
            }}
          >
            <span className={`${isMobile ? 'text-sm' : 'text-xs'}`}>
              {index}
            </span>
          </button>

          {/* 操作按钮组 */}
          <div className="flex items-center space-x-2">
            {/* 展开/收起按钮 (仅移动端) */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-center w-8 h-8 rounded-lg
                  hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-600 dark:text-[#98989D]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-600 dark:text-[#98989D]" />
                )}
              </button>
            )}

            {/* 更多操作 */}
            <button
              type="button"
              onClick={onShowContextMenu}
              className="flex items-center justify-center rounded-lg transition-colors"
              style={{ 
                width: TOUCH_TARGET_SIZE, 
                height: isMobile ? 32 : 28,
                minWidth: isMobile ? 32 : 28,
              }}
            >
              <MoreHorizontal className={`text-gray-600 dark:text-[#98989D] ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        {(isExpanded || !isMobile) && (
          <div className="space-y-3">
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`w-full border border-gray-300 dark:border-[#3A3A3C] rounded-lg px-3 py-2
                    bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-[#F5F5F7]
                    focus:outline-none focus:ring-2 focus:ring-[#007AFF] dark:focus:ring-[#0A84FF]
                    resize-none overflow-auto ${isMobile ? 'text-base min-h-[100px]' : 'text-sm min-h-[80px]'}`}
                  placeholder="输入条款内容... (Esc 取消)"
                  autoFocus
                  style={{ fontSize: isMobile ? 16 : 14 }} // 防止iOS缩放
                  onInput={(e) => {
                    adjustTextareaHeight(e.currentTarget);
                  }}
                />
                
                {/* 编辑操作按钮 */}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg
                      bg-[#007AFF] dark:bg-[#0A84FF] text-white font-medium
                      hover:bg-[#0056CC] dark:hover:bg-[#0056CC] transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg
                      bg-gray-100 dark:bg-[#3A3A3C] text-gray-700 dark:text-[#F5F5F7] font-medium
                      hover:bg-gray-200 dark:hover:bg-[#48484A] transition-colors"
                  >
                    <X className="w-4 h-4" />
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className={`cursor-text rounded-lg p-3 -mx-3 transition-colors
                  hover:bg-gray-50 dark:hover:bg-[#2C2C2E] ${
                  isMobile ? 'text-base leading-relaxed' : 'text-sm'
                }`}
                onClick={onEdit}
              >
                {note.content || (
                  <span className="text-gray-400 dark:text-gray-500 italic">
                    点击编辑条款内容...
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 上下文菜单 */}
      {showContextMenu && (
        <MobileContextMenu
          note={note}
          onEdit={onEdit}
          onToggleVisibility={onToggleVisibility}
          onRemove={onRemove}
          onClose={onHideContextMenu}
        />
      )}
    </div>
  );
});

MobileNoteItem.displayName = 'MobileNoteItem';

// 🚀 移动端上下文菜单
interface MobileContextMenuProps {
  note: NoteConfig;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onRemove: () => void;
  onClose: () => void;
}

const MobileContextMenu = memo<MobileContextMenuProps>(({
  note,
  onEdit,
  onToggleVisibility,
  onRemove,
  onClose,
}) => {
  const menuActions = [
    {
      icon: Edit3,
      label: '编辑',
      action: () => { onEdit(); onClose(); },
      color: 'blue',
    },
    {
      icon: note.visible ? EyeOff : Eye,
      label: note.visible ? '隐藏' : '显示',
      action: () => { onToggleVisibility(); onClose(); },
      color: 'gray',
    },
    ...(note.id.startsWith('custom_note_') ? [{
      icon: Trash2,
      label: '删除',
      action: () => { onRemove(); onClose(); },
      color: 'red',
    }] : []),
  ];

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 z-50">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl"
        onClick={onClose}
      />
      
      {/* 菜单内容 */}
      <div className="absolute inset-x-4 top-1/2 transform -translate-y-1/2">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-xl shadow-2xl border border-gray-200 dark:border-[#3A3A3C] overflow-hidden">
          {menuActions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={action.action}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors
                hover:bg-gray-50 dark:hover:bg-[#2C2C2E]
                ${index < menuActions.length - 1 ? 'border-b border-gray-100 dark:border-[#3A3A3C]' : ''}
                ${action.color === 'red' ? 'text-red-600 dark:text-red-400' : 
                  action.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 
                  'text-gray-700 dark:text-[#F5F5F7]'}`}
              style={{ minHeight: TOUCH_TARGET_SIZE }}
            >
              <action.icon className="w-5 h-5" />
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

MobileContextMenu.displayName = 'MobileContextMenu';

// 🚀 移动端空状态
const MobileEmptyState = memo<{ onAddNote: () => void }>(({ onAddNote }) => (
  <div className="text-center py-12">
    <EyeOff className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
    <h4 className="text-lg font-medium text-gray-800 dark:text-[#F5F5F7] mb-2">
      暂无可显示的Notes
    </h4>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
      点击配置按钮选择要显示的Notes，或直接添加新条款
    </p>
    <button
      type="button"
      onClick={onAddNote}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
        bg-[#007AFF] dark:bg-[#0A84FF] text-white font-medium
        hover:bg-[#0056CC] dark:hover:bg-[#0056CC] 
        active:scale-95 transition-all duration-200"
      style={{ minHeight: TOUCH_TARGET_SIZE }}
    >
      <Plus className="w-5 h-5" />
      添加第一个条款
    </button>
  </div>
));

MobileEmptyState.displayName = 'MobileEmptyState';
