'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { LOGO_CONFIG } from '@/lib/logo-config';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasLoggedIn, setHasLoggedIn] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // 获取callbackUrl参数
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

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

  // 移除session检查逻辑，避免循环重定向
  // 现在使用快速登录，不需要等待session更新

  // 添加自动重定向逻辑 - 已登录用户自动跳转到dashboard
  useEffect(() => {
    // 如果用户已登录，自动重定向到dashboard
    if (session && status === 'authenticated') {
      router.push('/dashboard');
      return;
    }
    
    // 如果session还在加载中，等待加载完成
    if (status === 'loading') {
      return;
    }
    
    // 如果session加载完成但未登录，检查localStorage是否有用户信息
    if (status === 'unauthenticated' && typeof window !== 'undefined') {
      try {
        const userInfo = localStorage.getItem('userInfo');
        const latestPermissions = localStorage.getItem('latestPermissions');
        const permissionsTimestamp = localStorage.getItem('permissionsTimestamp');
        
        if (userInfo && latestPermissions && permissionsTimestamp) {
          const userData = JSON.parse(userInfo);
          const isRecent = (Date.now() - parseInt(permissionsTimestamp)) < 24 * 60 * 60 * 1000;
          
          // 如果有有效的本地用户数据，认为用户已登录，自动跳转
          if (userData.username && isRecent) {
            router.push('/dashboard');
            return;
          }
        }
      } catch (error) {
        console.warn('检查本地用户信息失败:', error);
      }
    }
  }, [session, status, router]);

  // 移除session调试信息，避免在登录后仍然显示
  // useEffect(() => {
  //   if (session && status === 'authenticated') {
  //     console.log('登录页面Session数据:', {
  //       userId: session.user?.id,
  //       username: session.user?.username,
  //       isAdmin: session.user?.isAdmin,
  //       permissions: session.user?.permissions
  //     });
  //   }
  // }, [session, status]);

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
      // 不清除任何存储，让NextAuth正常管理会话
      
      // 快速登录验证，只验证用户名和密码
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl: callbackUrl,
      });

      if (result?.error) {
        setError('用户名或密码错误');
        setLoading(false);
      } else {
        // 登录成功，重置loading状态
        setLoading(false);
        // 使用router.push进行客户端导航，避免页面刷新
        router.push(callbackUrl);
      }
      
    } catch (error) {
      console.error('登录错误:', error);
      setError('登录过程中发生错误，请重试');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="relative">
            <Image
              src={LOGO_CONFIG.web.logo}
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
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    登录中...
                  </div>
                ) : (
                  '登录 →'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
