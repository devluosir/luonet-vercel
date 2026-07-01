import { memo } from 'react';

interface PermissionToggleProps {
  moduleId: string;
  name: string;
  icon: string;
  isEnabled: boolean;
  onToggle: (moduleId: string) => void;
  disabled?: boolean;
}

export const PermissionToggle = memo(function PermissionToggle({
  moduleId,
  name,
  icon,
  isEnabled,
  onToggle,
  disabled = false
}: PermissionToggleProps) {
  return (
    <div className="flex min-h-[44px] items-center justify-between rounded-lg border border-gray-200 p-2 transition-colors hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 pr-1">
        <span className="flex-shrink-0 text-sm">{icon}</span>
        <span className="truncate text-xs font-medium text-gray-900 dark:text-white">{name}</span>
      </div>
      <button
        type="button"
        onClick={() => onToggle(moduleId)}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 disabled:opacity-50 ${
          isEnabled 
            ? 'bg-blue-600' 
            : 'bg-gray-200 dark:bg-gray-700'
        }`}
        aria-label={`${isEnabled ? '关闭' : '开启'}${name}权限`}
      >
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          isEnabled ? 'translate-x-5' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
});
