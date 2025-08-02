import { create } from 'zustand';
import { getSession } from 'next-auth/react';

// 权限接口
interface Permission {
  id: string;
  moduleId: string;
  canAccess: boolean;
}

// 用户接口
interface User {
  id: string;
  username: string;
  email: string | null;
  status: boolean;
  isAdmin: boolean;
  permissions: Permission[];
}

// 权限存储接口
interface PermissionStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // 基础操作
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
  
  // 权限检查
  hasPermission: (moduleId: string) => boolean;
  hasAnyPermission: (moduleIds: string[]) => boolean;
  isAdmin: () => boolean;
  
  // 获取用户数据
  fetchUser: () => Promise<void>;
  
  // 刷新权限
  refreshPermissions: () => Promise<void>;
}

// 创建权限存储
export const usePermissionStore = create<PermissionStore>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user: User) => set({ user }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  clearUser: () => set({ user: null, error: null }),

  hasPermission: (moduleId: string) => {
    const { user } = get();
    if (!user?.permissions) return false;
    
    const permission = user.permissions.find(p => p.moduleId === moduleId);
    return permission?.canAccess || false;
  },

  hasAnyPermission: (moduleIds: string[]) => {
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

  fetchUser: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const session = await getSession();
      
      if (!session?.user) {
        throw new Error('未登录');
      }

      // 转换权限数据
      let permissions: Permission[] = [];
      
      if (session.user.permissions) {
        if (Array.isArray(session.user.permissions)) {
          if (session.user.permissions.length > 0 && typeof session.user.permissions[0] === 'string') {
            // 字符串数组格式
            permissions = session.user.permissions.map(moduleId => ({
              id: `session-${moduleId}`,
              moduleId: moduleId,
              canAccess: true
            }));
          } else {
            // 对象数组格式
            permissions = session.user.permissions.map((perm: any) => ({
              id: perm.id || `session-${perm.moduleId}`,
              moduleId: perm.moduleId,
              canAccess: !!perm.canAccess
            }));
          }
        } else if (typeof session.user.permissions === 'object') {
          // 对象格式
          permissions = Object.entries(session.user.permissions).map(([moduleId, canAccess]) => ({
            id: `session-${moduleId}`,
            moduleId: moduleId,
            canAccess: !!canAccess
          }));
        }
      }

      const userData: User = {
        id: session.user.id || '',
        username: session.user.username || session.user.name || '',
        email: session.user.email || null,
        status: true,
        isAdmin: session.user.isAdmin || false,
        permissions: permissions
      };

      set({ user: userData, isLoading: false });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('获取用户权限成功:', {
          username: userData.username,
          permissions: userData.permissions,
          isAdmin: userData.isAdmin
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取用户信息失败';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  refreshPermissions: async () => {
    try {
      // 清除当前用户数据
      set({ user: null, isLoading: true, error: null });
      
      // 重新获取用户权限
      await get().fetchUser();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('权限刷新成功');
      }
    } catch (error) {
      console.error('权限刷新失败:', error);
      throw error;
    }
  }
}));

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

// 权限验证工具
export const validatePermissions = {
  async validateAdmin(): Promise<boolean> {
    return usePermissionStore.getState().isAdmin();
  },

  validateBusiness(moduleId: string): boolean {
    return usePermissionStore.getState().hasPermission(moduleId);
  },

  async preloadPermissions(): Promise<void> {
    await usePermissionStore.getState().fetchUser();
  },

  initAdminPermissionListener(): void {
    // 简化版本，不需要复杂的监听器
    console.log('权限监听器已初始化');
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