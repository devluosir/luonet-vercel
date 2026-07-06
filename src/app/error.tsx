'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
          出错了
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {error.message || '发生了一个错误，请稍后重试。'}
        </p>
        <Button
          onClick={reset}
          fullWidth
        >
          重试
        </Button>
      </div>
    </div>
  );
} 
