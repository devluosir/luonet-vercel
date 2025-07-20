"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { ArrowLeft, Calendar, Clock, CalendarDays } from 'lucide-react';
import './styles.css';

// 定义节假日数组（示例数据，实际使用时可以从API获取）
const HOLIDAYS = [
  '2024-01-01', // 元旦
  '2024-02-10', // 春节
  '2024-04-04', // 清明节
  '2024-05-01', // 劳动节
  '2024-06-10', // 端午节
  '2024-09-15', // 中秋节
  '2024-10-01', // 国庆节
];

export default function DateTools() {
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

  // 日期格式化状态
  const [formatDate, setFormatDate] = useState('');
  const [formattedResult, setFormattedResult] = useState<string | null>(null);

  // 添加一个格式化日期的函数
  const formatDateString = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 添加一个新的函数来格式化显示的日期
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  };

  // 计算工作日
  const calculateWorkDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workDays = 0;
    let current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateString = formatDateString(current.toISOString());
      
      // 排除周末和节假日
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS.includes(dateString)) {
        workDays++;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return workDays;
  };

  // 计算工作日后的日期
  const calculateWorkDate = (baseDate: string, workDays: number) => {
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
  };

  // 日期差值计算的效果
  useEffect(() => {
    if (date1 && date2) {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDiffDays(diffDays);
      
      // 计算工作日
      const workDays = calculateWorkDays(date1, date2);
      setWorkDays(workDays);
    } else {
      setDiffDays(null);
      setWorkDays(null);
    }
  }, [date1, date2]);

  // 修改日期推算的效果
  useEffect(() => {
    if (baseDate && days !== '') {
      try {
        const date = new Date(baseDate);
        const daysNum = parseInt(days) || 0;
        const utcDate = new Date(Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate() + daysNum
        ));
        const resultDateStr = utcDate.toISOString().split('T')[0];
        setResultDate(resultDateStr);
        
        // 计算工作日后的日期
        const workDate = calculateWorkDate(baseDate, daysNum);
        setResultWorkDate(workDate);
      } catch (error) {
        console.error('Date calculation error:', error);
        setResultDate(null);
        setResultWorkDate(null);
      }
    } else {
      setResultDate(null);
      setResultWorkDate(null);
    }
  }, [baseDate, days]);

  // 日期格式化效果
  useEffect(() => {
    if (formatDate) {
      try {
        const date = new Date(formatDate);
        const formatted = formatDisplayDate(formatDate);
        setFormattedResult(formatted);
      } catch (error) {
        console.error('Date formatting error:', error);
        setFormattedResult(null);
      }
    } else {
      setFormattedResult(null);
    }
  }, [formatDate]);

  // 修改按钮点击处理函数
  const handleDaysChange = (change: number) => {
    setDays(prev => {
      const currentDays = prev === '' ? 0 : parseInt(prev);
      return (currentDays + change).toString();
    });
  };

  // 快捷选择日期
  const quickSelectDate = (type: 'today' | 'tomorrow' | 'nextWeek' | 'nextMonth') => {
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
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50/90 via-white/60 to-gray-100/90 
                    dark:from-gray-900 dark:via-gray-800/80 dark:to-gray-900/90">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="max-w-full mx-auto">
          {/* 返回按钮优化 */}
          <div className="flex items-center mb-8 sm:mb-12">
            <Link 
              href="/dashboard" 
              className="group inline-flex items-center px-4 py-2 rounded-full 
                        bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg 
                        border border-gray-200/50 dark:border-gray-700/50 
                        text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 
                        transition-all hover:shadow-lg hover:scale-[1.02]"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
              <span className="text-sm font-medium">返回</span>
            </Link>
          </div>

          {/* 网格布局优化 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* 日期推算部分 */}
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl p-6 sm:p-8 
                          rounded-[2rem] shadow-xl 
                          border border-gray-200/50 dark:border-gray-700/50 
                          h-fit hover:shadow-2xl transition-all duration-500">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                日期推算
              </h2>
              <div className="space-y-4">
                {/* 快捷选择日期 */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setBaseDate(quickSelectDate('today'))}
                    className="px-2 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 
                             hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    今天
                  </button>
                  <button
                    onClick={() => setBaseDate(quickSelectDate('tomorrow'))}
                    className="px-2 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 
                             hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    明天
                  </button>
                  <button
                    onClick={() => setBaseDate(quickSelectDate('nextWeek'))}
                    className="px-2 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 
                             hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    下周
                  </button>
                  <button
                    onClick={() => setBaseDate(quickSelectDate('nextMonth'))}
                    className="px-2 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 
                             hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    下月
                  </button>
                </div>

                <div className="flex flex-row items-center gap-3 sm:gap-4">
                  <div className="date-input-wrapper flex-1 min-w-0 relative">
                    <input
                      id="baseDate"
                      type="date"
                      value={baseDate}
                      onChange={e => setBaseDate(e.target.value)}
                      className="custom-date-input w-full p-3 rounded-2xl border border-gray-200 dark:border-gray-700
                        bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm text-gray-900 dark:text-white
                        text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all
                        hover:border-blue-500/50 appearance-none text-base h-12"
                      placeholder="请选择日期"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </span>
                  </div>

                  <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <span className="text-gray-600 dark:text-gray-300 text-lg font-medium select-none">+</span>
                  </div>

                  <div className="relative flex-1">
                    <div className="relative">
                      <label htmlFor="daysInput" className="sr-only">间隔天数</label>
                      <input
                        id="daysInput"
                        type="number"
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        aria-label="间隔天数"
                        min="-365"
                        max="365"
                        className="w-full p-3 rounded-2xl border border-gray-200 dark:border-gray-700 
                          bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm text-gray-900 dark:text-white 
                          focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all 
                          hover:border-blue-500/50 text-center text-base h-12 pl-12 pr-8"
                      />
                      <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-blue-500/70 transition-colors" />
                      {!days && (
                        <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 text-gray-400 text-center pointer-events-none">
                          间隔天数
                        </span>
                      )}
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        天
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl p-6 
                              backdrop-blur-sm 
                              border border-gray-200/30 dark:border-gray-700/30">
                  <div className="relative px-4">
                    <label htmlFor="daysRange" className="sr-only">天数范围选择</label>
                    <input
                      id="daysRange"
                      type="range"
                      min="-365"
                      max="365"
                      step="1"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      aria-label="天数范围选择"
                      className="range-input"
                    />
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2 sm:gap-2 text-center mt-4">
                    {/* 负值组 */}
                    <button
                      onClick={() => handleDaysChange(-30)}
                      className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg
                        bg-white/80 dark:bg-gray-800/80
                        border border-red-200 dark:border-red-900/50
                        hover:bg-red-50 dark:hover:bg-red-900/20
                        active:bg-red-100 dark:active:bg-red-900/30
                        text-red-600 dark:text-red-400
                        transition-all duration-200
                        shadow-sm hover:shadow"
                    >
                      -1M
                    </button>
                    <button
                      onClick={() => handleDaysChange(-7)}
                      className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg
                        bg-white/80 dark:bg-gray-800/80
                        border border-red-200 dark:border-red-900/50
                        hover:bg-red-50 dark:hover:bg-red-900/20
                        active:bg-red-100 dark:active:bg-red-900/30
                        text-red-600 dark:text-red-400
                        transition-all duration-200
                        shadow-sm hover:shadow"
                    >
                      -1W
                    </button>
                    <button
                      onClick={() => handleDaysChange(-1)}
                      className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg
                        bg-white/80 dark:bg-gray-800/80
                        border border-red-200 dark:border-red-900/50
                        hover:bg-red-50 dark:hover:bg-red-900/20
                        active:bg-red-100 dark:active:bg-red-900/30
                        text-red-600 dark:text-red-400
                        transition-all duration-200
                        shadow-sm hover:shadow"
                    >
                      -1D
                    </button>
                    
                    {/* 零值 */}
                    <button
                      onClick={() => setDays('0')}
                      className="px-1 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg
                        bg-gray-100 dark:bg-gray-800
                        border border-gray-200 dark:border-gray-700
                        hover:bg-gray-200 dark:hover:bg-gray-700
                        active:bg-gray-300 dark:active:bg-gray-600
                        text-gray-700 dark:text-gray-300
                        font-medium
                        transition-all duration-200
                        shadow-sm hover:shadow-md"
                    >
                      0
                    </button>
                    
                    {/* 正值组 */}
                    <button
                      onClick={() => handleDaysChange(1)}
                      className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg
                        bg-white/80 dark:bg-gray-800/80
                        border border-green-200 dark:border-green-900/50
                        hover:bg-green-50 dark:hover:bg-green-900/20
                        active:bg-green-100 dark:active:bg-green-900/30
                        text-green-600 dark:text-green-400
                        transition-all duration-200
                        shadow-sm hover:shadow"
                    >
                      +1D
                    </button>
                    <button
                      onClick={() => handleDaysChange(7)}
                      className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg
                        bg-white/80 dark:bg-gray-800/80
                        border border-green-200 dark:border-green-900/50
                        hover:bg-green-50 dark:hover:bg-green-900/20
                        active:bg-green-100 dark:active:bg-green-900/30
                        text-green-600 dark:text-green-400
                        transition-all duration-200
                        shadow-sm hover:shadow"
                    >
                      +1W
                    </button>
                    <button
                      onClick={() => handleDaysChange(30)}
                      className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg
                        bg-white/80 dark:bg-gray-800/80
                        border border-green-200 dark:border-green-900/50
                        hover:bg-green-50 dark:hover:bg-green-900/20
                        active:bg-green-100 dark:active:bg-green-900/30
                        text-green-600 dark:text-green-400
                        transition-all duration-200
                        shadow-sm hover:shadow"
                    >
                      +1M
                    </button>
                  </div>
                </div>
              </div>

              {resultDate && (
                <div className="mt-4 space-y-2">
                  <div className="p-4 rounded-xl sm:rounded-2xl 
                                bg-blue-50/50 dark:bg-blue-900/20 
                                backdrop-blur-sm 
                                border border-blue-100 dark:border-blue-800/50">
                    <p className="text-center text-lg sm:text-xl font-medium text-gray-900 dark:text-white">
                      {Math.abs(parseInt(days))}天
                      <span className={parseInt(days) >= 0 ? 
                        "text-green-500 dark:text-green-400" : 
                        "text-red-500 dark:text-red-400"
                      }>
                        {parseInt(days) >= 0 ? '后' : '前'}
                      </span>
                      是: 
                      <span className="text-blue-600 dark:text-blue-400 font-semibold ml-2">
                        {formatDisplayDate(resultDate)}
                      </span>
                    </p>
                  </div>
                  
                  {resultWorkDate && resultWorkDate !== resultDate && (
                    <div className="p-4 rounded-xl sm:rounded-2xl 
                                  bg-green-50/50 dark:bg-green-900/20 
                                  backdrop-blur-sm 
                                  border border-green-100 dark:border-green-800/50">
                      <p className="text-center text-lg sm:text-xl font-medium text-gray-900 dark:text-white">
                        {Math.abs(parseInt(days))}个工作日
                        <span className={parseInt(days) >= 0 ? 
                          "text-green-500 dark:text-green-400" : 
                          "text-red-500 dark:text-red-400"
                        }>
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

            {/* 日期差值计算部分 */}
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl p-6 sm:p-8 
                          rounded-[2rem] shadow-xl 
                          border border-gray-200/50 dark:border-gray-700/50 
                          h-fit hover:shadow-2xl transition-all duration-500">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                计算日期差值
              </h2>
              <div className="space-y-4">
                <div className="flex flex-row items-center gap-3 sm:gap-4">
                  <div className="date-input-wrapper flex-1 min-w-0 relative">
                    <input
                      id="date1"
                      type="date"
                      value={date1}
                      onChange={e => setDate1(e.target.value)}
                      className="custom-date-input w-full p-3 rounded-2xl border border-gray-200 dark:border-gray-700
                        bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm text-gray-900 dark:text-white
                        text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all
                        hover:border-blue-500/50 appearance-none text-base h-12"
                      placeholder="请选择日期"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </span>
                  </div>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors mx-2">
                    <span className="text-gray-600 dark:text-gray-300 text-lg font-medium select-none">-</span>
                  </div>
                  <div className="date-input-wrapper flex-1 min-w-0 relative">
                    <input
                      id="date2"
                      type="date"
                      value={date2}
                      onChange={e => setDate2(e.target.value)}
                      className="custom-date-input w-full p-3 rounded-2xl border border-gray-200 dark:border-gray-700
                        bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm text-gray-900 dark:text-white
                        text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all
                        hover:border-blue-500/50 appearance-none text-base h-12"
                      placeholder="请选择日期"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </span>
                  </div>
                </div>

                {diffDays !== null && (
                  <div className="space-y-2">
                    <div className="p-4 rounded-xl sm:rounded-2xl 
                                  bg-gradient-to-r from-blue-50/90 to-blue-50/50 
                                  dark:from-blue-900/30 dark:to-blue-900/10 
                                  backdrop-blur-xl 
                                  border border-blue-100/80 dark:border-blue-800/30">
                      <p className="text-center text-lg sm:text-xl font-medium text-gray-900 dark:text-white">
                        计算结果：相差
                        <span className="text-blue-600 dark:text-blue-400 font-semibold mx-2">
                          {diffDays}
                        </span>
                        天
                      </p>
                    </div>
                    
                    {workDays !== null && workDays !== diffDays && (
                      <div className="p-4 rounded-xl sm:rounded-2xl 
                                    bg-gradient-to-r from-green-50/90 to-green-50/50 
                                    dark:from-green-900/30 dark:to-green-900/10 
                                    backdrop-blur-xl 
                                    border border-green-100/80 dark:border-green-800/30">
                        <p className="text-center text-lg sm:text-xl font-medium text-gray-900 dark:text-white">
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
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
