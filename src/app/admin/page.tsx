'use client';

import dynamic from 'next/dynamic';

const AdminPage = dynamic(
  () => import('@/features/admin').then(mod => ({ default: mod.AdminPage })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-gray-600 dark:text-gray-400">加载管理面板...</span>
        </div>
      </div>
    ),
  }
);

export default function AdminPageWrapper() {
  return <AdminPage />;
}
