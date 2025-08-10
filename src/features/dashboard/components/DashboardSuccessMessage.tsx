import React, { useEffect } from 'react';

interface DashboardSuccessMessageProps {
  show: boolean;
  message: string;
  onClose: () => void;
  autoHideDelay?: number;
}

export const DashboardSuccessMessage: React.FC<DashboardSuccessMessageProps> = ({
  show,
  message,
  onClose,
  autoHideDelay = 3000
}) => {
  // 自动隐藏消息
  useEffect(() => {
    if (show && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [show, autoHideDelay, onClose]);

  if (!show || !message) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-blue-800 dark:text-blue-200 text-sm font-medium">
          {message}
        </span>
        <button
          onClick={onClose}
          className="ml-auto text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
