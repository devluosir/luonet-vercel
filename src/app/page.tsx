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

  // 只在页面初始加载时检查是否已登录
  useEffect(() => {
    // 添加防抖，避免频繁检查
    const timeoutId = setTimeout(() => {
      // 只在页面初始加载时检查一次，避免频繁的session状态变化
      if (session && status === 'authenticated' && !hasLoggedIn) {
        console.log('页面初始加载时检测到已登录用户，检查session完整性...');
        
        // 检查session信息是否完整
        const hasCompleteSession = session.user && 
          session.user.id && 
          session.user.username && 
          session.user.permissions && 
          Array.isArray(session.user.permissions) &&
          session.user.permissions.length > 0; // 确保有权限数据
        
        if (hasCompleteSession) {
          console.log('Session信息完整，跳转到dashboard');
          
          // 保存session中的用户信息到localStorage
          if (session.user && typeof window !== 'undefined') {
            localStorage.setItem('username', session.user.username || session.user.name || '');
            localStorage.setItem('isAdmin', (session.user.isAdmin || false).toString());
            localStorage.setItem('userId', session.user.id || '1');
            
            // 保存权限信息
            if (session.user.permissions && Array.isArray(session.user.permissions)) {
              localStorage.setItem('latestPermissions', JSON.stringify(session.user.permissions));
              localStorage.setItem('permissionsTimestamp', Date.now().toString());
              console.log('已保存完整权限信息:', session.user.permissions);
            }
          }
          
          setHasLoggedIn(true);
          router.push(callbackUrl);
        } else {
          console.log('Session信息不完整，等待更新...', {
            hasUser: !!session.user,
            hasId: !!session.user?.id,
            hasUsername: !!session.user?.username,
            hasPermissions: !!session.user?.permissions,
            permissionsLength: session.user?.permissions?.length || 0
          });
        }
      } else if (status === 'loading') {
        console.log('Session正在加载中...');
      } else if (status === 'unauthenticated') {
        console.log('用户未登录');
      }
    }, 500); // 延迟500ms检查，避免频繁触发
    
    return () => clearTimeout(timeoutId);
  }, [session, status, hasLoggedIn, router, callbackUrl]);

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
      // 强制清除任何可能的缓存
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nextauth.session-token');
        sessionStorage.clear();
      }
      
      console.log('开始登录...', { callbackUrl });
      
      // 使用手动重定向模式，更可靠
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl: callbackUrl,
      });

      console.log('登录结果:', result);
      
      if (result?.error) {
        setError('用户名或密码错误');
        setLoading(false);
      } else {
        console.log('登录成功，等待session更新...');
        setHasLoggedIn(true);
        
        // 简化的session等待逻辑
        let attempts = 0;
        const maxAttempts = 10; // 减少到1秒
        
        const waitForSession = () => {
          attempts++;
          console.log(`Session等待尝试 ${attempts}/${maxAttempts}:`, { 
            status, 
            hasSession: !!session, 
            sessionUser: session?.user?.username 
          });
          
          if (session && status === 'authenticated' && session.user?.id) {
            console.log('Session已更新，跳转到:', callbackUrl);
            router.push(callbackUrl);
          } else if (attempts < maxAttempts) {
            setTimeout(waitForSession, 100);
          } else {
            console.log('Session等待超时，直接跳转');
            router.push(callbackUrl);
          }
        };
        
        setTimeout(waitForSession, 100);
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
