import { forwardRef } from 'react';
import { PLACEHOLDERS } from '../utils/constants';

interface TextAreaFieldProps {
  label?: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ 
    label, 
    placeholder, 
    required = false, 
    value, 
    onChange, 
    className = '',
    rows = 8,
    disabled = false
  }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            {required && <span className="text-red-500 dark:text-red-400 mr-1">*</span>}
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={`w-full p-4 pb-16 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all resize-none text-sm text-gray-900 dark:text-gray-100 font-['.SFNSText-Regular', 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', 'Arial', sans-serif] placeholder:text-gray-400/80 dark:placeholder:text-gray-500/80 disabled:opacity-50 shadow-sm hover:shadow-xl focus:shadow-2xl backdrop-blur-sm ${className}`}
        />
      </div>
    );
  }
);

TextAreaField.displayName = 'TextAreaField';
