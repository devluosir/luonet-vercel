'use client';

import { useState, useEffect } from 'react';
import { useSession, getSession } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';
import { usePermissionInit } from '@/hooks/usePermissionInit';
import { logPermission } from '@/utils/permissionLogger';

export default function PermissionTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [localStorageData, setLocalStorageData] = useState<any>(null);
  const { data: session, status } = useSession();
  const { user, setUser, clearExpiredCache } = usePermissionStore();
  
  // 使用统一的权限初始化Hook
  usePermissionInit();

  // 获取localStorage数据
  const getLocalStorageData = () => {
    if (typeof window !== 'undefined') {
      const data = {
        username: localStorage.getItem('username'),
        userId: localStorage.getItem('userId'),
        isAdmin: localStorage.getItem('isAdmin'),
        userInfo: localStorage.getItem('userInfo'),
        latestPermissions: localStorage.getItem('latestPermissions'),
        permissionsTimestamp: localStorage.getItem('permissionsTimestamp')
      };
      setLocalStorageData(data);
    }
  };

  useEffect(() => {
    getLocalStorageData();
  }, []);

  const testGetLatestPermissions = async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session?.user) {
        setResult({ error: '用户未登录' });
        return;
      }

      logPermission('开始测试权限刷新', {
        userId: session.user.id,
        username: session.user.username,
        isAdmin: session.user.isAdmin
      });

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
        
        // 保存到localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('latestPermissions', JSON.stringify(data.permissions));
          localStorage.setItem('permissionsTimestamp', Date.now().toString());
          localStorage.setItem('userInfo', JSON.stringify(updatedUser));
        }
        
        // 重新获取localStorage数据
        getLocalStorageData();
      }
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : '未知错误' });
    } finally {
      setLoading(false);
    }
  };

  const clearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('latestPermissions');
      localStorage.removeItem('permissionsTimestamp');
      getLocalStorageData();
    }
  };

  const testCacheCleanup = () => {
    clearExpiredCache();
    getLocalStorageData();
  };

  const refreshLocalStorageData = () => {
    getLocalStorageData();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">权限系统优化测试页面</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Session信息 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Session信息</h2>
            <div className="text-sm">
              <p><strong>状态:</strong> {status}</p>
              <p><strong>用户ID:</strong> {session?.user?.id || 'N/A'}</p>
              <p><strong>用户名:</strong> {session?.user?.username || session?.user?.name || 'N/A'}</p>
              <p><strong>邮箱:</strong> {session?.user?.email || 'N/A'}</p>
              <p><strong>管理员:</strong> {session?.user?.isAdmin ? '是' : '否'}</p>
              <p><strong>权限数量:</strong> {session?.user?.permissions?.length || 0}</p>
            </div>
          </div>
          
          {/* 全局权限Store */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">全局权限Store</h2>
            <div className="text-sm">
              <p><strong>用户ID:</strong> {user?.id || 'N/A'}</p>
              <p><strong>用户名:</strong> {user?.username || 'N/A'}</p>
              <p><strong>邮箱:</strong> {user?.email || 'N/A'}</p>
              <p><strong>管理员:</strong> {user?.isAdmin ? '是' : '否'}</p>
              <p><strong>权限数量:</strong> {user?.permissions?.length || 0}</p>
            </div>
          </div>
          
          {/* localStorage信息 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">localStorage信息</h2>
            <div className="text-sm">
              <p><strong>用户名:</strong> {localStorageData?.username || 'N/A'}</p>
              <p><strong>用户ID:</strong> {localStorageData?.userId || 'N/A'}</p>
              <p><strong>管理员:</strong> {localStorageData?.isAdmin || 'N/A'}</p>
              <p><strong>权限时间戳:</strong> {localStorageData?.permissionsTimestamp || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* API测试结果 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">API测试结果</h2>
          <pre className="text-sm bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>

        {/* 操作按钮 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">操作</h2>
          <div className="space-x-4">
            <button
              onClick={testGetLatestPermissions}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '测试中...' : '测试权限刷新'}
            </button>
            
            <button
              onClick={refreshLocalStorageData}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              刷新localStorage数据
            </button>
            
            <button
              onClick={testCacheCleanup}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              测试缓存清理
            </button>
            
            <button
              onClick={clearLocalStorage}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              清除localStorage
            </button>
          </div>
        </div>

        {/* 权限详情 */}
        {user?.permissions && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mt-8">
            <h2 className="text-xl font-semibold mb-4">当前权限详情</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {user.permissions.map((perm: any, index: number) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                  <p><strong>模块:</strong> {perm.moduleId}</p>
                  <p><strong>访问权限:</strong> {perm.canAccess ? '是' : '否'}</p>
                  <p><strong>ID:</strong> {perm.id}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 