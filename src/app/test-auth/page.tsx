'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState } from 'react';

export default function TestAuthPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleTestLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      console.log('SignIn result:', result);

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        setError('登录成功！');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">认证测试页面</h1>
      
      <div className="mb-4">
        <p>当前会话状态: {session ? '已登录' : '未登录'}</p>
        {session && (
          <div>
            <p>用户: {session.user?.name}</p>
            <p>邮箱: {session.user?.email}</p>
            <p>权限: {session.user?.permissions?.join(', ')}</p>
          </div>
        )}
      </div>

      <div className="mb-4 space-y-2">
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
      </div>

      <button
        onClick={handleTestLogin}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? '测试中...' : '测试登录'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="font-bold">测试说明:</h3>
        <p className="mt-2 text-sm text-gray-600">
          请使用有效的用户账户进行测试。测试账户信息请联系系统管理员。
        </p>
      </div>
    </div>
  );
} 