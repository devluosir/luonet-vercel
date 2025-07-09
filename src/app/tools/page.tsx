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
    color: 'from-slate-500 to-gray-600',
    bgColor: 'from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-700/20',
    textColor: 'text-gray-600 dark:text-gray-400',
    hoverColor: 'hover:text-gray-500 dark:hover:text-gray-300'
  },
  { 
    id: 'quotation', 
    name: '报价及确认', 
    description: '生成报价单和销售确认单', 
    path: '/quotation',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    hoverColor: 'hover:text-blue-500 dark:hover:text-blue-300'
  },
  { 
    id: 'purchase', 
    name: '采购订单', 
    description: '生成给供应商的采购订单', 
    path: '/purchase',
    icon: ShoppingCart,
    color: 'from-orange-500 to-red-500',
    bgColor: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
    textColor: 'text-orange-600 dark:text-orange-400',
    hoverColor: 'hover:text-orange-500 dark:hover:text-orange-300'
  },
  {
    id: 'packing',
    name: '箱单发票',
    description: '生成和管理箱单发票',
    path: '/packing',
    icon: Archive,
    color: 'from-teal-500 to-cyan-500',
    bgColor: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20',
    textColor: 'text-teal-600 dark:text-teal-400',
    hoverColor: 'hover:text-teal-500 dark:hover:text-teal-300'
  },
  { 
    id: 'invoice', 
    name: '发票结算', 
    description: '生成和管理发票', 
    path: '/invoice',
    icon: Receipt,
    color: 'from-purple-500 to-indigo-500',
    bgColor: 'from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    hoverColor: 'hover:text-purple-500 dark:hover:text-purple-300'
  },
  { 
    id: 'ai-email', 
    name: 'AI邮件助手', 
    description: '智能生成商务邮件', 
    path: '/mail',
    icon: Mail,
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    hoverColor: 'hover:text-blue-500 dark:hover:text-blue-300'
  },
  { 
    id: 'date-tools', 
    name: '日期计算', 
    description: '计算日期和天数', 
    path: '/date-tools',
    icon: Calendar,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    hoverColor: 'hover:text-purple-500 dark:hover:text-purple-300'
  },
  { 
    id: 'feature4', 
    name: '客户管理', 
    description: '客户信息管理系统', 
    path: '/tools/feature4',
    icon: Users,
    color: 'from-violet-500 to-purple-500',
    bgColor: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
    textColor: 'text-violet-600 dark:text-violet-400',
    hoverColor: 'hover:text-violet-500 dark:hover:text-violet-300'
  },
  { 
    id: 'feature5', 
    name: '库存管理', 
    description: '产品库存跟踪', 
    path: '/tools/feature5',
    icon: Database,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    hoverColor: 'hover:text-amber-500 dark:hover:text-amber-300'
  },
  { 
    id: 'feature3', 
    name: '数据分析', 
    description: '业务数据分析和报表', 
    path: '/tools/feature3',
    icon: BarChart3,
    color: 'from-cyan-500 to-blue-500',
    bgColor: 'from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    hoverColor: 'hover:text-cyan-500 dark:hover:text-cyan-300'
  },
  { 
    id: 'feature8', 
    name: '销售预测', 
    description: '销售趋势分析', 
    path: '/tools/feature8',
    icon: TrendingUp,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    hoverColor: 'hover:text-emerald-500 dark:hover:text-emerald-300'
  },
  { 
    id: 'feature7', 
    name: '时间管理', 
    description: '项目时间跟踪', 
    path: '/tools/feature7',
    icon: Clock,
    color: 'from-indigo-500 to-blue-500',
    bgColor: 'from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    hoverColor: 'hover:text-indigo-500 dark:hover:text-indigo-300'
  },
  { 
    id: 'feature6', 
    name: '自动化工具', 
    description: '工作流程自动化', 
    path: '/tools/feature6',
    icon: Zap,
    color: 'from-red-500 to-pink-500',
    bgColor: 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
    textColor: 'text-red-600 dark:text-red-400',
    hoverColor: 'hover:text-red-500 dark:hover:text-red-300'
  },
  { 
    id: 'feature9', 
    name: '系统设置', 
    description: '应用配置管理', 
    path: '/tools/feature9',
    icon: Settings,
    color: 'from-gray-500 to-slate-500',
    bgColor: 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20',
    textColor: 'text-gray-600 dark:text-gray-400',
    hoverColor: 'hover:text-gray-500 dark:hover:text-gray-300'
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

      <div className="flex flex-col items-center justify-center w-full py-6 px-4">
        {availableModules.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 text-lg">
              暂无可用工具，请联系管理员分配权限
            </div>
          </div>
        ) : (
          <div className="w-full max-w-6xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
            {availableModules.map((module) => {
              const Icon = module.icon || Settings;
              return (
                <div
                  key={module.id}
                  className="group relative bg-white dark:bg-[#1c1c1e] shadow-sm hover:shadow-lg 
                           rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 ease-in-out
                           hover:-translate-y-1 cursor-pointer
                           border border-gray-200/50 dark:border-gray-800/50
                           hover:border-gray-300/70 dark:hover:border-gray-700/70
                           min-h-[110px] sm:min-h-[130px] lg:min-h-[150px]
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
                  {/* 背景渐变层 */}
                  <div 
                    className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 dark:group-hover:opacity-10 transition-opacity duration-300 ease-in-out ${module.bgColor}`}
                  ></div>
                  
                  <div className="p-2.5 sm:p-3 lg:p-4 h-full flex flex-col">
                    {/* 图标和标题 */}
                    <div className="flex items-start space-x-2 sm:space-x-2.5 mb-2">
                      <div className={`p-1.5 sm:p-2 lg:p-2.5 rounded-lg bg-gradient-to-br ${module.color} flex-shrink-0 shadow-sm`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2">
                        {module.name}
                      </h3>
                      </div>
                    </div>
                    
                    {/* 描述 */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 flex-grow line-clamp-2 leading-relaxed">
                      {module.description}
                    </p>
                    
                    {/* 操作按钮 */}
                    <div className={`flex items-center justify-between mt-auto pt-1.5 border-t border-gray-100 dark:border-gray-800`}>
                                             <div className={`flex items-center text-xs font-medium ${module.textColor} ${module.hoverColor} transition-colors duration-300`}>
                         <span>开始使用</span>
                       </div>
                       <svg className={`h-3 w-3 sm:h-4 sm:w-4 ${module.textColor} transform group-hover:translate-x-1 transition-transform duration-300`} 
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