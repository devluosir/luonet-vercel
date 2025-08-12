import { forwardRef } from 'react';
import type { LanguageOption, MailTypeOption } from '../types';

interface SelectFieldProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: LanguageOption[] | MailTypeOption[];
  className?: string;
  disabled?: boolean;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ 
    label, 
    value, 
    onChange, 
    options, 
    className = '',
    disabled = false
  }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm text-gray-600 dark:text-gray-400">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            value={value}
            onChange={onChange}
            disabled={disabled}
                                    className={`w-full px-3 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all text-sm font-medium text-gray-900 dark:text-gray-100 appearance-none disabled:opacity-50 shadow-sm ${className}`}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {'emoji' in option ? `${option.emoji} ${option.label}` : option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';
