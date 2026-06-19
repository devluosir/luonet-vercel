'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppLayout } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';

export default function UserDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const { user, handleLogout } = useAppUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <div className="text-lg text-gray-600 dark:text-gray-400">加载用户信息...</div>
        </div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) return null;

  return (
    <AppLayout
      breadcrumbs={[
        { label: '首页', path: '/dashboard' },
        { label: '管理后台', path: '/admin' },
        { label: '用户详情' },
      ]}
      user={user}
      onLogout={handleLogout}
    >
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1c1c1e]">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">用户详情</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-400">用户ID: {params?.id}</p>
            <p className="mt-2 text-gray-600 dark:text-gray-400">此页面正在开发中...</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
