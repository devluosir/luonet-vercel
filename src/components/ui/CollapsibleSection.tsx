import type { CSSProperties, ReactNode } from 'react';

interface CollapsibleSectionProps {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function CollapsibleSection({
  isOpen,
  children,
  className = '',
  contentClassName = '',
}: CollapsibleSectionProps) {
  const style: CSSProperties = {
    display: 'grid',
    gridTemplateRows: isOpen ? '1fr' : '0fr',
    opacity: isOpen ? 1 : 0,
    transition: 'grid-template-rows 300ms ease-out, opacity 200ms ease-out',
  };

  return (
    <div
      className={className}
      style={style}
      aria-hidden={!isOpen}
      inert={!isOpen ? true : undefined}
    >
      <div className="min-h-0 overflow-hidden">
        <div className={contentClassName}>
          {children}
        </div>
      </div>
    </div>
  );
}
