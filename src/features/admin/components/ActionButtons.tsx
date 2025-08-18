import { memo } from 'react';
import { Save } from 'lucide-react';

interface ActionButtonsProps {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  hasChanges: boolean;
}

export const ActionButtons = memo(function ActionButtons({
  onSave,
  onCancel,
  saving,
  hasChanges
}: ActionButtonsProps) {
  return (
    <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onCancel}
        disabled={saving}
        className="px-2.5 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                 bg-gray-100 dark:bg-gray-800 rounded-lg
                 hover:bg-gray-200 dark:hover:bg-gray-700 
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors"
      >
        取消
      </button>
      <button
        onClick={onSave}
        disabled={saving || !hasChanges}
        className="px-2.5 sm:px-4 py-2 text-sm font-medium text-white 
                 bg-blue-600 hover:bg-blue-700 rounded-lg
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors flex items-center space-x-2"
      >
        {saving ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>保存中...</span>
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            <span>保存</span>
          </>
        )}
      </button>
    </div>
  );
});
