'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ActionButton {
  key: string;
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  icon?: LucideIcon;
}

interface AppBottomActionBarProps {
  actions: ActionButton[];
  leftSlot?: ReactNode;
}

const variantClassName: Record<ActionButton['variant'], string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600',
  secondary:
    'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
  ghost: 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200',
};

export function AppBottomActionBar({ actions, leftSlot }: AppBottomActionBarProps) {
  if (actions.length === 0 && !leftSlot) return null;

  return (
    <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white pb-12 dark:border-gray-700 dark:bg-app-dark-base md:pb-0">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
        <div className="min-w-0 flex-1 text-sm text-gray-500 dark:text-gray-400">{leftSlot}</div>
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto">
          {actions.map((action) => {
            const Icon = action.icon;
            const label = action.loading && action.loadingLabel ? action.loadingLabel : action.label;

            return (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={`inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClassName[action.variant]}`}
              >
                {Icon && <Icon className={`h-4 w-4 ${action.loading ? 'animate-pulse' : ''}`} />}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
