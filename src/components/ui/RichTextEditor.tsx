'use client';
import React, { useState, useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '开始输入...',
  className = ''
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  // 初始化编辑器内容
  useEffect(() => {
    if (editorRef.current && value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  // 监听内容变化
  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // 执行命令
  const execCommand = (command: string, value?: string) => {
    // 确保编辑器获得焦点
    editorRef.current?.focus();
    
    // 特殊处理某些命令
    switch (command) {
      case 'fontSize':
        // 字体大小需要特殊处理
        document.execCommand('fontSize', false, '7'); // 先设置为7
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const span = document.createElement('span');
          span.style.fontSize = value || '14px';
          range.surroundContents(span);
        }
        break;
      case 'foreColor':
        // 文本颜色需要特殊处理
        document.execCommand('foreColor', false, value);
        break;
      default:
        // 其他命令正常执行
        document.execCommand(command, false, value);
        break;
    }
    
    // 触发内容更新
    handleInput();
  };

  // 插入表格
  const insertTable = () => {
    const rows = prompt('请输入行数:', '3');
    const cols = prompt('请输入列数:', '3');
    if (rows && cols) {
      const table = document.createElement('table');
      table.style.border = '1px solid #ccc';
      table.style.borderCollapse = 'collapse';
      table.style.width = '100%';
      table.style.marginBottom = '10px';
      
      for (let i = 0; i < parseInt(rows); i++) {
        const row = table.insertRow();
        for (let j = 0; j < parseInt(cols); j++) {
          const cell = row.insertCell();
          cell.style.border = '1px solid #ccc';
          cell.style.padding = '8px';
          cell.style.minWidth = '60px';
          cell.textContent = ' ';
        }
      }
      
      // 使用 insertHTML 命令插入表格
      const tableHTML = table.outerHTML;
      document.execCommand('insertHTML', false, tableHTML);
      editorRef.current?.focus();
      handleInput();
    }
  };

  // 插入图片
  const insertImage = () => {
    const url = prompt('请输入图片URL:', '');
    if (url) {
      const imgHTML = `<img src="${url}" alt="图片" style="max-width: 100%; height: auto; margin: 10px 0;" />`;
      document.execCommand('insertHTML', false, imgHTML);
      editorRef.current?.focus();
      handleInput();
    }
  };

  // 插入链接
  const insertLink = () => {
    const url = prompt('请输入链接URL:', '');
    const text = prompt('请输入链接文本:', '');
    if (url && text) {
      const linkHTML = `<a href="${url}" target="_blank" style="color: #0066cc; text-decoration: underline;">${text}</a>`;
      document.execCommand('insertHTML', false, linkHTML);
      editorRef.current?.focus();
      handleInput();
    }
  };

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 处理常用的键盘快捷键
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            execCommand('redo');
          } else {
            execCommand('undo');
          }
          break;
        case 'a':
          e.preventDefault();
          execCommand('selectAll');
          break;
      }
    }
  };

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
      {/* 格式工具栏 */}
      {showToolbar && (
        <div className="p-1 bg-gray-50 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
          <div className="flex flex-wrap gap-0.5 items-center">
            {/* 文本格式 */}
            <div className="flex gap-0.5">
              <button
                onClick={() => execCommand('bold')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="粗体 (Ctrl+B)"
              >
                <strong>B</strong>
              </button>
              <button
                onClick={() => execCommand('italic')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="斜体 (Ctrl+I)"
              >
                <em>I</em>
              </button>
              <button
                onClick={() => execCommand('underline')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="下划线 (Ctrl+U)"
              >
                <u>U</u>
              </button>
              <button
                onClick={() => execCommand('strikeThrough')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="删除线"
              >
                <s>S</s>
              </button>
            </div>

            {/* 字体大小 */}
            <select
              onChange={(e) => execCommand('fontSize', e.target.value)}
              className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
            >
              <option value="12px">12px</option>
              <option value="14px">14px</option>
              <option value="16px">16px</option>
              <option value="18px">18px</option>
              <option value="20px">20px</option>
              <option value="24px">24px</option>
              <option value="28px">28px</option>
              <option value="32px">32px</option>
            </select>

            {/* 文本颜色 */}
            <div className="flex gap-0.5">
              {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'].map((color) => (
                <button
                  key={color}
                  onClick={() => execCommand('foreColor', color)}
                  className="w-3.5 h-3.5 rounded border border-gray-300 dark:border-gray-500 hover:border-blue-500 transition-all duration-200"
                  style={{ backgroundColor: color }}
                  title={`颜色: ${color}`}
                />
              ))}
            </div>

            {/* 对齐方式 */}
            <div className="flex gap-0.5">
              <button
                onClick={() => execCommand('justifyLeft')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="左对齐"
              >
                ⫷
              </button>
              <button
                onClick={() => execCommand('justifyCenter')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="居中对齐"
              >
                ⫸
              </button>
              <button
                onClick={() => execCommand('justifyRight')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="右对齐"
              >
                ⫹
              </button>
              <button
                onClick={() => execCommand('justifyFull')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="两端对齐"
              >
                ⫺
              </button>
            </div>

            {/* 列表 */}
            <div className="flex gap-0.5">
              <button
                onClick={() => execCommand('insertUnorderedList')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="无序列表"
              >
                •
              </button>
              <button
                onClick={() => execCommand('insertOrderedList')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="有序列表"
              >
                1.
              </button>
            </div>

            {/* 插入功能 */}
            <div className="flex gap-0.5">
              <button
                onClick={insertTable}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="插入表格"
              >
                ⊞
              </button>
              <button
                onClick={insertImage}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="插入图片"
              >
                🖼️
              </button>
              <button
                onClick={insertLink}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="插入链接"
              >
                🔗
              </button>
            </div>

            {/* 编辑操作 */}
            <div className="flex gap-0.5">
              <button
                onClick={() => execCommand('undo')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="撤销 (Ctrl+Z)"
              >
                ↶
              </button>
              <button
                onClick={() => execCommand('redo')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="重做 (Ctrl+Y)"
              >
                ↷
              </button>
              <button
                onClick={() => execCommand('selectAll')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="全选 (Ctrl+A)"
              >
                ☑
              </button>
              <button
                onClick={() => execCommand('removeFormat')}
                className="px-1 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                title="清除格式"
              >
                🗑️
              </button>
            </div>

            {/* 工具栏切换按钮 - 移到最右边 */}
            <div className="ml-auto">
              <button
                onClick={() => setShowToolbar(false)}
                className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300 rounded transition-colors duration-200"
                title="隐藏工具栏"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 工具栏显示按钮 - 当工具栏隐藏时显示 */}
      {!showToolbar && (
        <div className="p-1 bg-gray-50 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setShowToolbar(true)}
            className="px-2 py-0.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors duration-200"
            title="显示工具栏"
          >
            显示格式工具栏
          </button>
        </div>
      )}

      {/* 编辑器内容区域 */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onKeyDown={handleKeyDown}
        className="min-h-32 p-3 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        style={{ fontSize: '14px' }}
      />
    </div>
  );
};
