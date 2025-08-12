import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface BaseFormSectionProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  required?: boolean;
  error?: string;
}

export function BaseFormSection({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className = '',
  required = false,
  error,
}: BaseFormSectionProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const handleToggle = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 区块标题 */}
      <div
        className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${
          collapsible ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
        }`}
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
            {required && (
              <span className="text-red-500 text-sm">*</span>
            )}
          </div>
          {collapsible && (
            <div className="flex items-center">
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          )}
        </div>
        
        {/* 错误提示 */}
        {error && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* 区块内容 */}
      {!isCollapsed && (
        <div className="px-6 py-4">
          {children}
        </div>
      )}
    </div>
  );
}

// 表单字段组件
interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
}

export function FormField({
  label,
  children,
  required = false,
  error,
  helpText,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {children}
      
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}
    </div>
  );
}

// 表单行组件
interface FormRowProps {
  children: React.ReactNode;
  className?: string;
}

export function FormRow({ children, className = '' }: FormRowProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {children}
    </div>
  );
}
