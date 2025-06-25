'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { 
  Mail, 
  FileText, 
  Receipt, 
  Calendar, 
  ShoppingCart, 
  Settings, 
  BarChart3, 
  Users, 
  Database, 
  Zap,
  Clock,
  TrendingUp,
  Archive
} from 'lucide-react';
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
    id: 'history', 
    name: '单据管理中心', 
    description: '统一管理报价单、发票、采购订单历史', 
    path: '/history',
    icon: Archive,
    color: 'from-indigo-500 to-purple-500'
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
    id: 'purchase', 
    name: '采购订单', 
    description: '生成给供应商的采购订单', 
    path: '/purchase',
    icon: ShoppingCart,
    color: 'from-green-500 to-emerald-500'
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
    id: 'ai-email', 
    name: 'AI邮件助手', 
    description: '智能生成商务邮件', 
    path: '/mail',
    icon: Mail,
    color: 'from-blue-500 to-indigo-500'
  },

  { 
    id: 'date-tools', 
    name: '日期计算', 
    description: '计算日期和天数', 
    path: '/date-tools',
    icon: Calendar,
    color: 'from-purple-500 to-pink-500'
  },
  { 
    id: 'feature4', 
    name: '客户管理', 
    description: '客户信息管理系统', 
    path: '/tools/feature4',
    icon: Users,
    color: 'from-violet-500 to-purple-500'
  },
  { 
    id: 'feature5', 
    name: '库存管理', 
    description: '产品库存跟踪', 
    path: '/tools/feature5',
    icon: Database,
    color: 'from-yellow-500 to-orange-500'
  },
  { 
    id: 'feature3', 
    name: '数据分析', 
    description: '业务数据分析和报表', 
    path: '/tools/feature3',
    icon: BarChart3,
    color: 'from-cyan-500 to-blue-500'
  },
  { 
    id: 'feature8', 
    name: '销售预测', 
    description: '销售趋势分析', 
    path: '/tools/feature8',
    icon: TrendingUp,
    color: 'from-green-500 to-teal-500'
  },
  { 
    id: 'feature7', 
    name: '时间管理', 
    description: '项目时间跟踪', 
    path: '/tools/feature7',
    icon: Clock,
    color: 'from-indigo-500 to-blue-500'
  },
  { 
    id: 'feature6', 
    name: '自动化工具', 
    description: '工作流程自动化', 
    path: '/tools/feature6',
    icon: Zap,
    color: 'from-red-500 to-pink-500'
  },
  { 
    id: 'feature9', 
    name: '系统设置', 
    description: '应用配置管理', 
    path: '/tools/feature9',
    icon: Settings,
    color: 'from-gray-500 to-slate-500'
  },
];

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

export default function ToolsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 预加载常用页面
    if (typeof window !== 'undefined') {
      router.prefetch('/quotation');
      router.prefetch('/invoice');
      router.prefetch('/purchase');
      router.prefetch('/history');
    }
  }, [router]);

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
        {process.env.NODE_ENV === 'development' && (
          <div className="text-sm text-gray-500 mt-2">
            正在获取用户权限信息...
          </div>
        )}
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
            title="App工具"
          />

          <ProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            user={user}
          />
        </>
      )}

      <div className="flex flex-col items-center justify-center w-full py-8 px-2">
        {availableModules.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 text-lg">
              暂无可用工具，请联系管理员分配权限
            </div>
          </div>
        ) : (
          <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 md:gap-7 lg:gap-8 justify-center">
            {availableModules.map((module) => {
              const Icon = module.icon || Settings;
              return (
                <div
                  key={module.id}
                  className="group relative bg-white dark:bg-[#1c1c1e] shadow-sm hover:shadow-xl 
                           rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 ease-in-out
                           hover:-translate-y-1 cursor-pointer
                           border border-gray-200/30 dark:border-gray-800/30
                           dark:hover:border-gray-700/50
                           min-h-[140px] sm:min-h-[160px] md:min-h-[180px]
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                           dark:focus:ring-offset-gray-900"
                  onClick={() => router.push(module.path)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(module.path);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`打开${module.name}`}
                >
                  <div 
                    className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300 ease-in-out ${module.color || 'from-gray-500 to-gray-600'}`}
                  ></div>
                  <div className="p-3 sm:p-4 md:p-5 lg:p-6 h-full flex flex-col">
                    <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 mb-2 sm:mb-3 md:mb-4">
                      <div className={`p-2 sm:p-2.5 md:p-3 rounded-lg bg-gradient-to-br ${module.color || 'from-gray-500 to-gray-600'} flex-shrink-0`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                        {module.name}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4 flex-grow line-clamp-3">
                      {module.description}
                    </p>
                    <div className="flex items-center text-xs sm:text-sm font-medium 
                                text-blue-600 group-hover:text-blue-500 
                                dark:text-blue-400 dark:group-hover:text-blue-300
                                transition-colors duration-300 mt-auto">
                      开始使用
                      <svg className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 transform group-hover:translate-x-1 transition-transform duration-300" 
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
        )}
      </div>
      </div>
      <Footer />
    </div>
  );
}