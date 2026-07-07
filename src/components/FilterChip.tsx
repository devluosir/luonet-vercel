'use client';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  activeColor?: string;
  badge?: number;
  badgeColor?: string;
  badgeAlwaysVisible?: boolean;
}

export function FilterChip({
  label,
  active,
  onClick,
  activeColor = 'bg-blue-600 text-white',
  badge,
  badgeColor = 'bg-blue-600',
  badgeAlwaysVisible = false,
}: FilterChipProps) {
  const showBadge = badge !== undefined && (active || badgeAlwaysVisible);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
        active
          ? activeColor
          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      {label}
      {showBadge && (
        <span
          className={`absolute -right-1.5 -top-1.5 min-w-4 rounded-full px-1 text-[10px] font-semibold leading-4 text-white ${
            active ? badgeColor : 'bg-gray-400 dark:bg-gray-600'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
