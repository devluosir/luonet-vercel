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
          <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {label}
          </label>
        )}
        <div className="mail-select-field relative">
          <select
            ref={ref}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-50 ${className}`}
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
