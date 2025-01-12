'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { Mail, FileText, Receipt, Star } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/Footer';

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

// 定义所有可用的模块
const MODULES = [
  { 
    id: 'ai-email', 
    name: 'AI邮件助手', 
    description: '智能生成商务邮件', 
    path: '/mail',
    icon: Mail,
    color: 'from-blue-500 to-indigo-500'
  },
  { 
    id: 'quotation', 
    name: '报价及确认', 
    description: '生成报价单和销售确认单', 
    path: '/quotation',
    icon: FileText,
    color: 'from-emerald-500 to-teal-500'
  },
  { 
    id: 'invoice', 
    name: '发票助手', 
    description: '生成和管理发票', 
    path: '/invoice',
    icon: Receipt,
    color: 'from-orange-500 to-amber-500'
  },
  { 
    id: 'feature1', 
    name: '功能1', 
    description: '待开发功能', 
    path: '/review',
    icon: Star,
    color: 'from-purple-500 to-pink-500'
  },
  { id: 'feature2', name: '功能2', description: '待开发功能', path: '/tools/feature2' },
  { id: 'feature3', name: '功能3', description: '待开发功能', path: '/tools/feature3' },
  { id: 'feature4', name: '功能4', description: '待开发功能', path: '/tools/feature4' },
  { id: 'feature5', name: '功能5', description: '待开发功能', path: '/tools/feature5' },
  { id: 'feature6', name: '功能6', description: '待开发功能', path: '/tools/feature6' },
  { id: 'feature7', name: '功能7', description: '待开发功能', path: '/tools/feature7' },
  { id: 'feature8', name: '功能8', description: '待开发功能', path: '/tools/feature8' },
  { id: 'feature9', name: '功能9', description: '待开发功能', path: '/tools/feature9' },
];

// 使用dynamic导入避免hydration问题
const DynamicHeader = dynamic(() => import('@/components/Header').then(mod => mod.Header), {
  ssr: false
});

export default function ToolsPage() {
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
        const response = await fetch('/api/users/me');
        if (!response.ok) {
          throw new Error('获取用户信息失败');
        }
        const data = await response.json();
        setUser(data);
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

  // 根据用户权限过滤可用模块
  const availableModules = MODULES.filter(module => {
    const permission = user?.permissions?.find(p => p.moduleId === module.id);
    return permission?.canAccess;
  });

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
          />

          <ProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            user={user}
          />
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          我的工具箱
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableModules.map((module) => {
            const Icon = module.icon || Star;
            return (
              <div
                key={module.id}
                className="group relative bg-white dark:bg-[#1c1c1e] shadow-sm hover:shadow-xl 
                         rounded-xl overflow-hidden transition-all duration-300 ease-in-out
                         hover:-translate-y-1 cursor-pointer
                         border border-gray-200/30 dark:border-gray-800/30
                         dark:hover:border-gray-700/50"
                onClick={() => router.push(module.path)}
              >
                <div 
                  className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300 ease-in-out ${module.color || 'from-gray-500 to-gray-600'}`}
                ></div>
                <div className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${module.color || 'from-gray-500 to-gray-600'}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {module.name}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {module.description}
                  </p>
                  <div className="flex items-center text-sm font-medium 
                              text-blue-600 group-hover:text-blue-500 
                              dark:text-blue-400 dark:group-hover:text-blue-300
                              transition-colors duration-300">
                    开始使用
                    <svg className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" 
                         viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" 
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                            clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}