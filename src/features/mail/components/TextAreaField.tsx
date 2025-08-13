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
          <label className="flex items-center text-sm text-gray-600 dark:text-gray-400 font-medium">
            {required && <span className="text-red-500 dark:text-red-400 mr-1">*</span>}
            {label}
          </label>
        )}
        <div className="mail-textarea-field">
          <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className={`w-full p-4 resize-none text-sm disabled:opacity-50 ${className}`}
          />
        </div>
      </div>
    );
  }
);

TextAreaField.displayName = 'TextAreaField';
