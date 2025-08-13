'use client';
import React, { useState, useRef, useEffect } from 'react';

interface CSVTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  onPaste?: (event: React.ClipboardEvent) => void;
}

export const CSVTextarea: React.FC<CSVTextareaProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  rows = 2,
  onPaste
}) => {
  const [showTable, setShowTable] = useState(false);
  const [tableData, setTableData] = useState<string[][]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 解析CSV数据
  const parseCSV = (csvText: string): string[][] => {
    if (!csvText.trim()) return [];
    
    const lines = csvText.split('\n').filter(line => line.trim());
    return lines.map(line => {
      // 处理制表符分隔的数据
      if (line.includes('\t')) {
        return line.split('\t').map(cell => cell.trim());
      }
      // 处理逗号分隔的数据
      return line.split(',').map(cell => cell.trim());
    });
  };

  // 将表格数据转换回CSV格式
  const tableToCSV = (data: string[][]): string => {
    return data.map(row => row.join('\t')).join('\n');
  };

  // 处理粘贴事件
  const handlePaste = (event: React.ClipboardEvent) => {
    const pastedText = event.clipboardData.getData('text');
    
    // 检查是否包含制表符或逗号，说明可能是CSV数据
    if (pastedText.includes('\t') || (pastedText.includes(',') && pastedText.includes('\n'))) {
      event.preventDefault();
      
      const parsedData = parseCSV(pastedText);
      if (parsedData.length > 0) {
        setTableData(parsedData);
        setShowTable(true);
        // 将解析后的数据转换为制表符格式
        const csvText = tableToCSV(parsedData);
        onChange(csvText);
      }
    }
    
    // 调用原有的onPaste处理函数
    if (onPaste) {
      onPaste(event);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Tab键处理
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newValue = value.substring(0, start) + '\t' + value.substring(end);
      onChange(newValue);
      
      // 设置光标位置
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    }
    
    // Ctrl+T 切换表格视图
    if (event.ctrlKey && event.key === 't') {
      event.preventDefault();
      const data = parseCSV(value);
      if (data.length > 0) {
        setTableData(data);
        setShowTable(!showTable);
      }
    }
  };

  // 更新表格数据
  const updateTableData = (rowIndex: number, colIndex: number, newValue: string) => {
    const newData = [...tableData];
    if (!newData[rowIndex]) {
      newData[rowIndex] = [];
    }
    newData[rowIndex][colIndex] = newValue;
    setTableData(newData);
    
    // 更新文本框内容
    const csvText = tableToCSV(newData);
    onChange(csvText);
  };

  // 添加新行
  const addRow = () => {
    const newData = [...tableData, ['']];
    setTableData(newData);
    const csvText = tableToCSV(newData);
    onChange(csvText);
  };

  // 删除行
  const deleteRow = (rowIndex: number) => {
    const newData = tableData.filter((_, index) => index !== rowIndex);
    setTableData(newData);
    const csvText = tableToCSV(newData);
    onChange(csvText);
  };

  // 添加新列
  const addColumn = () => {
    const newData = tableData.map(row => [...row, '']);
    setTableData(newData);
    const csvText = tableToCSV(newData);
    onChange(csvText);
  };

  // 删除列
  const deleteColumn = (colIndex: number) => {
    const newData = tableData.map(row => row.filter((_, index) => index !== colIndex));
    setTableData(newData);
    const csvText = tableToCSV(newData);
    onChange(csvText);
  };

  // 关闭表格视图
  const closeTable = () => {
    setShowTable(false);
  };

  return (
    <div className="relative">
      {/* 文本框 */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} resize-none overflow-hidden`}
        rows={rows}
      />
      
      {/* 工具栏 */}
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <span>支持制表符(Tab)和CSV格式</span>
        <span>•</span>
        <span>Ctrl+T 切换表格视图</span>
        <span>•</span>
        <span>直接粘贴Excel数据</span>
      </div>

      {/* 表格视图 */}
      {showTable && tableData.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl max-h-[80vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  表格视图 (CSV数据)
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addRow}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    添加行
                  </button>
                  <button
                    onClick={addColumn}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    添加列
                  </button>
                  <button
                    onClick={closeTable}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 dark:border-gray-600">
                  <tbody>
                    {tableData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, colIndex) => (
                          <td key={colIndex} className="border border-gray-300 dark:border-gray-600 p-1">
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => updateTableData(rowIndex, colIndex, e.target.value)}
                              className="w-full px-2 py-1 text-sm border-none outline-none bg-transparent"
                            />
                          </td>
                        ))}
                        <td className="border border-gray-300 dark:border-gray-600 p-1">
                          <button
                            onClick={() => deleteRow(rowIndex)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      {tableData[0]?.map((_, colIndex) => (
                        <td key={colIndex} className="border border-gray-300 dark:border-gray-600 p-1">
                          <button
                            onClick={() => deleteColumn(colIndex)}
                            className="w-full px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            删除列
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
