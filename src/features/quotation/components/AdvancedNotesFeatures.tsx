'use client';
import React, { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react';
import { Search, Filter, Download, Upload, RefreshCw, Eye, EyeOff, ChevronDown, X, Zap, Sparkles, Brain, Bookmark } from 'lucide-react';
import type { NoteConfig } from '../types/notes';

// 🚀 智能模板建议
interface TemplatePattern {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  suggestion: string;
  confidence: number;
}

const SMART_TEMPLATES: TemplatePattern[] = [
  {
    id: 'delivery_time_detection',
    name: '交货期识别',
    description: '检测并优化交货期表述',
    pattern: /\b(\d+)\s*(天|days?|weeks?)\b/i,
    suggestion: 'Delivery Time: {matched} after order confirmation',
    confidence: 0.9,
  },
  {
    id: 'payment_term_detection',
    name: '付款条件识别',
    description: '识别付款比例和方式',
    pattern: /\b(\d+)%.*?(\d+)%\b/i,
    suggestion: 'Payment Term: {first}% deposit, {second}% before shipment',
    confidence: 0.85,
  },
  {
    id: 'price_basis_detection',
    name: '价格基础识别',
    description: '检测价格条款类型',
    pattern: /\b(EXW|FOB|CIF|DDP|DDU)\b/i,
    suggestion: 'Price Basis: {matched} {port}, China',
    confidence: 0.95,
  },
  {
    id: 'validity_detection',
    name: '有效期识别',
    description: '检测报价有效期',
    pattern: /\b(\d+)\s*(天|days?)\s*(有效|valid)/i,
    suggestion: 'Validity: {number} days',
    confidence: 0.8,
  },
];

// 🚀 批量操作类型
interface BatchOperation {
  id: string;
  name: string;
  icon: React.ElementType<{ className?: string }>;
  description: string;
  action: (notes: NoteConfig[]) => NoteConfig[];
  shortcut?: string;
}

type FilterType = 'all' | 'visible' | 'hidden' | 'custom';

interface SmartSuggestionItem {
  text: string;
  confidence: number;
  reasoning: string;
}

interface SmartSuggestion {
  noteId: string;
  originalText: string;
  suggestions: SmartSuggestionItem[];
}

const FILTER_TYPES: FilterType[] = ['all', 'visible', 'hidden', 'custom'];

const isFilterType = (value: string): value is FilterType => FILTER_TYPES.includes(value as FilterType);

const isNoteConfig = (value: unknown): value is NoteConfig => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.visible === 'boolean' &&
    typeof record.order === 'number' &&
    (record.content === undefined || typeof record.content === 'string')
  );
};

// 🚀 快捷键管理
const useKeyboardShortcuts = (onAction: (actionId: string) => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + 组合键
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            if (e.shiftKey) {
              e.preventDefault();
              onAction('select_all');
            }
            break;
          case 'h':
            if (e.shiftKey) {
              e.preventDefault();
              onAction('hide_all');
            }
            break;
          case 's':
            if (e.shiftKey) {
              e.preventDefault();
              onAction('show_all');
            }
            break;
          case 'r':
            if (e.shiftKey) {
              e.preventDefault();
              onAction('reset_order');
            }
            break;
          case 'n':
            e.preventDefault();
            onAction('add_note');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onAction]);
};

// 🚀 智能建议引擎
class SmartSuggestionEngine {
  private patterns = SMART_TEMPLATES;

  analyzeText(text: string): Array<{ template: TemplatePattern; matches: RegExpMatchArray }> {
    return this.patterns
      .map(template => ({
        template,
        matches: text.match(template.pattern),
      }))
      .filter((result): result is { template: TemplatePattern; matches: RegExpMatchArray } =>
        result.matches !== null
      )
      .sort((a, b) => b.template.confidence - a.template.confidence);
  }

  generateSuggestion(text: string, template: TemplatePattern, matches: RegExpMatchArray): string {
    let suggestion = template.suggestion;

    // 替换占位符
    if (matches[1]) suggestion = suggestion.replace('{matched}', matches[1]);
    if (matches[1]) suggestion = suggestion.replace('{first}', matches[1]);
    if (matches[2]) suggestion = suggestion.replace('{second}', matches[2]);
    if (matches[1]) suggestion = suggestion.replace('{number}', matches[1]);
    if (matches[0]) suggestion = suggestion.replace('{matched}', matches[0]);

    return suggestion;
  }

  getRecommendations(notes: NoteConfig[]): Array<{
    noteId: string;
    originalText: string;
    suggestions: Array<{
      text: string;
      confidence: number;
      reasoning: string;
    }>;
  }> {
    return notes
      .filter(note => note.content && note.content.trim())
      .map(note => {
        const analyses = this.analyzeText(note.content!);
        const suggestions = analyses.map(({ template, matches }) => ({
          text: this.generateSuggestion(note.content!, template, matches),
          confidence: template.confidence,
          reasoning: template.description,
        }));

        return {
          noteId: note.id,
          originalText: note.content!,
          suggestions,
        };
      })
      .filter(result => result.suggestions.length > 0);
  }
}

interface AdvancedNotesFeaturesProps {
  notes: NoteConfig[];
  onUpdateNotes: (notes: NoteConfig[]) => void;
  onBatchUpdate: (operation: string, data?: unknown) => void;
}

export const AdvancedNotesFeatures = memo<AdvancedNotesFeaturesProps>(({
  notes,
  onUpdateNotes,
  onBatchUpdate,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [_selectedNotes, _setSelectedNotes] = useState<Set<string>>(new Set());
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestionEngine = useRef(new SmartSuggestionEngine());

  // 🚀 批量操作定义
  const batchOperations: BatchOperation[] = useMemo(() => [
    {
      id: 'show_all',
      name: '全部显示',
      icon: Eye,
      description: '显示所有Notes条款',
      action: (notes) => notes.map(note => ({ ...note, visible: true })),
      shortcut: 'Ctrl+Shift+S',
    },
    {
      id: 'hide_all',
      name: '全部隐藏',
      icon: EyeOff,
      description: '隐藏所有Notes条款',
      action: (notes) => notes.map(note => ({ ...note, visible: false })),
      shortcut: 'Ctrl+Shift+H',
    },
    {
      id: 'show_common',
      name: '仅显示常用',
      icon: Bookmark,
      description: '只显示常用的5个基础条款',
      action: (notes) => {
        const commonIds = ['delivery_time', 'price_based_on', 'delivery_terms', 'payment_terms', 'validity'];
        return notes.map(note => ({
          ...note,
          visible: commonIds.includes(note.id),
        }));
      },
    },
    {
      id: 'reset_order',
      name: '重置顺序',
      icon: RefreshCw,
      description: '恢复为默认排序',
      action: (notes) => {
        const defaultOrder = ['delivery_time', 'price_based_on', 'delivery_terms', 'payment_terms', 'validity'];
        return [...notes].sort((a, b) => {
          const aIndex = defaultOrder.indexOf(a.id);
          const bIndex = defaultOrder.indexOf(b.id);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.order - b.order;
        }).map((note, index) => ({ ...note, order: index }));
      },
      shortcut: 'Ctrl+Shift+R',
    },
    {
      id: 'smart_sort',
      name: '智能排序',
      icon: Brain,
      description: '按重要性和使用频率排序',
      action: (notes) => {
        const priorityOrder = ['delivery_time', 'payment_terms', 'price_based_on', 'validity', 'delivery_terms'];
        return [...notes].sort((a, b) => {
          const aPriority = priorityOrder.indexOf(a.id);
          const bPriority = priorityOrder.indexOf(b.id);
          if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
          if (aPriority !== -1) return -1;
          if (bPriority !== -1) return 1;
          return a.order - b.order;
        }).map((note, index) => ({ ...note, order: index }));
      },
    },
    {
      id: 'optimize_content',
      name: '优化内容',
      icon: Sparkles,
      description: '使用AI优化条款表述',
      action: (notes) => notes, // 实际实现需要AI接口
    },
  ], []);

  // 🚀 快捷键处理
  const handleShortcutAction = useCallback((actionId: string) => {
    const operation = batchOperations.find(op => op.id === actionId);
    if (operation) {
      const updatedNotes = operation.action(notes);
      onUpdateNotes(updatedNotes);
    } else if (actionId === 'add_note') {
      onBatchUpdate('add_note');
    }
  }, [notes, batchOperations, onUpdateNotes, onBatchUpdate]);

  useKeyboardShortcuts(handleShortcutAction);

  // 🚀 过滤后的Notes
  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // 按类型过滤
    switch (filterType) {
      case 'visible':
        filtered = filtered.filter(note => note.visible);
        break;
      case 'hidden':
        filtered = filtered.filter(note => !note.visible);
        break;
      case 'custom':
        filtered = filtered.filter(note => note.id.startsWith('custom_note_'));
        break;
    }

    // 按搜索词过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(note =>
        note.content?.toLowerCase().includes(term) ||
        note.id.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [notes, filterType, searchTerm]);

  // 🚀 生成智能建议
  const generateSmartSuggestions = useCallback(() => {
    const suggestions = suggestionEngine.current.getRecommendations(notes);
    setSmartSuggestions(suggestions);
    setShowSuggestions(true);
  }, [notes]);

  // 🚀 导出Notes配置
  const exportNotesConfig = useCallback(() => {
    const config = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      notes: notes.map(note => ({
        id: note.id,
        visible: note.visible,
        order: note.order,
        content: note.content,
      })),
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [notes]);

  // 🚀 导入Notes配置
  const importNotesConfig = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string) as { notes?: unknown };
        if (Array.isArray(config.notes)) {
          onUpdateNotes(config.notes.filter(isNoteConfig));
        }
      } catch (error) {
        console.error('Failed to import notes config:', error);
      }
    };
    reader.readAsText(file);
  }, [onUpdateNotes]);

  return (
    <div className="space-y-4">
      {/* 高级功能开关 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
            bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20
            text-purple-700 dark:text-purple-300 hover:from-purple-200 hover:to-indigo-200
            dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-all duration-200"
        >
          <Zap className="w-4 h-4" />
          高级功能
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {/* 快速操作 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generateSmartSuggestions}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
              bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300
              hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
            title="生成智能建议"
          >
            <Brain className="w-3 h-3" />
            AI建议
          </button>
        </div>
      </div>

      {/* 高级功能面板 */}
      {showAdvanced && (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-[#1C1C1E] dark:to-[#2C2C2E] rounded-xl p-4 space-y-4">
          {/* 搜索和过滤 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索Notes内容..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-[#3A3A3C] rounded-lg
                  bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-[#F5F5F7]
                  focus:outline-none focus:ring-2 focus:ring-[#007AFF] dark:focus:ring-[#0A84FF]"
              />
            </div>

            {/* 过滤器 */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => {
                  if (isFilterType(e.target.value)) {
                    setFilterType(e.target.value);
                  }
                }}
                className="w-full pl-10 pr-8 py-2 text-sm border border-gray-200 dark:border-[#3A3A3C] rounded-lg
                  bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-[#F5F5F7]
                  focus:outline-none focus:ring-2 focus:ring-[#007AFF] dark:focus:ring-[#0A84FF]"
              >
                <option value="all">全部条款</option>
                <option value="visible">可见条款</option>
                <option value="hidden">隐藏条款</option>
                <option value="custom">自定义条款</option>
              </select>
            </div>
          </div>

          {/* 批量操作 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-[#F5F5F7] mb-3">批量操作</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {batchOperations.map((operation) => (
                <button
                  key={operation.id}
                  type="button"
                  onClick={() => {
                    const updatedNotes = operation.action(notes);
                    onUpdateNotes(updatedNotes);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                    bg-white dark:bg-[#2C2C2E] text-gray-700 dark:text-[#F5F5F7]
                    border border-gray-200 dark:border-[#3A3A3C]
                    hover:bg-gray-50 dark:hover:bg-[#3A3A3C] hover:scale-105 active:scale-95"
                  title={`${operation.description}${operation.shortcut ? ` (${operation.shortcut})` : ''}`}
                >
                  <operation.icon className="w-3 h-3" />
                  <span className="truncate">{operation.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 导入导出 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-[#F5F5F7] mb-3">配置管理</h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportNotesConfig}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                  bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300
                  hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Download className="w-3 h-3" />
                导出配置
              </button>

              <label className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer
                bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300
                hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors">
                <Upload className="w-3 h-3" />
                导入配置
                <input
                  type="file"
                  accept=".json"
                  onChange={importNotesConfig}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-white/50 dark:bg-[#1C1C1E]/50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800 dark:text-[#F5F5F7]">{notes.length}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">总条款数</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {notes.filter(n => n.visible).length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">可见条款</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {notes.filter(n => n.id.startsWith('custom_note_')).length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">自定义条款</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {filteredNotes.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">筛选结果</div>
            </div>
          </div>
        </div>
      )}

      {/* 智能建议面板 */}
      {showSuggestions && smartSuggestions.length > 0 && (
        <SmartSuggestionsPanel
          suggestions={smartSuggestions}
          onApplySuggestion={(noteId, newContent) => {
            const updatedNotes = notes.map(note =>
              note.id === noteId ? { ...note, content: newContent } : note
            );
            onUpdateNotes(updatedNotes);
          }}
          onClose={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
});

AdvancedNotesFeatures.displayName = 'AdvancedNotesFeatures';

// 🚀 智能建议面板组件
interface SmartSuggestionsPanelProps {
  suggestions: SmartSuggestion[];
  onApplySuggestion: (noteId: string, newContent: string) => void;
  onClose: () => void;
}

const SmartSuggestionsPanel = memo<SmartSuggestionsPanelProps>(({
  suggestions,
  onApplySuggestion,
  onClose,
}) => (
  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl p-4 border border-green-200 dark:border-green-800">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
        <h4 className="font-medium text-green-800 dark:text-green-200">AI智能建议</h4>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
      >
        <X className="w-4 h-4 text-green-600 dark:text-green-400" />
      </button>
    </div>

    <div className="space-y-3">
      {suggestions.map((suggestion, index) => (
        <div key={index} className="bg-white dark:bg-[#1C1C1E] rounded-lg p-3 border border-green-100 dark:border-green-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            原文本: {suggestion.originalText}
          </div>
          {suggestion.suggestions.map((item, itemIndex) => (
            <div key={itemIndex} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/10 rounded border border-green-100 dark:border-green-800">
              <div className="flex-1">
                <div className="text-sm text-gray-800 dark:text-[#F5F5F7]">{item.text}</div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {item.reasoning} (置信度: {Math.round(item.confidence * 100)}%)
                </div>
              </div>
              <button
                type="button"
                onClick={() => onApplySuggestion(suggestion.noteId, item.text)}
                className="ml-3 px-3 py-1 rounded bg-green-600 text-white text-xs font-medium
                  hover:bg-green-700 transition-colors"
              >
                应用
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
));

SmartSuggestionsPanel.displayName = 'SmartSuggestionsPanel';
