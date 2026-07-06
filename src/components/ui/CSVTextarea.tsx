'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface CSVTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  onPaste?: (event: React.ClipboardEvent) => void;
}

interface CellData {
  value: string;
  rowSpan?: number;
  colSpan?: number;
  isMerged?: boolean;
}

export const CSVTextarea: React.FC<CSVTextareaProps> = ({
  value,
  onChange,
  placeholder: _placeholder,
  className: _className = '',
  rows: _rows = 2,
  onPaste
}) => {
  const [tableData, setTableData] = useState<CellData[][]>([]);
  const [selectedCells, setSelectedCells] = useState<{row: number, col: number}[]>([]);
  const [showTable, setShowTable] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 初始化表格数据
  useEffect(() => {
    if (value && value.trim()) {
      const parsedData = parseCSV(value);
      setTableData(parsedData);
    }
  }, [value]);

  // 自动调整文本框高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  // 解析CSV数据
  const parseCSV = (csvText: string): CellData[][] => {
    if (!csvText.trim()) return [];

    // 检测分隔符类型
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // 智能检测分隔符
    const firstLine = lines[0];
    let separator = '\t'; // 默认使用制表符

    if (firstLine.includes('\t')) {
      separator = '\t';
    } else if (firstLine.includes(',')) {
      separator = ',';
    } else if (firstLine.includes(';')) {
      separator = ';';
    } else if (firstLine.includes('|')) {
      separator = '|';
    }

    // 解析原始数据
    const rawData = lines.map(line => {
      return line.split(separator).map(cell => cell.trim());
    });

    // 检测合并单元格
    const processedData: CellData[][] = [];

    for (let rowIndex = 0; rowIndex < rawData.length; rowIndex++) {
      const row = rawData[rowIndex];
      const processedRow: CellData[] = [];

      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];

        // 检查是否应该跳过这个单元格（被合并的）
        let shouldSkip = false;
        for (let r = 0; r < rowIndex; r++) {
          for (let c = 0; c < processedData[r]?.length; c++) {
            const existingCell = processedData[r][c];
            if ((existingCell.rowSpan ?? 1) > 1 && r + (existingCell.rowSpan ?? 1) > rowIndex) {
              if (c + (existingCell.colSpan ?? 1) > colIndex) {
                shouldSkip = true;
                break;
              }
            }
          }
          if (shouldSkip) break;
        }

        if (shouldSkip) {
          continue;
        }

        // 计算合并范围
        let rowSpan = 1;
        let colSpan = 1;

        // 检查向下合并（包括空单元格）
        for (let r = rowIndex + 1; r < rawData.length; r++) {
          const nextCell = rawData[r][colIndex];
          if (cell !== '') {
            if (nextCell === '' || nextCell === cell) {
              rowSpan++;
            } else {
              break;
            }
          } else {
            // 如果当前单元格为空，检查是否应该被上面的单元格合并
            let shouldBeMerged = false;
            for (let checkRow = rowIndex - 1; checkRow >= 0; checkRow--) {
              const checkCell = rawData[checkRow][colIndex];
              if (checkCell !== '') {
                let checkRowSpan = 1;
                for (let sr = checkRow + 1; sr < rawData.length; sr++) {
                  if (rawData[sr][colIndex] === '' || rawData[sr][colIndex] === checkCell) {
                    checkRowSpan++;
                  } else {
                    break;
                  }
                }
                if (checkRow + checkRowSpan > rowIndex) {
                  shouldBeMerged = true;
                  break;
                }
              }
            }
            if (shouldBeMerged) {
              continue; // 跳过这个空单元格
            }
          }
        }

        // 检查向右合并
        for (let c = colIndex + 1; c < row.length; c++) {
          const nextCell = row[c];
          if (cell !== '') {
            if (nextCell === '' || nextCell === cell) {
              colSpan++;
            } else {
              break;
            }
          }
        }

        // 只有当单元格不为空或者有合并范围时才添加
        if (cell !== '' || rowSpan > 1 || colSpan > 1) {
          processedRow.push({
            value: cell,
            rowSpan,
            colSpan,
            isMerged: rowSpan > 1 || colSpan > 1
          });
        }
      }

      processedData.push(processedRow);
    }

    return processedData;
  };

  // 将表格数据转换回CSV格式
  const tableToCSV = (data: CellData[][]): string => {
    return data.map(row => row.map(cell => cell.value).join('\t')).join('\n');
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
        // 将解析后的数据转换为制表符格式
        const csvText = tableToCSV(parsedData);
        onChange(csvText);

        // 显示成功提示
        showPasteSuccess();
      }
    }

    // 调用原有的onPaste处理函数
    if (onPaste) {
      onPaste(event);
    }
  };

  // 显示粘贴成功提示
  const showPasteSuccess = () => {
    // 创建一个临时的提示元素
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300';
    toast.textContent = '表格数据已粘贴，正在显示表格视图...';
    document.body.appendChild(toast);

    // 3秒后自动移除
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  };

  // 快速粘贴功能
  const handleQuickPaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        const parsedData = parseCSV(clipboardText);
        if (parsedData.length > 0) {
          setTableData(parsedData);
          const csvText = tableToCSV(parsedData);
          onChange(csvText);
          showPasteSuccess();
        } else {
          showError('剪贴板中没有检测到表格数据');
        }
      } else {
        showError('剪贴板为空');
      }
    } catch (error) {
      showError('无法访问剪贴板，请直接粘贴到文本框中');
    }
  };

  // 显示错误提示
  const showError = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
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
    if (!newData[rowIndex][colIndex]) {
      newData[rowIndex][colIndex] = {
        value: '',
        rowSpan: 1,
        colSpan: 1,
        isMerged: false
      };
    }
    newData[rowIndex][colIndex].value = newValue;
    setTableData(newData);

    // 更新文本框内容
    const csvText = tableToCSV(newData);
    onChange(csvText);
  };

  // 选择单元格
  const selectCell = (rowIndex: number, colIndex: number) => {
    setSelectedCells([{row: rowIndex, col: colIndex}]);
  };

  // 合并选中的单元格
  const mergeCells = () => {
    if (selectedCells.length < 2) return;

    const newData = [...tableData];
    const minRow = Math.min(...selectedCells.map(cell => cell.row));
    const maxRow = Math.max(...selectedCells.map(cell => cell.row));
    const minCol = Math.min(...selectedCells.map(cell => cell.col));
    const maxCol = Math.max(...selectedCells.map(cell => cell.col));

    // 合并所有选中的单元格
    const mergedValue = selectedCells
      .map(cell => newData[cell.row]?.[cell.col]?.value || '')
      .filter(v => v)
      .join(' ');

    // 设置主单元格
    if (!newData[minRow]) newData[minRow] = [];
    newData[minRow][minCol] = {
      value: mergedValue,
      rowSpan: maxRow - minRow + 1,
      colSpan: maxCol - minCol + 1,
      isMerged: true
    };

    // 标记其他单元格为已合并
    selectedCells.forEach(cell => {
      if (cell.row !== minRow || cell.col !== minCol) {
        if (!newData[cell.row]) newData[cell.row] = [];
        newData[cell.row][cell.col] = {
          value: '',
          rowSpan: 1,
          colSpan: 1,
          isMerged: true
        };
      }
    });

    setTableData(newData);
    setSelectedCells([]);

    // 更新文本框内容
    const csvText = tableToCSV(newData);
    onChange(csvText);
  };

  // 取消合并单元格
  const unmergeCells = () => {
    if (selectedCells.length !== 1) return;

    const cell = selectedCells[0];
    const newData = [...tableData];
    const currentCell = newData[cell.row]?.[cell.col];

    if (currentCell && currentCell.isMerged && ((currentCell.rowSpan ?? 1) > 1 || (currentCell.colSpan ?? 1) > 1)) {
      // 恢复为普通单元格
      newData[cell.row][cell.col] = {
        value: currentCell.value,
        rowSpan: 1,
        colSpan: 1,
        isMerged: false
      };

      setTableData(newData);
      setSelectedCells([]);

      // 更新文本框内容
      const csvText = tableToCSV(newData);
      onChange(csvText);
    }
  };

  // 添加新行
  const addRow = () => {
    const newRow: CellData[] = [{
      value: '',
      rowSpan: 1,
      colSpan: 1,
      isMerged: false
    }];
    const newData = [...tableData, newRow];
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
    const newData = tableData.map(row => [
      ...row,
      {
        value: '',
        rowSpan: 1,
        colSpan: 1,
        isMerged: false
      }
    ]);
    setTableData(newData);
    const csvText = tableToCSV(newData);
    onChange(csvText);
  };

  // 删除列
  const deleteColumn = (colIndex: number) => {
    const newData = tableData.map(row => row.filter((_, index) => index !== colIndex));
    setTableData(newData);
    onChange(tableToCSV(newData));
  };



  return (
    <div className="relative">
      {/* 内嵌表格编辑器 */}
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        {/* 工具栏 */}
        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickPaste}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
              >
                📋 粘贴表格
              </button>
              <Button
                onClick={addRow}
                size="xs"
              >
                ➕ 添加行
              </Button>
              <Button
                onClick={addColumn}
                size="xs"
              >
                ➕ 添加列
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={mergeCells}
                disabled={selectedCells.length < 2}
                className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                🔗 合并
              </button>
              <button
                onClick={unmergeCells}
                disabled={selectedCells.length !== 1}
                className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                🔓 取消合并
              </button>
            </div>
          </div>
        </div>

        {/* 表格内容 */}
        <div className="max-h-96 overflow-auto">
          {showTable && tableData.length > 0 ? (
            <table className="w-full border-collapse">
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-200 dark:border-gray-600">
                    {row.map((cell, colIndex) => {
                      // 跳过被合并的单元格
                      if (cell.isMerged && ((cell.rowSpan ?? 1) === 1 && (cell.colSpan ?? 1) === 1)) {
                        return null;
                      }

                      const isSelected = selectedCells.some(
                        selected => selected.row === rowIndex && selected.col === colIndex
                      );

                      return (
                        <td
                          key={colIndex}
                          className={`border border-gray-300 dark:border-gray-600 p-1 ${
                            isSelected ? 'bg-blue-200 dark:bg-blue-700' : ''
                          } ${cell.isMerged ? 'bg-yellow-100 dark:bg-yellow-800' : ''}`}
                          rowSpan={cell.rowSpan || 1}
                          colSpan={cell.colSpan || 1}
                          onClick={() => selectCell(rowIndex, colIndex)}
                        >
                          <input
                            type="text"
                            value={cell.value}
                            onChange={(e) => updateTableData(rowIndex, colIndex, e.target.value)}
                            className="w-full px-2 py-1 text-sm border-none outline-none bg-transparent"
                            onClick={(e) => e.stopPropagation()}
                            placeholder="输入内容..."
                          />
                        </td>
                      );
                    })}
                    <td className="border border-gray-300 dark:border-gray-600 p-1 w-16">
                      <button
                        onClick={() => deleteRow(rowIndex)}
                        className="w-full px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
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
                        className="w-full px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                      >
                        删除列
                      </button>
                    </td>
                  ))}
                  <td className="border border-gray-300 dark:border-gray-600 p-1 w-16">
                    <span className="text-xs text-gray-500">操作</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p className="mb-4">暂无表格数据</p>
              <div className="space-y-2">
                <button
                  onClick={handleQuickPaste}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  📋 从剪贴板粘贴表格
                </button>
                <div className="text-xs text-gray-400">
                  或点击&quot;添加行&quot;开始创建表格
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 隐藏的文本框用于存储数据 */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className="sr-only"
        rows={1}
      />




    </div>
  );
};
