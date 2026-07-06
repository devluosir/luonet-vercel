import type { HTMLAttributes, ReactNode } from 'react';

type PageCardPadding = 'none' | 'sm' | 'md' | 'lg';

interface PageCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: PageCardPadding;
}

const paddingClassNames: Record<PageCardPadding, string> = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 md:p-8',
  lg: 'p-4 sm:p-6 lg:p-8',
};

export function PageCard({
  children,
  className = '',
  padding = 'none',
  ...props
}: PageCardProps) {
  return (
    <div
      className={[
        'bg-white dark:bg-[#2C2C2E] rounded-2xl sm:rounded-3xl shadow-lg',
        paddingClassNames[padding],
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
