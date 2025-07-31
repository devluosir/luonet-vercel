'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Calendar, CalendarDays, X } from 'lucide-react';

interface DateCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

// 定义节假日数组
const HOLIDAYS = [
  '2026-01-01', // 元旦
  '2026-02-17', // 春节
  '2026-04-05', // 清明节
  '2026-05-01', // 劳动节
  '2026-06-19', // 端午节
  '2025-10-06', // 中秋节
  '2025-10-01', // 国庆节
];

export function DateCalculator({ isOpen, onClose, triggerRef }: DateCalculatorProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // 日期差值计算的状态
  const [date1, setDate1] = useState('');
  const [date2, setDate2] = useState('');
  const [diffDays, setDiffDays] = useState<number | null>(null);
  const [workDays, setWorkDays] = useState<number | null>(null);

  // 日期推算的状态
  const [baseDate, setBaseDate] = useState('');
  const [days, setDays] = useState('');
  const [resultDate, setResultDate] = useState<string | null>(null);
  const [resultWorkDate, setResultWorkDate] = useState<string | null>(null);

  // 当前活动标签页
  const [activeTab, setActiveTab] = useState<'diff' | 'calculate'>('calculate');

  // 格式化日期函数
  const formatDateString = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  };

  // 计算工作日
  const calculateWorkDays = useCallback((startDate: string, endDate: string) => {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workDays = 0;
    let current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateString = formatDateString(current.toISOString());
      
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS.includes(dateString)) {
        workDays++;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return workDays;
  }, []);

  const calculateWorkDate = useCallback((baseDate: string, workDays: number) => {
    if (!baseDate || workDays === 0) return null;
    
    const date = new Date(baseDate);
    let remainingDays = workDays;
    let current = new Date(date);

    while (remainingDays > 0) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay();
      const dateString = formatDateString(current.toISOString());
      
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS.includes(dateString)) {
        remainingDays--;
      }
    }
    
    return formatDateString(current.toISOString());
  }, []);

  // 日期差值计算
  const dateDiffResult = useMemo(() => {
    if (!date1 || !date2) {
      return { diffDays: null, workDays: null };
    }
    
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const workDays = calculateWorkDays(date1, date2);
    
    return { diffDays, workDays };
  }, [date1, date2, calculateWorkDays]);

  useEffect(() => {
    setDiffDays(dateDiffResult.diffDays);
    setWorkDays(dateDiffResult.workDays);
  }, [dateDiffResult]);

  // 日期推算
  const dateCalculationResult = useMemo(() => {
    if (!baseDate || days === '') {
      return { resultDate: null, resultWorkDate: null };
    }
    
    try {
      const date = new Date(baseDate);
      const daysNum = parseInt(days) || 0;
      const utcDate = new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + daysNum
      ));
      const resultDateStr = utcDate.toISOString().split('T')[0];
      const workDate = calculateWorkDate(baseDate, daysNum);
      
      return { resultDate: resultDateStr, resultWorkDate: workDate };
    } catch (error) {
      console.error('Date calculation error:', error);
      return { resultDate: null, resultWorkDate: null };
    }
  }, [baseDate, days, calculateWorkDate]);

  useEffect(() => {
    setResultDate(dateCalculationResult.resultDate);
    setResultWorkDate(dateCalculationResult.resultWorkDate);
  }, [dateCalculationResult]);

  // 快捷选择日期
  const quickSelectDate = useCallback((type: 'today' | 'tomorrow' | 'nextWeek' | 'nextMonth') => {
    const today = new Date();
    let targetDate = new Date(today);

    switch (type) {
      case 'today':
        break;
      case 'tomorrow':
        targetDate.setDate(today.getDate() + 1);
        break;
      case 'nextWeek':
        targetDate.setDate(today.getDate() + 7);
        break;
      case 'nextMonth':
        targetDate.setMonth(today.getMonth() + 1);
        break;
    }

    return formatDateString(targetDate.toISOString());
  }, []);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-h-[90vh] overflow-hidden"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">日期计算工具</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('calculate')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'calculate'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            日期推算
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'diff'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            日期差值
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'calculate' ? (
            <div className="space-y-4">
              {/* 快捷选择 */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '今天', type: 'today' as const },
                  { label: '明天', type: 'tomorrow' as const },
                  { label: '下周', type: 'nextWeek' as const },
                  { label: '下月', type: 'nextMonth' as const }
                ].map(({ label, type }) => (
                  <button
                    key={type}
                    onClick={() => setBaseDate(quickSelectDate(type))}
                    className="px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 日期输入 */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="date"
                    value={baseDate}
                    onChange={e => setBaseDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <span className="text-gray-600 dark:text-gray-300">+</span>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={days}
                    onChange={e => setDays(e.target.value)}
                    placeholder="天数"
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* 快捷按钮 */}
              <div className="grid grid-cols-7 gap-2 text-center">
                {[
                  { label: '-1M', value: -30, color: 'red' },
                  { label: '-1W', value: -7, color: 'red' },
                  { label: '-1D', value: -1, color: 'red' },
                  { label: '0', value: 0, color: 'gray' },
                  { label: '+1D', value: 1, color: 'green' },
                  { label: '+1W', value: 7, color: 'green' },
                  { label: '+1M', value: 30, color: 'green' }
                ].map(({ label, value, color }) => (
                  <button
                    key={label}
                    onClick={() => {
                      if (label === '0') {
                        setDays('0');
                      } else {
                        const currentValue = parseInt(days) || 0;
                        setDays((currentValue + value).toString());
                      }
                    }}
                    className={`px-2 py-1.5 text-sm rounded-lg transition-all ${
                      color === 'red' 
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                        : color === 'green'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 结果显示 */}
              {resultDate && (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                    <p className="text-center text-gray-900 dark:text-gray-100">
                      {Math.abs(parseInt(days))}天
                      <span className={parseInt(days) >= 0 ? "text-green-500" : "text-red-500"}>
                        {parseInt(days) >= 0 ? '后' : '前'}
                      </span>
                      是: 
                      <span className="text-blue-600 dark:text-blue-400 font-semibold ml-2">
                        {formatDisplayDate(resultDate)}
                      </span>
                    </p>
                  </div>
                  
                  {resultWorkDate && resultWorkDate !== resultDate && (
                    <div className="p-3 rounded-xl bg-green-50/50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50">
                      <p className="text-center text-gray-900 dark:text-gray-100">
                        {Math.abs(parseInt(days))}个工作日
                        <span className={parseInt(days) >= 0 ? "text-green-500" : "text-red-500"}>
                          {parseInt(days) >= 0 ? '后' : '前'}
                        </span>
                        是: 
                        <span className="text-green-600 dark:text-green-400 font-semibold ml-2">
                          {formatDisplayDate(resultWorkDate)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 日期输入 */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="date"
                    value={date1}
                    onChange={e => setDate1(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <span className="text-gray-600 dark:text-gray-300">-</span>
                <div className="flex-1 relative">
                  <input
                    type="date"
                    value={date2}
                    onChange={e => setDate2(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* 结果显示 */}
              {diffDays !== null && (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                    <p className="text-center text-gray-900 dark:text-gray-100">
                      计算结果：相差
                      <span className="text-blue-600 dark:text-blue-400 font-semibold mx-2">
                        {diffDays}
                      </span>
                      天
                    </p>
                  </div>
                  
                  {workDays !== null && workDays !== diffDays && (
                    <div className="p-3 rounded-xl bg-green-50/50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50">
                      <p className="text-center text-gray-900 dark:text-gray-100">
                        工作日：相差
                        <span className="text-green-600 dark:text-green-400 font-semibold mx-2">
                          {workDays}
                        </span>
                        天
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}