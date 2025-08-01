'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function AuthStatusPage() {
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });
      console.log('Login result:', result);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">认证状态检查</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">当前状态</h2>
        <p><strong>状态:</strong> {status}</p>
        <p><strong>已登录:</strong> {session ? '是' : '否'}</p>
        {session && (
          <div className="mt-2">
            <p><strong>用户:</strong> {session.user?.name}</p>
            <p><strong>邮箱:</strong> {session.user?.email}</p>
            <p><strong>权限:</strong> {session.user?.permissions?.join(', ')}</p>
          </div>
        )}
      </div>

      <div className="mb-6 p-4 bg-blue-100 rounded">
        <h2 className="text-xl font-semibold mb-2">登录测试</h2>
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium">用户名:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">密码:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>
      </div>

      {session && (
        <div className="mb-6 p-4 bg-red-100 rounded">
          <h2 className="text-xl font-semibold mb-2">登出</h2>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            登出
          </button>
        </div>
      )}

      <div className="p-4 bg-yellow-100 rounded">
        <h2 className="text-xl font-semibold mb-2">测试说明</h2>
        <p className="text-sm text-gray-600">
          请使用有效的用户账户进行测试。测试账户信息请联系系统管理员。
        </p>
      </div>
    </div>
  );
} 