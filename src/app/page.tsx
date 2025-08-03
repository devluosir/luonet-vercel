'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // 添加全局错误处理
    const handleError = (event: ErrorEvent) => {
      console.error('全局错误:', event.error);
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 这里可以安全访问localStorage
      // 例如：localStorage.setItem('username', ...)
    }
  }, []);

  // 监听session状态变化 - 只在页面加载时检查是否已登录
  useEffect(() => {
    // 只在页面初始加载时检查，避免与登录跳转冲突
    if (session && status === 'authenticated' && !loading) {
      console.log('检测到已登录用户，跳转到dashboard');
      router.push('/dashboard');
    }
  }, [session, status, router, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 防止表单进行默认的GET请求
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      console.log('尝试登录:', { username, password });
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (!result) {
        setError('登录请求失败，请重试');
        return;
      }

      if (result.error) {
        setError('用户名或密码错误');
        return;
      }

      // 保存用户名到localStorage，首字母大写
      const formattedUsername = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
      if (typeof window !== 'undefined') {
        localStorage.setItem('username', formattedUsername);
      }
      
      // 直接跳转
      router.push('/dashboard');
    } catch (error) {
      console.error('登录错误:', error);
      setError('登录过程中发生错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="relative">
            <Image
              src="/assets/logo/logo.png"
              alt="LC APP"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
          LC App
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-lg sm:rounded-3xl sm:px-10">
          <form 
            className="space-y-6" 
            onSubmit={handleSubmit}
            method="POST"
          >
            <div>
              <label htmlFor="username" className="block text-base font-medium text-gray-700 dark:text-gray-200">
                用户名
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-base"
                  placeholder="请输入用户名"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-base font-medium text-gray-700 dark:text-gray-200">
                密码
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-base"
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-200"
              >
                {loading ? '登录中...' : '登录 →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
