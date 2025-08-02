'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { performanceMonitor, optimizePerformance } from '@/utils/performance';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // 性能监控
    performanceMonitor.startTimer('page_load');
    
    // 性能优化
    optimizePerformance.optimizeFontLoading();
    optimizePerformance.cleanupUnusedResources();
    
    // 监控资源加载
    performanceMonitor.monitorResourceLoading();

    // 页面加载完成后的性能记录
    const handleLoad = () => {
      performanceMonitor.endTimer('page_load');
      const metrics = performanceMonitor.getPageLoadMetrics();
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 页面加载性能:', metrics);
      }
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
    
    // 更新调试信息
    // setDebugInfo('页面初始化完成'); // Removed debugInfo state
    
    // 添加全局错误处理
    const handleError = (event: ErrorEvent) => {
      console.error('全局错误:', event.error);
      // setDebugInfo(`错误: ${event.error?.message || '未知错误'}`); // Removed debugInfo state
    };
    
    window.addEventListener('error', handleError);
    
    // 添加原生JavaScript测试
    // const testButton = document.getElementById('native-test'); // Removed native test button
    // if (testButton) {
    //   testButton.addEventListener('click', () => {
    //     alert('原生JavaScript测试成功！');
    //     console.log('原生JavaScript事件处理正常');
    //   });
    // }
    
    return () => {
      window.removeEventListener('error', handleError);
      // if (testButton) { // Removed native test button
      //   testButton.removeEventListener('click', () => {});
      // }
    };
  }, []);

  // 监听session状态变化
  useEffect(() => {
    if (session && status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

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

    performanceMonitor.startTimer('login_request');

    try {
      console.log('尝试登录:', { username, password });
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      performanceMonitor.endTimer('login_request');

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
      localStorage.setItem('username', formattedUsername);
      
      // 直接跳转
      router.push('/dashboard');
    } catch (error) {
      performanceMonitor.endTimer('login_request');
      console.error('登录错误:', error);
      setError('登录过程中发生错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* 调试信息 - 仅在开发环境显示 */}
      {/* Removed debug info div */}
      
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
              
              {/* 简单登录按钮 - 不依赖表单提交 */}
              {/* Removed direct login button */}
              
              {/* 测试按钮 - 仅在开发环境显示 */}
              {/* Removed test buttons */}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
