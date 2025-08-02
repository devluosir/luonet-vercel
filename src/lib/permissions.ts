import { create } from 'zustand';
import { API_ENDPOINTS, apiRequestWithError, getNextAuthSession } from '@/lib/api-config';

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

interface PermissionStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
  
  // Permission checks
  hasPermission: (moduleId: string) => boolean;
  hasAnyPermission: (moduleIds: string[]) => boolean;
  isAdmin: () => boolean;
  
  // Fetch user data
  fetchUser: (forceRefresh?: boolean) => Promise<void>;
  
  // Force refresh permissions
  forceRefreshPermissions: () => Promise<void>;
}

// 简化的权限store
export const usePermissionStore = create<PermissionStore>()(
  (set, get) => ({
    user: null,
    isLoading: false,
    error: null,

    setUser: (user) => set({ user, error: null }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    clearUser: () => set({ user: null, error: null }),
    
    hasPermission: (moduleId) => {
      const { user } = get();
      if (!user?.permissions) {
        console.log(`权限检查失败 - 用户: ${user?.username}, 模块: ${moduleId}, 原因: 无权限数据`);
        return false;
      }
      
      const permission = user.permissions.find(p => p.moduleId === moduleId);
      const hasAccess = permission?.canAccess || false;
      // 调试信息 - 只在开发环境显示
      if (process.env.NODE_ENV === 'development') {
        console.log(`权限检查 - 用户: ${user.username}, 模块: ${moduleId}, 权限: ${hasAccess}`);
      }
      return hasAccess;
    },

    hasAnyPermission: (moduleIds) => {
      const { user } = get();
      if (!user?.permissions) return false;
      
      return moduleIds.some(moduleId => {
        const permission = user.permissions.find(p => p.moduleId === moduleId);
        return permission?.canAccess || false;
      });
    },

    isAdmin: () => {
      const { user } = get();
      return user?.isAdmin || false;
    },

        fetchUser: async (forceRefresh = false) => {
      const { isLoading } = get();
      
      // 防止重复请求
      if (isLoading && !forceRefresh) {
        return;
      }
      
      set({ isLoading: true, error: null });
      
      try {
        const session = await getNextAuthSession();
        if (!session?.user) {
          throw new Error('未登录');
        }

        // 直接从session中获取用户信息和权限
        // 调试信息 - 只在开发环境显示
        if (process.env.NODE_ENV === 'development') {
          console.log('Session原始权限数据:', session.user.permissions);
          console.log('权限数据类型:', typeof session.user.permissions);
          console.log('权限数据长度:', session.user.permissions?.length);
          if (session.user.permissions?.length > 0) {
            console.log('第一个权限项:', session.user.permissions[0]);
            console.log('第一个权限项类型:', typeof session.user.permissions[0]);
          }
        }
        
        // 将权限数据转换为Permission[]格式
        let permissions: Permission[] = [];
        
        if (session.user.permissions) {
          if (Array.isArray(session.user.permissions)) {
            // 检查数组元素是字符串还是对象
            if (session.user.permissions.length > 0 && typeof session.user.permissions[0] === 'string') {
              // 字符串数组格式
              permissions = session.user.permissions.map((moduleId: string) => ({
                id: `session-${moduleId}`,
                moduleId: moduleId,
                canAccess: true
              }));
            } else {
              // 对象数组格式，直接使用
              permissions = session.user.permissions.map((perm: any) => ({
                id: perm.id || `session-${perm.moduleId}`,
                moduleId: perm.moduleId,
                canAccess: !!perm.canAccess
              }));
            }
          } else if (typeof session.user.permissions === 'object') {
            // 对象格式，转换为数组
            permissions = Object.entries(session.user.permissions).map(([moduleId, canAccess]) => ({
              id: `session-${moduleId}`,
              moduleId: moduleId,
              canAccess: !!canAccess
            }));
          }
        }
        
        // 调试信息 - 只在开发环境显示
        if (process.env.NODE_ENV === 'development') {
          console.log('转换后的权限数据:', permissions);
          console.log('获取用户权限数据:', {
            sessionUser: session.user.username,
            sessionPermissions: session.user.permissions,
            convertedPermissions: permissions
          });
        }

        const userData = {
          id: session.user.id || '',
          username: session.user.username || session.user.name || '',
          email: session.user.email || null,
          status: true,
          isAdmin: session.user.isAdmin || false,
          permissions: permissions
        };

        set({ user: userData, isLoading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '获取用户信息失败';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    // 强制刷新权限 - 重新登录以获取最新权限
    forceRefreshPermissions: async () => {
      try {
        // 清除当前用户数据
        set({ user: null, isLoading: true, error: null });
        
        // 强制刷新session
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const sessionData = await response.json();
          if (sessionData.user) {
            // 重新获取用户权限
            await get().fetchUser(true);
          }
        }
      } catch (error) {
        console.error('强制刷新权限失败:', error);
        throw error;
      }
    }
  })
);

// 权限检查工具函数
export const checkPermission = (moduleId: string): boolean => {
  return usePermissionStore.getState().hasPermission(moduleId);
};

export const checkAnyPermission = (moduleIds: string[]): boolean => {
  return usePermissionStore.getState().hasAnyPermission(moduleIds);
};

export const isUserAdmin = (): boolean => {
  return usePermissionStore.getState().isAdmin();
};

// 权限验证工具函数
export const validatePermissions = {
  // 完整权限验证 - 用于管理员页面
  async validateAdmin(): Promise<boolean> {
    const { user, fetchUser } = usePermissionStore.getState();
    
    if (!user) {
      await fetchUser();
      return usePermissionStore.getState().isAdmin();
    }
    
    return user.isAdmin;
  },

  // 快速权限验证 - 用于业务页面
  validateBusiness(moduleId: string): boolean {
    const { user, hasPermission } = usePermissionStore.getState();
    return user ? hasPermission(moduleId) : false;
  },

  // 权限缓存预加载
  async preloadPermissions(): Promise<void> {
    const { user, fetchUser } = usePermissionStore.getState();
    if (!user) {
      try {
        await fetchUser();
      } catch (error) {
        // 静默处理预加载错误
      }
    }
  }
};

// 模块权限映射
export const MODULE_PERMISSIONS = {
  // 新建单据模块
  quotation: 'quotation',
  confirmation: 'quotation', // 销售确认使用报价单权限
  invoice: 'invoice',
  purchase: 'purchase',
  packing: 'packing',
  
  // 管理中心模块
  history: 'history',
  customer: 'customer',
  
  // 实用工具模块
  'ai-email': 'ai-email',
  'date-tools': 'date-tools',
  feature5: 'feature5',
  feature3: 'feature3',
  feature8: 'feature8',
  feature7: 'feature7',
  feature6: 'feature6',
  feature9: 'feature9'
} as const;

// 权限组
export const PERMISSION_GROUPS = {
  QUICK_CREATE: ['quotation', 'invoice', 'purchase', 'packing'],
  MANAGEMENT: ['history', 'customer'],
  TOOLS: ['ai-email', 'date-tools', 'feature5', 'feature3', 'feature8', 'feature7', 'feature6', 'feature9']
} as const; 