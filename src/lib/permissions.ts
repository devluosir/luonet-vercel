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
      if (!user?.permissions) return false;
      
      const permission = user.permissions.find(p => p.moduleId === moduleId);
      return permission?.canAccess || false;
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
        if (!session?.user?.email) {
          throw new Error('未登录');
        }

        const response = await apiRequestWithError(API_ENDPOINTS.USERS.ME, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response) {
          set({ user: response, isLoading: false });
        } else {
          throw new Error('获取用户信息失败');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '获取用户信息失败';
        set({ error: errorMessage, isLoading: false });
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