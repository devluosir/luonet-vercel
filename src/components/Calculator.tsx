'use client'

import { Calculator as CalculatorIcon, X, Move, ChevronDown, ChevronUp, History } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface CalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

interface HistoryItem {
  expression: string;
  result: string;
}

export function Calculator({ isOpen, onClose, triggerRef }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState(''); // 存储完整算式
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const popupRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // 计算器功能
  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
      // 更新算式显示
      if (operation) {
        setExpression(`${previousValue} ${operation} ${digit}`);
      }
    } else {
      const newDisplay = display === '0' ? digit : display + digit;
      setDisplay(newDisplay);
      // 更新算式显示
      if (operation) {
        setExpression(`${previousValue} ${operation} ${newDisplay}`);
      }
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      // 更新算式显示
      if (operation) {
        setExpression(`${previousValue} ${operation} 0.`);
      }
    } else if (display.indexOf('.') === -1) {
      const newDisplay = display + '.';
      setDisplay(newDisplay);
      // 更新算式显示
      if (operation) {
        setExpression(`${previousValue} ${operation} ${newDisplay}`);
      }
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setExpression('');
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
      setExpression(`${inputValue} ${nextOperation}`);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);
      const formattedValue = formatDisplayValue(newValue);
      setDisplay(formattedValue);
      setPreviousValue(newValue);
      setExpression(`${formattedValue} ${nextOperation}`);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string) => {
    let result: number;
    switch (operation) {
      case '+': 
        result = firstValue + secondValue;
        break;
      case '-': 
        result = firstValue - secondValue;
        break;
      case '×': 
        result = firstValue * secondValue;
        break;
      case '÷': 
        result = firstValue / secondValue;
        break;
      default: 
        result = secondValue;
    }
    
    // 处理精度问题，避免浮点数误差
    return Math.round(result * 1000000000000) / 1000000000000;
  };

  const calculateResult = () => {
    if (!previousValue || !operation) return;

    const inputValue = parseFloat(display);
    const newValue = calculate(previousValue, inputValue, operation);
    
    // 格式化显示结果，避免过长的小数
    const formattedResult = formatDisplayValue(newValue);
    
    // 添加到历史记录
    const fullExpression = `${previousValue} ${operation} ${inputValue}`;
    addToHistory(fullExpression, formattedResult);
    
    setDisplay(formattedResult);
    setExpression(fullExpression);
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  // 格式化显示值，处理精度和显示格式
  const formatDisplayValue = (value: number): string => {
    // 如果是整数，直接返回
    if (Number.isInteger(value)) {
      return value.toString();
    }
    
    // 如果是小数，限制小数位数
    const decimalPlaces = value.toString().split('.')[1]?.length || 0;
    if (decimalPlaces > 8) {
      return value.toFixed(8).replace(/\.?0+$/, '');
    }
    
    return value.toString();
  };

  // 历史记录功能
  const addToHistory = (expression: string, result: string) => {
    const newHistoryItem: HistoryItem = {
      expression,
      result
    };
    
    setHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]); // 保留最近10条记录
  };

  const clearHistory = () => {
    setHistory([]);
  };



  // 计算弹窗位置
  const calculatePopupPosition = () => {
    if (!triggerRef.current) return;

    const buttonRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = isHistoryExpanded ? 520 : 320; // 根据历史记录展开状态调整宽度
    const popupHeight = 480; // 固定高度
    const margin = 10; // 边距

    let top = buttonRect.top - popupHeight - margin;
    // 保持左侧对齐，避免展开时位置跳动
    let left = buttonRect.left + (buttonRect.width / 2) - 160; // 固定左侧位置（320px的一半）

    // 如果上方空间不够，显示在下方
    if (top < margin) {
      top = buttonRect.bottom + margin;
    }

    // 如果下方空间也不够，显示在中间
    if (top + popupHeight > viewportHeight - margin) {
      top = (viewportHeight - popupHeight) / 2;
    }

    // 确保不超出左右边界
    if (left < margin) {
      left = margin;
    } else if (left + popupWidth > viewportWidth - margin) {
      left = viewportWidth - popupWidth - margin;
    }

    setPopupPosition({ top, left });
  };

  // 拖动相关函数
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!popupRef.current) return;
    
    const rect = popupRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !popupRef.current) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = isHistoryExpanded ? 520 : 320;
    const popupHeight = 480;
    const margin = 10;

    let newLeft = e.clientX - dragOffset.x;
    let newTop = e.clientY - dragOffset.y;

    // 边界检查
    if (newLeft < margin) newLeft = margin;
    if (newLeft + popupWidth > viewportWidth - margin) {
      newLeft = viewportWidth - popupWidth - margin;
    }
    if (newTop < margin) newTop = margin;
    if (newTop + popupHeight > viewportHeight - margin) {
      newTop = viewportHeight - popupHeight - margin;
    }

    setPopupPosition({ top: newTop, left: newLeft });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 监听鼠标移动和释放
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // 监听窗口大小变化，重新计算位置
  useEffect(() => {
    if (isOpen) {
      const handleResize = () => {
        calculatePopupPosition();
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isOpen]);

  // 点击外部关闭弹窗
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        if (popupRef.current && !popupRef.current.contains(event.target as Node) &&
            triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // 当弹窗打开时计算位置
  useEffect(() => {
    if (isOpen) {
      // 延迟计算位置，确保弹窗已渲染
      setTimeout(calculatePopupPosition, 10);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      ref={popupRef}
      className={`fixed z-50 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 p-6 ${
        isDragging ? 'cursor-grabbing select-none' : 'cursor-default'
      }`}
      style={{
        top: `${popupPosition.top}px`,
        left: `${popupPosition.left}px`,
        transform: 'translateZ(0)', // 启用硬件加速
        userSelect: isDragging ? 'none' : 'auto',
        width: isHistoryExpanded ? '520px' : '320px',
        height: '480px',
        transition: 'width 0.3s ease-in-out'
      }}
    >
      {/* 弹窗头部 - 可拖动区域 */}
      <div 
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between mb-4 cursor-grab active:cursor-grabbing select-none"
        style={{ userSelect: 'none' }}
      >
        <div className="flex items-center space-x-2">
          <Move className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <CalculatorIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">计算器</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <History className="h-4 w-4" />
            <span>历史</span>
            {isHistoryExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex gap-4 h-full">
        {/* 左侧计算器 */}
        <div className="flex-1">
          {/* 显示屏 */}
          <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {/* 算式显示 */}
            {expression && (
              <div className="text-right text-sm text-gray-500 dark:text-gray-400 mb-2 font-mono overflow-hidden">
                {expression}
              </div>
            )}
            {/* 当前数值显示 */}
            <div className="text-right text-2xl font-mono text-gray-900 dark:text-white overflow-hidden">
              {display}
            </div>
          </div>

          {/* 按钮网格 */}
          <div className="grid grid-cols-4 gap-2">
            {/* 第一行 */}
            <button onClick={clear} className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
              C
            </button>
                    <button onClick={() => setDisplay(formatDisplayValue(-parseFloat(display)))} className="p-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          ±
        </button>
        <button onClick={() => setDisplay(formatDisplayValue(parseFloat(display) / 100))} className="p-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          %
        </button>
            <button onClick={() => performOperation('÷')} className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              ÷
            </button>

            {/* 第二行 */}
            <button onClick={() => inputDigit('7')} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              7
            </button>
            <button onClick={() => inputDigit('8')} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              8
            </button>
            <button onClick={() => inputDigit('9')} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              9
            </button>
            <button onClick={() => performOperation('×')} className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              ×
            </button>

            {/* 第三行 */}
            <button onClick={() => inputDigit('4')} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              4
            </button>
            <button onClick={() => inputDigit('5')} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              5
            </button>
            <button onClick={() => inputDigit('6')} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              6
            </button>
            <button onClick={() => performOperation('-')} className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              -
            </button>

            {/* 第四行 */}
            <button onClick={() => inputDigit('1')} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              1
            </button>
            <button onClick={() => inputDigit('2')} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              2
            </button>
            <button onClick={() => inputDigit('3')} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              3
            </button>
            <button onClick={() => performOperation('+')} className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              +
            </button>

            {/* 第五行 */}
            <button onClick={() => inputDigit('0')} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors col-span-2">
              0
            </button>
            <button onClick={inputDecimal} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              .
            </button>
            <button onClick={calculateResult} className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              =
            </button>
          </div>
        </div>

        {/* 右侧历史记录区域 */}
        {isHistoryExpanded && (
          <div className="w-48 border-l border-gray-200 dark:border-gray-700 pl-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">历史记录</h4>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-500 hover:text-red-600 transition-colors"
                >
                  清空
                </button>
              )}
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                  暂无历史记录
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item, index) => (
                    <div key={index} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-mono mb-1">
                        {item.expression} = {item.result}
                      </div>
                      <button
                        onClick={() => setDisplay(item.result)}
                        className="w-full px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        使用结果
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 