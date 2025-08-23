'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { CustomerTimeline, FollowUpManager } from '../components';

export default function CustomerDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('id');
  const customerName = searchParams.get('name');

  const [activeTab, setActiveTab] = useState<'timeline' | 'followup'>('timeline');

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            请先登录
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            您需要登录后才能访问客户详情页面
          </p>
        </div>
      </div>
    );
  }

  if (!customerId || !customerName) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            客户信息不完整
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            无法显示客户详情，请返回客户列表重新选择
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>返回</span>
              </button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {customerName}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标签页 */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'timeline'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                时间轴
              </button>
              <button
                onClick={() => setActiveTab('followup')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'followup'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-2" />
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
    </div>
  );
}
