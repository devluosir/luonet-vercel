'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
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
  Archive,
  Plus,
  History,
  User,
  LogOut,
  RefreshCw,
  Bell,
  Search,
  Filter,
  Package,
  ChevronDown,
  ChevronUp,
  ChevronRight
} from 'lucide-react';
import { Footer } from '@/components/Footer';
// 移除性能监控导入，减少初始加载时间
// import { performanceMonitor, optimizePerformance, safeRequestIdleCallback } from '@/utils/performance';
import { usePermissionStore, hasPermission } from '@/lib/permissions';
import { Header } from '@/components/Header';

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

// 快速创建单据的模块
const QUICK_CREATE_MODULES = [
  { 
    id: 'quotation', 
    name: '新报价单', 
    description: '创建报价单', 
    path: '/quotation',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    hoverColor: 'hover:text-blue-500 dark:hover:text-blue-300',
    shortcut: 'Q'
  },
  { 
    id: 'confirmation', 
    name: '销售确认', 
    description: '创建销售确认单', 
    path: '/quotation',
    icon: FileText,
    color: 'from-green-500 to-green-600',
    bgColor: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
    textColor: 'text-green-600 dark:text-green-400',
    hoverColor: 'hover:text-green-500 dark:hover:text-green-300',
    shortcut: 'C'
  },
  { 
    id: 'packing', 
    name: '箱单发票', 
    description: '创建装箱单和发票', 
    path: '/packing',
    icon: Package,
    color: 'from-teal-500 to-teal-600',
    bgColor: 'from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20',
    textColor: 'text-teal-600 dark:text-teal-400',
    hoverColor: 'hover:text-teal-500 dark:hover:text-teal-300',
    shortcut: 'B'
  },
  { 
    id: 'invoice', 
    name: '财务发票', 
    description: '创建财务发票', 
    path: '/invoice',
    icon: Receipt,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    hoverColor: 'hover:text-purple-500 dark:hover:text-purple-300',
    shortcut: 'I'
  },
  { 
    id: 'purchase', 
    name: '采购订单', 
    description: '创建采购订单', 
    path: '/purchase',
    icon: ShoppingCart,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
    textColor: 'text-orange-600 dark:text-orange-400',
    hoverColor: 'hover:text-orange-500 dark:hover:text-orange-300',
    shortcut: 'P'
  }
];

// 工具模块
const TOOL_MODULES = [
  { 
    id: 'history', 
    name: '历史记录', 
    description: '查看所有历史记录', 
    path: '/history',
    icon: History,
    color: 'from-gray-500 to-gray-600',
    bgColor: 'from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20',
    textColor: 'text-gray-600 dark:text-gray-400',
    hoverColor: 'hover:text-gray-500 dark:hover:text-gray-300'
  },
  { 
    id: 'date-tools', 
    name: '日期工具', 
    description: '日期计算工具', 
    path: '/date-tools',
    icon: Calendar,
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    hoverColor: 'hover:text-indigo-500 dark:hover:text-indigo-300'
  }
];

// 管理工具模块
const TOOLS_MODULES = [
  { 
    id: 'customer', 
    name: '客户管理', 
    description: '管理客户信息', 
    path: '/customer',
    icon: Users,
    color: 'from-pink-500 to-pink-600',
    bgColor: 'from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20',
    textColor: 'text-pink-600 dark:text-pink-400',
    hoverColor: 'hover:text-pink-500 dark:hover:text-pink-300'
  },
  { 
    id: 'mail', 
    name: '邮件工具', 
    description: '邮件发送工具', 
    path: '/mail',
    icon: Mail,
    color: 'from-red-500 to-red-600',
    bgColor: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
    textColor: 'text-red-600 dark:text-red-400',
    hoverColor: 'hover:text-red-500 dark:hover:text-red-300'
  }
];

const ModuleButton = ({ module, onClick }: { 
  module: any; 
  onClick: (module: any) => void; 
}) => {
  const IconComponent = module.icon;
  
  return (
    <button
      onClick={() => onClick(module)}
      className={`group relative p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br ${module.bgColor} hover:shadow-lg transition-all duration-200 hover:scale-105`}
    >
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg bg-gradient-to-r ${module.color} text-white`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="flex-1 text-left">
          <h3 className={`font-semibold ${module.textColor} group-hover:${module.hoverColor} transition-colors`}>
            {module.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {module.description}
          </p>
        </div>
      </div>
      
      {/* 快捷键提示 */}
      {module.shortcut && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
          {module.shortcut}
        </div>
      )}
    </button>
  );
};

export default function DashboardPage() {
  // 所有 hooks 统一声明
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<'today' | '3days' | 'week' | 'month'>('today');
  const [typeFilter, setTypeFilter] = useState<'all' | 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase'>('all');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user, isLoading } = usePermissionStore();
  const refreshing = isLoading;

  // 优化的权限映射和检查（减少计算复杂度）
  const permissionMap = useMemo(() => {
    // 如果用户数据还没有加载完成，返回默认值
    if (!user || isLoading) {
      return {
        permissions: {
          quotation: false,
          packing: false,
          invoice: false,
          purchase: false
        },
        documentTypePermissions: {
          quotation: false,
          confirmation: false,
          packing: false,
          invoice: false,
          purchase: false
        },
        accessibleDocumentTypes: []
      };
    }

    // 使用统一的权限检查函数
    const permissions = {
      quotation: hasPermission('quotation'),
      packing: hasPermission('packing'),
      invoice: hasPermission('invoice'),
      purchase: hasPermission('purchase')
    };

    // 文档类型到权限的映射
    const documentTypePermissions = {
      quotation: permissions.quotation,
      confirmation: permissions.quotation, // 销售确认使用报价单权限
      packing: permissions.packing,
      invoice: permissions.invoice,
      purchase: permissions.purchase
    };

    // 可访问的文档类型
    const accessibleDocumentTypes = Object.entries(documentTypePermissions)
      .filter(([_, hasAccess]) => hasAccess)
      .map(([type]) => type);

    return {
      permissions,
      documentTypePermissions,
      accessibleDocumentTypes
    };
  }, [user, isLoading]);

  // 优化的初始化函数 - 直接使用session中的权限数据
  const init = useCallback(async () => {
    // 延迟预加载，避免阻塞初始渲染
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const coreModules = [
          { path: '/quotation' },
          { path: '/packing' },
          { path: '/invoice' },
          { path: '/purchase' },
          { path: '/history' }
        ];
        coreModules.forEach(module => {
          router.prefetch(module.path);
        });
      }, 2000); // 延迟2秒预加载
    }
    
    // 如果用户已登录，直接从session获取权限数据，不需要额外API调用
    if (session?.user && !user) {
      // 直接从session构建用户权限数据
      const sessionPermissions = session.user.permissions || [];
      const userData = {
        id: session.user.id || session.user.username || '',
        username: session.user.username || session.user.name || '',
        email: session.user.email || null,
        status: true,
        isAdmin: session.user.isAdmin || false,
        permissions: sessionPermissions
      };
      
      // 直接设置权限数据，避免API调用
      usePermissionStore.getState().setUser(userData);
    }
  }, [session, router, user]);

  // 组件挂载后初始化
  useEffect(() => {
    setMounted(true);
    init();
  }, [init]);

  // 优化的退出逻辑 - 避免重复退出
  const handleLogout = useCallback(async () => {
    // 清除权限store和当前用户的相关缓存
    usePermissionStore.getState().clearUser();
    localStorage.removeItem('username');
    
    // 只调用一次signOut，避免重复退出
    await signOut({ redirect: true, callbackUrl: '/' });
  }, []);

  // 使用统一的权限映射
  const availableQuickCreateModules = useMemo(() => {
    const modules = QUICK_CREATE_MODULES.filter(module => {
      if (module.id === 'confirmation') {
        return permissionMap.documentTypePermissions.confirmation;
      }
      return permissionMap.documentTypePermissions[module.id as keyof typeof permissionMap.documentTypePermissions];
    });
    
    return modules;
  }, [permissionMap.documentTypePermissions]);

  const availableToolModules = useMemo(() => {
    if (!user || isLoading) return [];
    const userPermissions = user.permissions || [];
    return TOOL_MODULES.filter(module => {
      const permission = userPermissions.find(p => p.moduleId === module.id);
      return permission?.canAccess || false;
    });
  }, [user, isLoading]);

  const availableToolsModules = useMemo(() => {
    if (!user || isLoading) return [];
    const userPermissions = user.permissions || [];
    return TOOLS_MODULES.filter(module => {
      const permission = userPermissions.find(p => p.moduleId === module.id);
      return permission?.canAccess || false;
    });
  }, [user, isLoading]);

  // 根据权限过滤可用的文档类型筛选器
  const availableTypeFilters = useMemo(() => {
    const filters = [];
    
    // 使用统一的权限映射
    if (permissionMap.documentTypePermissions.quotation) {
      filters.push({ type: 'quotation', label: 'QTN', color: 'blue' });
    }
    if (permissionMap.documentTypePermissions.confirmation) {
      filters.push({ type: 'confirmation', label: 'SC', color: 'green' });
    }
    if (permissionMap.documentTypePermissions.packing) {
      filters.push({ type: 'packing', label: 'PL', color: 'teal' });
    }
    if (permissionMap.documentTypePermissions.invoice) {
      filters.push({ type: 'invoice', label: 'INV', color: 'purple' });
    }
    if (permissionMap.documentTypePermissions.purchase) {
      filters.push({ type: 'purchase', label: 'PO', color: 'orange' });
    }
    
    // 如果有任何权限，添加ALL选项到PO的右边
    if (filters.length > 0) {
      filters.push({ type: 'all', label: 'ALL', color: 'gray' });
    }
    
    return filters;
  }, [permissionMap.documentTypePermissions]);

  // 根据显示状态过滤按钮
  const visibleTypeFilters = useMemo(() => {
    if (showAllFilters) {
      // 显示所有按钮
      return availableTypeFilters;
    } else {
      // 只显示前3个按钮
      return availableTypeFilters.slice(0, 3);
    }
  }, [availableTypeFilters, showAllFilters]);

  // 优化的文档加载函数 - 减少localStorage读取
  const loadDocuments = useCallback(async (filter: 'today' | '3days' | 'week' | 'month' = 'today', typeFilter: 'all' | 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase' = 'all') => {
    try {
      // 使用统一的权限映射
      const allDocuments = [];
      
      // 只加载用户有权限的文档类型
      if (permissionMap.documentTypePermissions.quotation) {
        const quotationHistory = JSON.parse(localStorage.getItem('quotation_history') || '[]');
        allDocuments.push(...quotationHistory.map((doc: any) => ({ ...doc, type: doc.type || 'quotation' })));
      }
      
      if (permissionMap.documentTypePermissions.packing) {
        const packingHistory = JSON.parse(localStorage.getItem('packing_history') || '[]');
        allDocuments.push(...packingHistory.map((doc: any) => ({ ...doc, type: 'packing' })));
      }
      
      if (permissionMap.documentTypePermissions.invoice) {
        const invoiceHistory = JSON.parse(localStorage.getItem('invoice_history') || '[]');
        allDocuments.push(...invoiceHistory.map((doc: any) => ({ ...doc, type: 'invoice' })));
      }
      
      if (permissionMap.documentTypePermissions.purchase) {
        const purchaseHistory = JSON.parse(localStorage.getItem('purchase_history') || '[]');
        allDocuments.push(...purchaseHistory.map((doc: any) => ({ ...doc, type: 'purchase' })));
      }

      // 获取当前日期
      const now = new Date();
      const startDate = new Date();

      // 根据筛选条件设置开始日期
      switch (filter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '3days':
          startDate.setDate(startDate.getDate() - 3);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // 筛选指定时间范围内的文档
      let filteredDocuments = allDocuments.filter((doc: any) => {
        // 优先使用date字段，如果没有则使用updatedAt或createdAt
        const docDate = new Date(doc.date || doc.updatedAt || doc.createdAt);
        return docDate >= startDate && docDate <= now;
      });

      // 根据类型筛选
      if (typeFilter !== 'all') {
        filteredDocuments = filteredDocuments.filter((doc: any) => {
          return doc.type === typeFilter;
        });
      }

      // 按日期排序（最新的在前）
      const sorted = filteredDocuments
        .sort((a, b) => {
          const dateA = new Date(a.date || a.updatedAt || a.createdAt);
          const dateB = new Date(b.date || b.updatedAt || b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });

      setRecentDocuments(sorted);
    } catch (error) {
      console.error('加载文档失败:', error);
    }
  }, [permissionMap.documentTypePermissions]);

  // 加载指定时间范围内的文档
  useEffect(() => {
    if (mounted) {
      loadDocuments(timeFilter, typeFilter);
    }
  }, [mounted, timeFilter, typeFilter, loadDocuments]);

  // 监听localStorage变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.includes('_history')) {
        loadDocuments(timeFilter, typeFilter);
      }
    };

    const handleCustomStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.key && customEvent.detail.key.includes('_history')) {
        loadDocuments(timeFilter, typeFilter);
      }
    };

    const handlePermissionChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.type === 'permissions_updated') {
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customStorageChange', handleCustomStorageChange);
    window.addEventListener('permissionChange', handlePermissionChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customStorageChange', handleCustomStorageChange);
      window.removeEventListener('permissionChange', handlePermissionChange);
    };
  }, [timeFilter, typeFilter, loadDocuments]);

  // 处理模块点击
  const handleModuleClick = useCallback((module: any) => {
    router.push(module.path);
  }, [router]);

  // 处理筛选器变化
  const handleTimeFilterChange = useCallback((filter: 'today' | '3days' | 'week' | 'month') => {
    setTimeFilter(filter);
  }, []);

  const handleTypeFilterChange = useCallback((filter: 'all' | 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase') => {
    setTypeFilter(filter);
  }, []);

  // 获取文档类型名称
  const getDocumentTypeName = (type: string) => {
    const typeNames: { [key: string]: string } = {
      'quotation': '报价单',
      'confirmation': '销售确认',
      'packing': '装箱单',
      'invoice': '发票',
      'purchase': '采购订单'
    };
    return typeNames[type] || type;
  };

  // 获取文档编号
  const getDocumentNumber = (doc: any) => {
    return doc.quotationNumber || doc.invoiceNumber || doc.packingNumber || doc.purchaseNumber || doc.id || 'N/A';
  };

  // 如果还没有挂载，显示加载状态
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">加载中...</span>
        </div>
      </div>
    );
  }

  // 如果用户未登录，显示登录提示
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              请先登录
            </h2>
            <button
              onClick={() => signIn()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 如果正在加载，显示加载状态
  if (status === 'loading' || refreshing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        user={{
          name: session?.user?.name || session?.user?.username || '用户',
          isAdmin: user?.isAdmin || false
        }}
        onLogout={handleLogout}
        onProfile={() => setShowProfileModal(true)}
      />
      
      <main className="container mx-auto px-4 py-8">
        {/* 成功消息 */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{successMessage}</p>
          </div>
        )}

        {/* 欢迎区域 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            欢迎回来，{session?.user?.name || session?.user?.username || '用户'}！
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            今天是 {new Date().toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>

        {/* 快速创建区域 */}
        {availableQuickCreateModules.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              快速创建
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {availableQuickCreateModules.map((module) => (
                <ModuleButton
                  key={module.id}
                  module={module}
                  onClick={handleModuleClick}
                />
              ))}
            </div>
          </section>
        )}

        {/* 工具区域 */}
        {(availableToolModules.length > 0 || availableToolsModules.length > 0) && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              工具
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {availableToolModules.map((module) => (
                <ModuleButton
                  key={module.id}
                  module={module}
                  onClick={handleModuleClick}
                />
              ))}
              {availableToolsModules.map((module) => (
                <ModuleButton
                  key={module.id}
                  module={module}
                  onClick={handleModuleClick}
                />
              ))}
            </div>
          </section>
        )}

        {/* 最近文档区域 */}
        {availableTypeFilters.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                最近文档
              </h2>
              
              {/* 筛选器 */}
              <div className="flex items-center space-x-2">
                {/* 时间筛选 */}
                <div className="flex items-center space-x-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                  {[
                    { value: 'today', label: '今天' },
                    { value: '3days', label: '3天' },
                    { value: 'week', label: '本周' },
                    { value: 'month', label: '本月' }
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => handleTimeFilterChange(filter.value as any)}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        timeFilter === filter.value
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* 类型筛选 */}
                <div className="flex items-center space-x-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                  {visibleTypeFilters.map((filter) => (
                    <button
                      key={filter.type}
                      onClick={() => handleTypeFilterChange(filter.type as any)}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        typeFilter === filter.type
                          ? `bg-${filter.color}-500 text-white`
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  
                  {/* 显示更多按钮 */}
                  {availableTypeFilters.length > 3 && (
                    <button
                      onClick={() => setShowAllFilters(!showAllFilters)}
                      className="px-2 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showAllFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 文档列表 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {recentDocuments.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentDocuments.slice(0, 10).map((doc, index) => (
                    <div
                      key={`${doc.type}-${doc.id || index}`}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => {
                        // 根据文档类型跳转到相应页面
                        const pathMap: { [key: string]: string } = {
                          'quotation': '/quotation',
                          'confirmation': '/quotation',
                          'packing': '/packing',
                          'invoice': '/invoice',
                          'purchase': '/purchase'
                        };
                        const path = pathMap[doc.type];
                        if (path) {
                          router.push(path);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                            doc.type === 'quotation' ? 'bg-blue-500' :
                            doc.type === 'confirmation' ? 'bg-green-500' :
                            doc.type === 'packing' ? 'bg-teal-500' :
                            doc.type === 'invoice' ? 'bg-purple-500' :
                            doc.type === 'purchase' ? 'bg-orange-500' : 'bg-gray-500'
                          }`}>
                            {doc.type === 'quotation' ? 'Q' :
                             doc.type === 'confirmation' ? 'C' :
                             doc.type === 'packing' ? 'P' :
                             doc.type === 'invoice' ? 'I' :
                             doc.type === 'purchase' ? 'O' : 'D'}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {getDocumentTypeName(doc.type)} - {getDocumentNumber(doc)}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(doc.date || doc.updatedAt || doc.createdAt).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {doc.customerName || doc.supplierName || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {doc.totalAmount ? `¥${doc.totalAmount.toLocaleString()}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    暂无文档记录
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* 个人资料模态框 */}
      {showProfileModal && user && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={user}
        />
      )}
    </div>
  );
} 