import { memo } from 'react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage = memo(function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;
  
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm">
      {message}
    </div>
  );
});
