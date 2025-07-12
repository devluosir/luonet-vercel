'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Plus, Search, Filter } from 'lucide-react';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { Footer } from '@/components/Footer';
import dynamic from 'next/dynamic';

interface Permission {
  id: string;
  moduleId: string;
  canAccess: boolean;
}

interface User {
  id: string;
  username: string;
  email: string | null;
  status: boolean;
  isAdmin: boolean;
  permissions: Permission[];
}

// 使用dynamic导入避免hydration问题
const DynamicHeader = dynamic(() => import('@/components/Header').then(mod => mod.Header), {
  ssr: true,
  loading: () => (
    <div className="bg-white dark:bg-[#1c1c1e] shadow-sm dark:shadow-gray-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
      </div>
    </div>
  )
});

// 预加载Header组件
if (typeof window !== 'undefined') {
  import('@/components/Header');
}

export default function CustomerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('username');
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  useEffect(() => {
    if (!mounted || status === 'loading') return;

    if (!session) {
      router.push('/');
      return;
    }

    const fetchUser = async () => {
      try {
        setLoading(true);
        
        // 尝试从缓存获取用户信息
        const cachedUser = sessionStorage.getItem('userInfo');
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            setUser(parsedUser);
            setLoading(false);
            return;
          } catch (e) {
            // 缓存解析失败，继续从API获取
          }
        }
        
        const response = await fetch('/api/users/me');
        if (!response.ok) {
          throw new Error('获取用户信息失败');
        }
        const data = await response.json();
        setUser(data);
        
        // 缓存用户信息
        sessionStorage.setItem('userInfo', JSON.stringify(data));
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [mounted, session, status, router]);

  // 避免闪烁，在客户端渲染前返回空内容
  if (!mounted) {
    return null;
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-black">
      <div className="flex-1">
        {user && (
          <>
            <DynamicHeader 
              user={{
                name: user.username,
                isAdmin: user.isAdmin
              }}
              onLogout={handleLogout}
              onProfile={() => setShowProfileModal(true)}
              title="客户管理"
            />

            <ProfileModal
              isOpen={showProfileModal}
              onClose={() => setShowProfileModal(false)}
              user={user}
            />
          </>
        )}

        {/* 主要内容区域 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 页面头部 */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/tools')}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>返回工具</span>
                </button>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">客户管理</h1>
              </div>
              <button
                className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                <Plus className="h-4 w-4" />
                <span>添加客户</span>
              </button>
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              管理客户信息，包括联系方式、交易历史等
            </p>
          </div>

          {/* 搜索和过滤区域 */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索客户名称、邮箱或电话..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                <Filter className="h-4 w-4" />
                <span>筛选</span>
              </button>
            </div>
          </div>

          {/* 客户列表区域 */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Users className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    客户管理功能开发中
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    此功能正在开发中，将包括客户信息管理、交易历史等功能
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 dark:text-gray-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>即将推出</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
