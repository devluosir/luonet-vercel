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

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
      {/* 编辑器内容区域 */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        className="min-h-32 p-3 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
};
