'use client';
import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useQuotationStore } from '../state/useQuotationStore';
import { OptimizedNotesSection } from './OptimizedNotesSection';
import { MobileOptimizedNotes } from './MobileOptimizedNotes';
import { AdvancedNotesFeatures } from './AdvancedNotesFeatures';
import { useNotesSelectors, useOptimizedNotesActions } from '../state/optimized-selectors';
import type { NoteConfig } from '../types/notes';

// 🚀 设备检测hook
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isTouch: false,
    screenWidth: 0,
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      setDeviceInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        screenWidth: width,
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    return () => window.removeEventListener('resize', updateDeviceInfo);
  }, []);

  return deviceInfo;
};



interface UltimatePowerNotesSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (data: any) => void;
}

// 🚀 终极Notes组件 - 整合所有优化功能
export const UltimatePowerNotesSection: React.FC<UltimatePowerNotesSectionProps> = memo(({
  data,
  onChange,
}) => {
  const {
    notesConfig,
    updateNoteVisibility,
    updateNoteOrder,
    updateNoteContent,
    addNote,
    removeNote,
    setNotesConfig,
  } = useQuotationStore();

  const notesActions = useOptimizedNotesActions();
  const { isMobile, isTablet, isTouch } = useDeviceDetection();

  const [viewMode, setViewMode] = useState<'auto' | 'desktop' | 'mobile' | 'advanced'>('auto');
  const [_showAdvanced, _setShowAdvanced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 🚀 自动选择最佳视图模式
  const effectiveViewMode = useMemo(() => {
    if (viewMode !== 'auto') return viewMode;

    if (isMobile) return 'mobile';
    if (isTablet && isTouch) return 'mobile';
    return 'desktop';
  }, [viewMode, isMobile, isTablet, isTouch]);

  // 🚀 缓存可见Notes
  const _visibleNotes = useMemo(() => {
    return notesConfig
      .filter(note => note.visible)
      .sort((a, b) => a.order - b.order);
  }, [notesConfig]);

  // 🚀 优化的事件处理函数
  const handleUpdateNotes = useCallback((notes: NoteConfig[]) => {
    setNotesConfig(notes);
  }, [setNotesConfig]);

  const handleBatchUpdate = useCallback((operation: string, _data?: unknown) => {
    switch (operation) {
      case 'add_note':
        addNote();
        break;
      case 'show_all':
        notesActions.showAllNotes();
        break;
      case 'hide_all':
        notesActions.hideAllNotes();
        break;
      case 'show_common':
        notesActions.showCommonNotesOnly();
        break;
      case 'reset_order':
        notesActions.resetToDefaultOrder();
        break;
      case 'smart_sort':
        notesActions.smartSort();
        break;
      default:
        console.warn(`Unknown batch operation: ${operation}`);
    }
  }, [addNote, notesActions]);

  // 🚀 模板应用处理
  const handleApplyTemplate = useCallback((template: 'exw' | 'fob' | 'cif') => {
    // 这里可以添加模板应用逻辑
    console.log(`Applying template: ${template}`);
  }, []);

  // 🚀 渲染不同视图模式的Notes
  const renderNotesContent = useCallback(() => {
    const commonProps = {
      notes: notesConfig,
      onUpdateVisibility: updateNoteVisibility,
      onUpdateContent: updateNoteContent,
      onUpdateOrder: updateNoteOrder,
      onAddNote: addNote,
      onRemoveNote: removeNote,
      onApplyTemplate: handleApplyTemplate,
    };

    switch (effectiveViewMode) {
      case 'mobile':
        return (
          <MobileOptimizedNotes
            {...commonProps}
          />
        );

      case 'advanced':
        return (
          <div className="space-y-4">
            <AdvancedNotesFeatures
              notes={notesConfig}
              onUpdateNotes={handleUpdateNotes}
              onBatchUpdate={handleBatchUpdate}
            />
            <OptimizedNotesSection
              data={data}
              onChange={onChange || (() => {})}
            />
          </div>
        );

      case 'desktop':
      default:
        return <OptimizedNotesSection
          data={data}
          onChange={onChange || (() => {})}
        />;
    }
  }, [
    effectiveViewMode,
    notesConfig,
    updateNoteVisibility,
    updateNoteContent,
    updateNoteOrder,
    addNote,
    removeNote,
    handleApplyTemplate,
    handleUpdateNotes,
    handleBatchUpdate,
    data,
    onChange,
  ]);

  // 🚀 渲染模式切换器
  const renderModeSelector = useCallback(() => (
    <div className="flex items-center gap-2">
      {/* 视图模式切换 */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#2C2C2E] rounded-lg p-1">
        {[
          { mode: 'auto' as const, label: '自动', icon: '🤖' },
          { mode: 'desktop' as const, label: '桌面', icon: '🖥️' },
          { mode: 'mobile' as const, label: '移动', icon: '📱' },
        ].map(({ mode, label, icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              viewMode === mode
                ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white'
                : 'text-gray-600 dark:text-[#98989D] hover:bg-gray-200 dark:hover:bg-[#3A3A3C]'
            }`}
            title={label}
          >
            <span className="mr-1">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* 高级功能开关 */}
      <button
        type="button"
        onClick={() => setViewMode(viewMode === 'advanced' ? 'auto' : 'advanced')}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all duration-200 ${
          viewMode === 'advanced'
            ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
            : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-600 dark:text-[#98989D] hover:bg-gray-200 dark:hover:bg-[#3A3A3C]'
        }`}
        title="高级功能"
      >
        <Sparkles className="w-3 h-3" />
        高级
      </button>
    </div>
  ), [viewMode]);



  if (!mounted) {
    // SSR期间显示简化版本
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-[#F5F5F7]">
            Notes
          </h3>
          <div className="animate-pulse bg-gray-200 dark:bg-[#3A3A3C] w-6 h-6 rounded"></div>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-[#2C2C2E] rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部控制栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-[#F5F5F7]">
            Notes
          </h3>
        </div>

        {renderModeSelector()}
      </div>

      {/* Notes内容区域 */}
      <div className="relative">
        {renderNotesContent()}
      </div>
    </div>
  );
});

UltimatePowerNotesSection.displayName = 'UltimatePowerNotesSection';

// 🚀 导出便捷hook
export const useUltimatePowerNotes = () => {
  const store = useQuotationStore();
  const selectors = useNotesSelectors();
  const actions = useOptimizedNotesActions();

  return {
    // 状态
    notes: store.notesConfig,
    visibleNotes: selectors.selectors.visibleNotes(),

    // 操作
    updateNote: store.updateNoteContent,
    addNote: store.addNote,
    removeNote: store.removeNote,
    reorderNotes: store.updateNoteOrder,

    // 批量操作
    ...actions,

    // 统计
    stats: {
      total: store.notesConfig.length,
      visible: selectors.selectors.visibleNotesCount(),
      custom: selectors.selectors.customNotesCount(),
    },
  };
};
