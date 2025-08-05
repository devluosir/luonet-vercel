'use client';

import { useState } from 'react';
import { getSession } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';

export default function ApiTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user, setUser } = usePermissionStore();

  const testGetLatestPermissions = async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session?.user) {
        setResult({ error: '用户未登录' });
        return;
      }

      const response = await fetch('/api/auth/get-latest-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': session.user.id || session.user.username || '',
          'X-User-Name': session.user.username || session.user.name || '',
          'X-User-Admin': session.user.isAdmin ? 'true' : 'false',
        },
        cache: 'no-store'
      });

      const data = await response.json();
      setResult(data);
      
      if (data.success && data.permissions) {
        // 更新全局权限store
        const updatedUser = {
          id: session.user.id || session.user.username || '',
          username: session.user.username || session.user.name || '',
          email: session.user.email || null,
          status: true,
          isAdmin: session.user.isAdmin || false,
          permissions: data.permissions
        };
        setUser(updatedUser);
      }
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : '未知错误' });
    } finally {
      setLoading(false);
    }
  };

  const testUpdateSessionPermissions = async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session?.user) {
        setResult({ error: '用户未登录' });
        return;
      }

      const response = await fetch('/api/auth/update-session-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': session.user.id || session.user.username || '',
          'X-User-Name': session.user.username || session.user.name || '',
          'X-User-Admin': session.user.isAdmin ? 'true' : 'false',
        },
        cache: 'no-store'
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : '未知错误' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API 测试页面</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">当前用户信息</h2>
            <pre className="text-sm bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">API 测试结果</h2>
            <pre className="text-sm bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">权限刷新测试</h2>
          <div className="space-x-4">
            <button
              onClick={testGetLatestPermissions}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '测试中...' : '测试 get-latest-permissions'}
            </button>
            
            <button
              onClick={testUpdateSessionPermissions}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? '测试中...' : '测试 update-session-permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 