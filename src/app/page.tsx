'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LOGO_CONFIG } from '@/lib/logo-config';

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
      
              // 保存session中的用户信息到localStorage
        if (session.user && typeof window !== 'undefined') {
          localStorage.setItem('username', session.user.username || session.user.name || '');
          localStorage.setItem('isAdmin', (session.user.isAdmin || false).toString());
          localStorage.setItem('userId', session.user.id || '1');
          
          // 保存权限信息
          if (session.user.permissions && Array.isArray(session.user.permissions)) {
            localStorage.setItem('latestPermissions', JSON.stringify(session.user.permissions));
            localStorage.setItem('permissionsTimestamp', Date.now().toString());
          }
        }
      
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
      // 强制清除任何可能的缓存
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nextauth.session-token');
        sessionStorage.clear();
      }
      
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl: '/dashboard',
      });

      if (!result) {
        setError('登录请求失败，请重试');
        return;
      }

      if (result.error) {
        setError('用户名或密码错误');
        return;
      }

      // 登录成功后，立即获取用户权限信息
      
      try {
        // 获取用户权限信息
        const formattedUsername = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
        const isAdmin = username.toLowerCase() === 'roger';
        // 使用用户名作为临时ID，后续会从后端获取真实ID
        const userId = username.toLowerCase();
        
        // 先尝试从后端 API 获取用户信息
        let realIsAdmin = isAdmin;
        let realUserId = userId;
        
        try {
          // 先通过用户名查询获取用户信息
          const userResponse = await fetch(`https://udb.luocompany.net/api/admin/users?username=${encodeURIComponent(username)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': userId,
              'X-User-Name': formattedUsername,
              'X-User-Admin': isAdmin ? 'true' : 'false',
            },
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            
            // 处理返回的用户数据
            let user = null;
            if (userData.users && Array.isArray(userData.users)) {
              // 如果返回的是用户数组，根据用户名查找对应用户
              user = userData.users.find((u: any) => u.username === username);
            } else if (userData.id) {
              // 如果返回的是单个用户对象
              user = userData;
            }
            
            if (user) {
              if (user.isAdmin !== undefined) {
                realIsAdmin = !!user.isAdmin;
              }
              if (user.id) {
                realUserId = user.id;
              }
              
              // 获取邮箱信息并存储到本地
              if (user.email && typeof window !== 'undefined') {
                localStorage.setItem('userEmail', user.email);
              }
              
            } else {
              console.log('未找到对应用户:', username);
            }
          }
        } catch (error) {
          console.error('获取用户信息失败:', error);
        }
        
        const permissionsResponse = await fetch('/api/auth/get-latest-permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': realUserId,
            'X-User-Name': formattedUsername,
            'X-User-Admin': realIsAdmin ? 'true' : 'false',
          },
        });
        
        if (permissionsResponse.ok) {
          const permissionsData = await permissionsResponse.json();
          
          // 保存权限信息到localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('latestPermissions', JSON.stringify(permissionsData.permissions || []));
            localStorage.setItem('permissionsTimestamp', Date.now().toString());
            
            // 保存用户基本信息
            localStorage.setItem('username', formattedUsername);
            
            // 从权限数据中获取管理员状态和用户ID
            const finalIsAdmin = permissionsData.user?.isAdmin || realIsAdmin;
            const finalUserId = permissionsData.user?.id || realUserId;
            localStorage.setItem('isAdmin', finalIsAdmin.toString());
            localStorage.setItem('userId', finalUserId);
          }
        } else {
          console.error('获取权限数据失败:', permissionsResponse.status);
        }
      } catch (error) {
        console.error('获取权限数据出错:', error);
      }
      
      // 等待session更新后再跳转
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
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
                {loading ? '登录中...' : '登录 →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
