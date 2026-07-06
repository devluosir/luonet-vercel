import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClassNames: Record<ButtonVariant, string> = {
  primary: [
    'bg-blue-600 text-white hover:bg-blue-700',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    'dark:focus:ring-offset-gray-800',
  ].join(' '),
  secondary: [
    'border border-gray-200 text-gray-700 hover:bg-gray-50',
    'dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
  ].join(' '),
  ghost: [
    'text-gray-600 hover:bg-gray-100',
    'dark:text-gray-300 dark:hover:bg-[#3A3A3C]',
  ].join(' '),
  soft: [
    'bg-blue-100 text-blue-600 hover:bg-blue-200',
    'dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40',
  ].join(' '),
};

const sizeClassNames: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClassNames[variant],
        sizeClassNames[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
