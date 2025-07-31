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
  const [expression, setExpression] = useState(''); // 存储完整算式
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyPanelPosition, setHistoryPanelPosition] = useState({ top: 0, left: 0, height: 0 });
  const [hasBeenDragged, setHasBeenDragged] = useState(false); // 标记是否已经拖动过
  const popupRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const calculatorBodyRef = useRef<HTMLDivElement>(null); // 计算器主体的引用

  // 重新设计：使用更简单的状态管理
  const [currentNumber, setCurrentNumber] = useState('0');
  const [operation, setOperation] = useState<string | null>(null);
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [justCalculated, setJustCalculated] = useState(false); // 跟踪是否刚完成计算

  // 计算器功能
  const inputDigit = (digit: string) => {
    // 如果刚完成计算，开始新算式
    if (justCalculated) {
      setDisplay(digit);
      setCurrentNumber(digit);
      setExpression(digit);
      setPreviousValue(null);
      setOperation(null);
      setJustCalculated(false);
      return;
    }
    
    if (display === '0' || currentNumber === '0') {
      setDisplay(digit);
      setCurrentNumber(digit);
      // 立即更新表达式
      if (expression === '') {
        setExpression(digit);
      } else {
        setExpression(expression + ' ' + digit);
      }
    } else {
      const newDisplay = display + digit;
      setDisplay(newDisplay);
      setCurrentNumber(newDisplay);
      // 更新表达式中的最后一个数字
      const parts = expression.split(' ');
      parts[parts.length - 1] = newDisplay;
      setExpression(parts.join(' '));
    }
  };

  const inputDecimal = () => {
    // 如果刚完成计算，开始新算式
    if (justCalculated) {
      setDisplay('0.');
      setCurrentNumber('0.');
      setExpression('0.');
      setPreviousValue(null);
      setOperation(null);
      setJustCalculated(false);
      return;
    }
    
    if (display.indexOf('.') === -1) {
      const newDisplay = display + '.';
      setDisplay(newDisplay);
      setCurrentNumber(newDisplay);
      // 更新表达式中的最后一个数字
      if (expression === '') {
        setExpression(newDisplay);
      } else {
        const parts = expression.split(' ');
        parts[parts.length - 1] = newDisplay;
        setExpression(parts.join(' '));
      }
    }
  };

  const clear = () => {
    setDisplay('0');
    setCurrentNumber('0');
    setOperation(null);
    setPreviousValue(null);
    setExpression('');
    setOpenBrackets(0);
    setInBrackets(false);
    setJustCalculated(false);
    // 注意：不清除拖动标记，保持位置记忆
  };

  // 括号相关状态
  const [openBrackets, setOpenBrackets] = useState(0);
  const [inBrackets, setInBrackets] = useState(false);

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);
    
    // 如果刚完成计算，使用结果作为新算式的开始
    if (justCalculated) {
      setPreviousValue(inputValue);
      setOperation(nextOperation);
      setExpression(display + ' ' + nextOperation);
      setJustCalculated(false);
    } else if (previousValue === null) {
      // 第一次输入运算符
      setPreviousValue(inputValue);
      setOperation(nextOperation);
      setExpression(expression + ' ' + nextOperation);
    } else if (operation) {
      // 只添加运算符到表达式，当前数字已经在表达式中了
      setPreviousValue(inputValue);
      setOperation(nextOperation);
      setExpression(expression + ' ' + nextOperation);
    }
    
    setCurrentNumber('0');
  };

  // 处理左括号
  const handleOpenBracket = () => {
    if (expression === '') {
      setExpression('(');
    } else {
      setExpression(expression + ' (');
    }
    setOpenBrackets(openBrackets + 1);
    setInBrackets(true);
  };

  // 处理右括号
  const handleCloseBracket = () => {
    if (openBrackets > 0) {
      setExpression(expression + ' )');
      setOpenBrackets(openBrackets - 1);
      if (openBrackets - 1 === 0) {
        setInBrackets(false);
      }
      setCurrentNumber('0');
    }
  };

  // 处理正负号
  const handlePlusMinus = () => {
    // 如果刚完成计算，将结果转换为相反数
    if (justCalculated) {
      const negatedValue = -parseFloat(display);
      const formattedValue = formatDisplayValue(negatedValue);
      setDisplay(formattedValue);
      setExpression(formattedValue);
      setCurrentNumber(formattedValue);
      return;
    }
    
    // 如果当前显示为0，不做任何操作
    if (display === '0') {
      return;
    }
    
    // 获取当前数字的负值
    const currentValue = parseFloat(display);
    const negatedValue = -currentValue;
    const formattedValue = formatDisplayValue(negatedValue);
    
    setDisplay(formattedValue);
    setCurrentNumber(formattedValue);
    
    // 更新表达式中的当前数字
    if (expression === '' || expression === display) {
      // 如果表达式为空或等于当前显示值，直接设置为新值
      setExpression(formattedValue);
    } else {
      // 替换表达式中的最后一个数字
      const parts = expression.split(' ');
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        // 检查最后一部分是否是数字
        if (!isNaN(parseFloat(lastPart))) {
          parts[parts.length - 1] = formattedValue;
          setExpression(parts.join(' '));
        } else {
          // 如果最后一部分是运算符，添加负号数字
          if (['+', '-', '×', '÷', '('].includes(lastPart)) {
            setExpression(expression + ' ' + formattedValue);
          }
        }
      }
    }
  };

  // 处理百分号
  const handlePercentage = () => {
    const currentValue = parseFloat(display);
    
    // 如果刚完成计算，将结果转换为百分比
    if (justCalculated) {
      const percentValue = currentValue / 100;
      const formattedValue = formatDisplayValue(percentValue);
      setDisplay(formattedValue);
      setExpression(formattedValue);
      setCurrentNumber(formattedValue);
      return;
    }
    
    // 如果有前一个值和运算符，说明是在运算中使用百分号
    if (previousValue !== null && operation) {
      let percentResult: number;
      
      // 智能百分比计算
      switch (operation) {
        case '+':
        case '-':
          // 对于加减法，百分比是基于前一个值的
          // 例如：100 + 20% = 100 + (100 * 20 / 100) = 120
          percentResult = previousValue * (currentValue / 100);
          break;
        case '×':
        case '÷':
          // 对于乘除法，百分比就是简单的除以100
          // 例如：50 × 20% = 50 × 0.2 = 10
          percentResult = currentValue / 100;
          break;
        default:
          percentResult = currentValue / 100;
      }
      
      const formattedResult = formatDisplayValue(percentResult);
      setDisplay(formattedResult);
      setCurrentNumber(formattedResult);
      
      // 在表达式中显示百分号，而不是计算后的值
      const parts = expression.split(' ');
      if (parts.length > 0) {
        parts[parts.length - 1] = display + '%';
        setExpression(parts.join(' '));
      }
    } else {
      // 单独使用百分号，简单地除以100
      const percentValue = currentValue / 100;
      const formattedValue = formatDisplayValue(percentValue);
      setDisplay(formattedValue);
      setCurrentNumber(formattedValue);
      
      // 在表达式中显示百分号
      if (expression === '' || expression === display) {
        setExpression(display + '%');
      } else {
        const parts = expression.split(' ');
        if (parts.length > 0) {
          parts[parts.length - 1] = display + '%';
          setExpression(parts.join(' '));
        }
      }
    }
  };

  // 处理退格键
  const handleBackspace = () => {
    // 如果刚完成计算，退格键清除结果，回到算式状态
    if (justCalculated) {
      const parts = expression.split(' = ');
      if (parts.length > 1) {
        // 回到计算前的算式
        const originalExpression = parts[0];
        setExpression(originalExpression);
        
        // 解析最后的数字作为显示值
        const tokens = originalExpression.split(' ');
        const lastToken = tokens[tokens.length - 1];
        if (!isNaN(parseFloat(lastToken))) {
          setDisplay(lastToken);
          setCurrentNumber(lastToken);
        }
        
        setJustCalculated(false);
        return;
      }
    }
    
    // 如果表达式为空，只删除当前数字
    if (expression === '') {
      if (display.length > 1) {
        const newDisplay = display.slice(0, -1);
        setDisplay(newDisplay);
        setCurrentNumber(newDisplay);
        setExpression(newDisplay);
      } else {
        setDisplay('0');
        setCurrentNumber('0');
        setExpression('');
      }
      return;
    }
    
    // 删除表达式中的最后一个字符/标记
    const parts = expression.split(' ');
    
    if (parts.length === 0) {
      setDisplay('0');
      setCurrentNumber('0');
      setExpression('');
      return;
    }
    
    const lastPart = parts[parts.length - 1];
    
    // 如果最后一部分是数字且当前正在输入数字
    if (!isNaN(parseFloat(lastPart)) && currentNumber !== '0') {
      if (lastPart.length > 1) {
        // 删除数字的最后一位
        const newNumber = lastPart.slice(0, -1);
        parts[parts.length - 1] = newNumber;
        setExpression(parts.join(' '));
        setDisplay(newNumber);
        setCurrentNumber(newNumber);
      } else {
        // 删除整个数字
        parts.pop();
        if (parts.length === 0) {
          setExpression('');
          setDisplay('0');
          setCurrentNumber('0');
          setPreviousValue(null);
          setOperation(null);
        } else {
          setExpression(parts.join(' '));
          // 如果删除后最后一个是运算符，等待新数字输入
          const newLastPart = parts[parts.length - 1];
          if (['+', '-', '×', '÷'].includes(newLastPart)) {
            setDisplay('0');
            setCurrentNumber('0');
          } else if (!isNaN(parseFloat(newLastPart))) {
            setDisplay(newLastPart);
            setCurrentNumber(newLastPart);
          }
        }
      }
    } else {
      // 删除最后一个元素（运算符、括号等）
      parts.pop();
      if (parts.length === 0) {
        setExpression('');
        setDisplay('0');
        setCurrentNumber('0');
        setPreviousValue(null);
        setOperation(null);
      } else {
        setExpression(parts.join(' '));
        // 设置显示为最后一个数字
        const newLastPart = parts[parts.length - 1];
        if (!isNaN(parseFloat(newLastPart))) {
          setDisplay(newLastPart);
          setCurrentNumber(newLastPart);
        } else {
          setDisplay('0');
          setCurrentNumber('0');
        }
      }
      
      // 处理括号状态
      if (lastPart === '(') {
        setOpenBrackets(Math.max(0, openBrackets - 1));
      } else if (lastPart === ')') {
        setOpenBrackets(openBrackets + 1);
      }
    }
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
    const fullExpression = expression;
    
    // 计算完整表达式
    const result = evaluateExpression(fullExpression);
    
    let formattedResult: string;
    if (isNaN(result) || !isFinite(result)) {
      formattedResult = 'Error';
    } else {
      formattedResult = formatDisplayValue(result);
    }
    
    // 添加到历史记录
    addToHistory(fullExpression, formattedResult);
    
    setDisplay(formattedResult);
    setExpression(fullExpression + ' = ' + formattedResult);
    setPreviousValue(null);
    setOperation(null);
    setCurrentNumber('0');
    setJustCalculated(true); // 标记刚完成计算
  };

  // 计算完整表达式的函数（用于处理优先级和括号）
  const evaluateExpression = (expr: string): number => {
    try {
      // 处理括号的递归函数
      const evaluateWithBrackets = (expression: string): number => {
        const tokens = expression.split(' ').filter(token => token !== '');
        const numbers: number[] = [];
        const operators: string[] = [];
        
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (token === '(') {
            // 找到对应的右括号
            let bracketCount = 1;
            let j = i + 1;
            while (j < tokens.length && bracketCount > 0) {
              if (tokens[j] === '(') bracketCount++;
              if (tokens[j] === ')') bracketCount--;
              j++;
            }
            
            // 递归计算括号内的表达式
            const bracketExpr = tokens.slice(i + 1, j - 1).join(' ');
            const bracketResult = evaluateWithBrackets(bracketExpr);
            if (isNaN(bracketResult)) return NaN;
            numbers.push(bracketResult);
            i = j - 1; // 跳过已处理的括号内容
          } else if (token === '+' || token === '-' || token === '×' || token === '÷') {
            operators.push(token);
          } else if (token === ')') {
            // 跳过右括号，不处理
            continue;
          } else {
            // 检查是否是百分数（以%结尾）
            if (token.endsWith('%')) {
              const percentValue = parseFloat(token.slice(0, -1));
              if (isNaN(percentValue)) return NaN;
              
              // 根据前面的运算符决定如何处理百分比
              if (operators.length > 0) {
                const lastOperator = operators[operators.length - 1];
                if (lastOperator === '+' || lastOperator === '-') {
                  // 对于加减法，百分比是基于前一个数字的
                  const baseValue = numbers[numbers.length - 1];
                  const percentResult = baseValue * (percentValue / 100);
                  numbers.push(percentResult);
                } else {
                  // 对于乘除法，直接转换为小数
                  numbers.push(percentValue / 100);
                }
              } else {
                // 没有运算符，直接转换为小数
                numbers.push(percentValue / 100);
              }
            } else {
              const num = parseFloat(token);
              if (isNaN(num)) return NaN;
              numbers.push(num);
            }
          }
        }
        
        // 检查数字和运算符的数量是否匹配
        if (numbers.length === 0) return 0;
        if (numbers.length !== operators.length + 1) return NaN;
        
        // 先处理乘除（优先级高）
        for (let i = 0; i < operators.length; i++) {
          if (operators[i] === '×' || operators[i] === '÷') {
            const result = calculate(numbers[i], numbers[i + 1], operators[i]);
            if (isNaN(result) || !isFinite(result)) return NaN;
            numbers[i] = result;
            numbers.splice(i + 1, 1);
            operators.splice(i, 1);
            i--;
          }
        }
        
        // 再处理加减（优先级低）
        let result = numbers[0];
        if (isNaN(result)) return NaN;
        
        for (let i = 0; i < operators.length; i++) {
          result = calculate(result, numbers[i + 1], operators[i]);
          if (isNaN(result) || !isFinite(result)) return NaN;
        }
        
        return result;
      };
      
      const result = evaluateWithBrackets(expr);
      return result;
    } catch (error) {
      return NaN;
    }
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
    const isMobile = viewportWidth < 768;
    
    // 响应式尺寸 - 主弹窗保持固定宽度，历史记录作为独立浮窗
    const popupWidth = isMobile 
      ? Math.min(viewportWidth - 20, 320) 
      : 320; // 桌面端固定宽度，不再根据历史记录状态调整
    const estimatedPopupHeight = isMobile 
      ? Math.min(400, viewportHeight - 80) // 移动端使用更合理的高度
      : 450; // 桌面端估算高度（用于位置计算）
    const margin = isMobile ? 10 : 10; // 边距

    let top, left;

    if (isMobile) {
      // 移动端：居中显示
      top = (viewportHeight - estimatedPopupHeight) / 2;
      left = (viewportWidth - popupWidth) / 2;
    } else {
      // 桌面端：优先显示在按钮上方，增加更多间距避免遮挡
      top = buttonRect.top - estimatedPopupHeight - margin - 50; // 增加50px额外间距
      left = buttonRect.left + (buttonRect.width / 2) - (popupWidth / 2);

      // 如果上方空间不够，显示在下方
      if (top < margin) {
        top = buttonRect.bottom + margin + 10; // 下方也增加10px间距
      }

      // 如果下方空间也不够，显示在安全位置
      if (top + estimatedPopupHeight > viewportHeight - margin) {
        top = Math.max(margin, viewportHeight - estimatedPopupHeight - margin);
      }
    }

    // 确保左右不超出边界
    if (left < margin) {
      left = margin;
    } else if (left + popupWidth > viewportWidth - margin) {
      left = viewportWidth - popupWidth - margin;
    }

    // 确保顶部不超出边界
    if (top < margin) {
      top = margin;
    }

    setPopupPosition({ top, left });
  };

  // 拖动相关函数
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!popupRef.current) return;
    
    // 检查点击的目标元素，如果是按钮或显示屏，则不开始拖动
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('.calc-display') || target.closest('.calc-buttons') || target.closest('.calc-history') || target.closest('button')) {
      return;
    }
    
    const rect = popupRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!popupRef.current) return;
    
    // 检查触摸的目标元素，如果是按钮或显示屏，则不开始拖动
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('.calc-display') || target.closest('.calc-buttons') || target.closest('.calc-history') || target.closest('button')) {
      return;
    }
    
    const touch = e.touches[0];
    const rect = popupRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !popupRef.current) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 768;
    const popupWidth = isMobile ? Math.min(viewportWidth - 20, 320) : 320;
    const popupHeight = popupRef.current.offsetHeight; // 使用实际高度
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
    setHasBeenDragged(true); // 标记已经拖动过
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !popupRef.current) return;
    
    e.preventDefault(); // 防止页面滚动
    const touch = e.touches[0];

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 768;
    const popupWidth = isMobile ? Math.min(viewportWidth - 20, 320) : 320;
    const popupHeight = popupRef.current.offsetHeight; // 使用实际高度
    const margin = 10;

    let newLeft = touch.clientX - dragOffset.x;
    let newTop = touch.clientY - dragOffset.y;

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
    setHasBeenDragged(true); // 标记已经拖动过
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // 监听鼠标和触摸移动和释放
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
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
      // 如果已经拖动过，保持当前位置；否则重新计算位置
      if (!hasBeenDragged) {
        // 延迟计算位置，确保弹窗已渲染
        setTimeout(calculatePopupPosition, 10);
      }
    }
    // 移除弹窗关闭时重置拖动标记的逻辑，让位置保持记忆
  }, [isOpen, hasBeenDragged]);

  // 计算历史记录面板位置，确保与计算器主体同高
  const updateHistoryPanelPosition = () => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 768;
    const isMobileCheck = viewportWidth < 768;
    
    if (isOpen && !isMobileCheck && isHistoryExpanded && calculatorBodyRef.current) {
      const calculatorBody = calculatorBodyRef.current;
      setHistoryPanelPosition({
        top: calculatorBody.offsetTop,
        left: calculatorBody.offsetLeft + calculatorBody.offsetWidth + 16,
        height: calculatorBody.offsetHeight
      });
    }
  };

  useEffect(() => {
    if (isOpen && isHistoryExpanded) {
      // 延迟执行以确保DOM完全渲染
      setTimeout(updateHistoryPanelPosition, 10);
    }
  }, [isOpen, isHistoryExpanded]);

  // 监听窗口大小变化，重新计算历史记录面板位置
  useEffect(() => {
    if (isOpen && isHistoryExpanded) {
      const handleResize = () => {
        updateHistoryPanelPosition();
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isOpen, isHistoryExpanded]);

  if (!isOpen) return null;

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 768;
  const isMobile = viewportWidth < 768;

  return (
    <div 
      ref={popupRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={`fixed z-50 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 ${isMobile ? 'p-3' : 'p-6'} ${
        isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
      }`}
      style={{
        top: `${popupPosition.top}px`,
        left: `${popupPosition.left}px`,
        transform: 'translateZ(0)', // 启用硬件加速
        userSelect: isDragging ? 'none' : 'auto',
        width: isMobile 
          ? `${Math.min(viewportWidth - 20, 320)}px` 
          : '320px', // 桌面端固定宽度
        height: 'auto', // 根据内容自动调整高度
        maxWidth: isMobile ? 'calc(100vw - 20px)' : 'none',
        maxHeight: isMobile ? 'calc(100vh - 40px)' : 'none'
      }}
    >
      {/* 弹窗头部 - 可拖动区域 */}
      <div 
        ref={headerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'} cursor-grab active:cursor-grabbing select-none touch-none`}
        style={{ userSelect: 'none' }}
      >
        <div className="flex items-center space-x-2">
          <Move className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <CalculatorIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">计算器</h3>
          {/* 在小屏幕上隐藏历史记录按钮 */}
          {!isMobile && (
            <button
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={isHistoryExpanded ? "隐藏历史记录" : "显示历史记录"}
            >
              <History className="h-4 w-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" />
            </button>
          )}
        </div>
        {/* 添加重置位置按钮 */}
        {hasBeenDragged && (
          <button
            onClick={() => {
              setHasBeenDragged(false);
              setTimeout(calculatePopupPosition, 10);
            }}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="重置位置"
          >
            <Move className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" />
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* 主要内容区域 - 计算器主体 */}
      <div className={`${isMobile ? 'h-auto' : 'h-fit'} relative`}>
        {/* 计算器部分 */}
        <div 
          ref={calculatorBodyRef}
          className={`${isMobile ? 'w-full' : 'w-full'} ${!isMobile ? 'h-fit' : ''}`}
        >
          {/* 显示屏 */}
          <div className={`calc-display mb-3 p-3 md:p-4 bg-gray-100 dark:bg-gray-800 rounded-lg ${isMobile ? 'h-20' : 'h-28'} flex flex-col justify-end`}>
            {/* 算式显示 */}
            <div className={`text-right ${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 dark:text-gray-400 ${isMobile ? 'mb-1' : 'mb-2'} font-mono ${isMobile ? 'overflow-hidden' : 'overflow-y-auto'} ${isMobile ? 'h-8' : 'max-h-16'} break-words ${isMobile ? 'leading-tight' : ''}`}>
              {expression || '\u00A0'}
            </div>
            {/* 当前数值显示 */}
            <div className={`text-right ${isMobile ? 'text-lg' : 'text-xl'} font-mono text-gray-900 dark:text-white overflow-hidden`}>
              {display}
            </div>
          </div>

          {/* 按钮网格 */}
          <div className={`calc-buttons grid grid-cols-4 ${isMobile ? 'gap-1' : 'gap-1.5'}`}>
            {/* 第一行：C和退格键 */}
            <div className="col-span-2"></div> {/* 左侧空占位 */}
            <button onClick={clear} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm`}>
              C
            </button>
            <button onClick={handleBackspace} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm`}>
              ←
            </button>

            {/* 第二行：(,),%,除号 */}
            <button onClick={handleOpenBracket} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm`}>
              (
            </button>
            <button onClick={handleCloseBracket} disabled={openBrackets === 0} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} rounded-lg transition-colors text-sm ${
              openBrackets === 0
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}>
              )
            </button>
            <button onClick={handlePercentage} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm`}>
              %
            </button>
            <button onClick={() => performOperation('÷')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm`}>
              ÷
            </button>

            {/* 第三行：789，乘号 */}
            <button onClick={() => inputDigit('7')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm`}>
              7
            </button>
            <button onClick={() => inputDigit('8')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm`}>
              8
            </button>
            <button onClick={() => inputDigit('9')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm`}>
              9
            </button>
            <button onClick={() => performOperation('×')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm`}>
              ×
            </button>

            {/* 第四行：456，减号 */}
            <button onClick={() => inputDigit('4')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm`}>
              4
            </button>
            <button onClick={() => inputDigit('5')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm`}>
              5
            </button>
            <button onClick={() => inputDigit('6')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm`}>
              6
            </button>
            <button onClick={() => performOperation('-')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm`}>
              -
            </button>

            {/* 第五行：123，加号 */}
            <button onClick={() => inputDigit('1')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm`}>
              1
            </button>
            <button onClick={() => inputDigit('2')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm`}>
              2
            </button>
            <button onClick={() => inputDigit('3')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm`}>
              3
            </button>
            <button onClick={() => performOperation('+')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm`}>
              +
            </button>

            {/* 第六行：0,.,正负号,等号 */}
            <button onClick={() => inputDigit('0')} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm`}>
              0
            </button>
            <button onClick={inputDecimal} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm`}>
              .
            </button>
            <button onClick={handlePlusMinus} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm`}>
              ±
            </button>
            <button onClick={calculateResult} className={`${isMobile ? 'py-2.5 px-2' : 'p-2.5'} bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm`}>
              =
            </button>
          </div>
        </div>

        {/* 右侧历史记录浮窗 - 只在桌面端显示，精确匹配计算器主体高度 */}
        {!isMobile && isHistoryExpanded && (
          <div 
            className="calc-history absolute w-52 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 flex flex-col"
            style={{
              top: `${historyPanelPosition.top}px`,
              left: `${historyPanelPosition.left}px`,
              height: `${historyPanelPosition.height}px`, // 精确匹配计算器主体高度
            }}
          >
            {/* 历史记录标题栏 */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">历史记录</h4>
              <div className="flex items-center space-x-2">
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-red-500 hover:text-red-600 transition-colors"
                  >
                    清空
                  </button>
                )}
                <button
                  onClick={() => setIsHistoryExpanded(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronUp className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* 历史记录内容区域 */}
            <div className="flex-1 p-2 overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-6">
                  暂无历史记录
                </div>
              ) : (
                <div className="space-y-1">
                  {history.map((item, index) => (
                    <div 
                      key={index} 
                      onClick={() => {
                        setDisplay(item.result);
                        setCurrentNumber(item.result);
                        setExpression(item.result);
                        setPreviousValue(null);
                        setOperation(null);
                        setJustCalculated(false);
                      }}
                      className="px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                      title="点击使用此结果"
                    >
                      {/* 算式和结果在同一行 */}
                      <div className="text-xs font-mono break-words leading-tight">
                        <span className="text-gray-500 dark:text-gray-400">{item.expression}</span>
                        <span className="text-gray-900 dark:text-white font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {' = '}{item.result}
                        </span>
                      </div>
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