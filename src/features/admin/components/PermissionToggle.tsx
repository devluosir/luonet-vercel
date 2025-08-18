import { memo } from 'react';

interface PermissionToggleProps {
  moduleId: string;
  name: string;
  icon: string;
  isEnabled: boolean;
  onToggle: (moduleId: string) => void;
}

export const PermissionToggle = memo(function PermissionToggle({
  moduleId,
  name,
  icon,
  isEnabled,
  onToggle
}: PermissionToggleProps) {
  return (
    <div className="flex items-center justify-between p-2.5 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors min-h-[55px] sm:min-h-[60px]">
      <div className="flex items-center gap-2 sm:gap-2 min-w-0 flex-1 pr-2">
        <span className="text-sm sm:text-base flex-shrink-0">{icon}</span>
        <span className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm truncate">{name}</span>
      </div>
      <button
        type="button"
        onClick={() => onToggle(moduleId)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 ${
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
