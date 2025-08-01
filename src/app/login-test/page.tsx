'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState } from 'react';

export default function LoginTestPage() {
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setResult('');

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
        setResult('登录成功！');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            登录测试
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            测试登录功能
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              会话状态
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              状态: {status}
            </p>
            {session && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  用户: {session.user?.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  邮箱: {session.user?.email}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  权限: {session.user?.permissions?.join(', ')}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              <p className="text-sm font-medium">错误</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
              <p className="text-sm font-medium">结果</p>
              <p className="text-sm">{result}</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-500 text-sm"
          >
            前往仪表板
          </a>
        </div>
      </div>
    </div>
  );
} 