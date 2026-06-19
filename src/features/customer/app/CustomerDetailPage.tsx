'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
import { CustomerTimeline, FollowUpManager } from '../components';

export default function CustomerDetailPage() {
  const { data: session } = useSession();
  const { user, handleLogout } = useAppUser();
  const searchParams = useSearchParams();
  const customerId = searchParams?.get('id');
  const customerName = searchParams?.get('name');

  const [activeTab, setActiveTab] = useState<'timeline' | 'followup'>('timeline');

  // ── 早返回 ──
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">请先登录</h2>
          <p className="text-gray-600 dark:text-gray-400">您需要登录后才能访问客户详情页面</p>
        </div>
      </div>
    );
  }

  if (!customerId || !customerName) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">客户信息不完整</h2>
          <p className="text-gray-600 dark:text-gray-400">无法显示客户详情，请返回客户列表重新选择</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: '首页', path: '/dashboard' },
        { label: '客户管理', path: '/customer' },
        { label: customerName },
      ]}
      user={user}
      onLogout={handleLogout}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 标签页 */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === 'timeline'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Calendar className="mr-2 inline h-4 w-4" />
                时间轴
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('followup')}
                className={`border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === 'followup'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Clock className="mr-2 inline h-4 w-4" />
                跟进记录
              </button>
            </nav>
          </div>
        </div>

        {/* 内容区域 */}
        {activeTab === 'timeline' ? (
          <CustomerTimeline customerId={customerId} customerName={customerName} />
        ) : (
          <FollowUpManager customerId={customerId} customerName={customerName} />
        )}
      </div>
    </AppLayout>
  );
}
