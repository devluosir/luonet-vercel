'use client';

interface FullScreenSpinnerProps {
  label?: string;
}

export function FullScreenSpinner({ label = '加载中' }: FullScreenSpinnerProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black"
      role="status"
      aria-label={label}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
    </div>
  );
}
