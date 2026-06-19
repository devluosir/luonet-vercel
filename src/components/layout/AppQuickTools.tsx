'use client';

import { useRef, useState } from 'react';
import { Calculator as CalculatorIcon, CalendarDays } from 'lucide-react';
import { Calculator } from '@/components/Calculator';
import { DateCalculator } from '@/components/DateCalculator';

export function AppQuickTools() {
  const [showCalculator, setShowCalculator] = useState(false);
  const [showDateCalculator, setShowDateCalculator] = useState(false);
  const calculatorRef = useRef<HTMLButtonElement>(null);
  const dateCalculatorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          ref={calculatorRef}
          type="button"
          onClick={() => setShowCalculator(true)}
          className="rounded-lg p-2 text-blue-600 transition-all duration-200 ease-in-out
                     hover:bg-blue-50 hover:scale-105 active:scale-95
                     dark:text-blue-400 dark:hover:bg-blue-900/30"
          aria-label="打开计算器"
          title="计算器"
        >
          <CalculatorIcon className="h-4 w-4" />
        </button>
        <button
          ref={dateCalculatorRef}
          type="button"
          onClick={() => setShowDateCalculator(true)}
          className="rounded-lg p-2 text-green-600 transition-all duration-200 ease-in-out
                     hover:bg-green-50 hover:scale-105 active:scale-95
                     dark:text-green-400 dark:hover:bg-green-900/30"
          aria-label="打开日期计算器"
          title="日期计算器"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>

      <Calculator
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        triggerRef={calculatorRef}
      />
      <DateCalculator
        isOpen={showDateCalculator}
        onClose={() => setShowDateCalculator(false)}
        triggerRef={dateCalculatorRef}
      />
    </>
  );
}
