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
    <div className="flex items-center justify-between p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors min-h-[50px] sm:min-h-[60px]">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
        <span className="text-sm sm:text-base flex-shrink-0">{icon}</span>
        <span className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm truncate">{name}</span>
      </div>
      <button
        type="button"
        onClick={() => onToggle(moduleId)}
        className={`relative inline-flex h-4 w-7 sm:h-5 sm:w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 ${
          isEnabled 
            ? 'bg-blue-600' 
            : 'bg-gray-200 dark:bg-gray-700'
        }`}
        aria-label={`${isEnabled ? '关闭' : '开启'}${name}权限`}
      >
        <span className={`inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          isEnabled ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0.5 sm:translate-x-1'
        }`} />
      </button>
    </div>
  );
});
