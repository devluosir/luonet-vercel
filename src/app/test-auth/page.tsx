'use client';

import { useSession } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';
import { useEffect, useState } from 'react';

export default function TestAuthPage() {
  const { data: session, status } = useSession();
  const { user, hasPermission, fetchUser } = usePermissionStore();
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    const runTests = async () => {
      const results: any = {
        session: {
          status,
          user: session?.user,
          permissions: session?.user?.permissions
        },
        store: {
          user: user,
          permissions: user?.permissions
        }
      };

      // 测试权限检查
      if (user) {
        results.permissionTests = {
          quotation: hasPermission('quotation'),
          invoice: hasPermission('invoice'),
          purchase: hasPermission('purchase'),
          packing: hasPermission('packing'),
          history: hasPermission('history'),
          customer: hasPermission('customer')
        };
      }

      setTestResults(results);
    };

    if (status === 'authenticated') {
      runTests();
    }
  }, [session, status, user, hasPermission]);

  const handleRefreshPermissions = async () => {
    try {
      await fetchUser(true);
    } catch (error) {
      console.error('刷新权限失败:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">权限测试页面</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Session信息 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Session信息</h2>
            <div className="space-y-2">
              <p><strong>状态:</strong> {status}</p>
              <p><strong>用户:</strong> {session?.user?.username || session?.user?.name}</p>
              <p><strong>邮箱:</strong> {session?.user?.email}</p>
              <p><strong>管理员:</strong> {session?.user?.isAdmin ? '是' : '否'}</p>
              <p><strong>权限:</strong></p>
              <ul className="ml-4">
                {session?.user?.permissions?.map((perm: string, index: number) => (
                  <li key={index} className="text-sm">{perm}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Store信息 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Store信息</h2>
            <div className="space-y-2">
              <p><strong>用户:</strong> {user?.username}</p>
              <p><strong>邮箱:</strong> {user?.email}</p>
              <p><strong>管理员:</strong> {user?.isAdmin ? '是' : '否'}</p>
              <p><strong>权限:</strong></p>
              <ul className="ml-4">
                {user?.permissions?.map((perm: any, index: number) => (
                  <li key={index} className="text-sm">
                    {perm.moduleId} - {perm.canAccess ? '允许' : '拒绝'}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 权限测试 */}
          {testResults.permissionTests && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow md:col-span-2">
              <h2 className="text-lg font-semibold mb-4">权限测试结果</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(testResults.permissionTests).map(([module, hasAccess]) => (
                  <div key={module} className="flex items-center space-x-2">
                    <span className="font-medium">{module}:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      hasAccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {hasAccess ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">操作</h2>
            <div className="space-x-4">
              <button
                onClick={handleRefreshPermissions}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                刷新权限
              </button>
            </div>
          </div>
        </div>

        {/* 原始数据 */}
        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">原始数据</h2>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded text-xs overflow-auto">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
} 