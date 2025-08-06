'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { refreshPermissionsAndSession } from '@/lib/refresh';

export default function TestPermissionsPage() {
  const { data: session } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string>('');

  const handleRefresh = async () => {
    if (!session?.user?.name) {
      setRefreshResult('没有用户信息');
      return;
    }

    setIsRefreshing(true);
    setRefreshResult('刷新中...');

    try {
      const success = await refreshPermissionsAndSession(session.user.name);
      setRefreshResult(success ? '权限刷新成功' : '权限刷新失败');
    } catch (error) {
      setRefreshResult(`权限刷新错误: ${error}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">权限测试页面</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">当前会话信息</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">权限刷新测试</h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isRefreshing ? '刷新中...' : '刷新权限'}
          </button>
          {refreshResult && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
              <strong>结果:</strong> {refreshResult}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">权限测试链接</h2>
          <div className="space-y-2">
            <a href="/quotation" className="block text-blue-500 hover:underline">测试报价单页面</a>
            <a href="/invoice" className="block text-blue-500 hover:underline">测试发票页面</a>
            <a href="/packing" className="block text-blue-500 hover:underline">测试装箱单页面</a>
            <a href="/purchase" className="block text-blue-500 hover:underline">测试采购页面</a>
            <a href="/history" className="block text-blue-500 hover:underline">测试历史页面</a>
          </div>
        </div>
      </div>
    </div>
  );
} 