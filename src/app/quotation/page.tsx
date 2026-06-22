'use client';

import dynamic from 'next/dynamic';

const QuotationPage = dynamic(
  () => import('@/features/quotation/app/QuotationPage'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-gray-600 dark:text-gray-400">加载中...</span>
        </div>
      </div>
    ),
  }
);

export default function QuotationPageWrapper() {
  return <QuotationPage />;
}
