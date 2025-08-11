'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 简单的加载逻辑
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-600 dark:text-gray-400">加载用户信息...</div>
        </div>
      </div>
    );
  }

  // 权限不足时直接返回null
  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 
                       bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
                       hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              返回
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">用户详情</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-400">
              用户ID: {params?.id}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              此页面正在开发中...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 