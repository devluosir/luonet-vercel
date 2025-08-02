import { create } from 'zustand';
import { getSession } from 'next-auth/react';

// 统一的权限数据格式
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
  lastFetchTime: number | null; // 添加最后获取时间
  
  // 基础操作
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
  
  // 权限检查 - 统一接口
  hasPermission: (moduleId: string) => boolean;
  hasAnyPermission: (moduleIds: string[]) => boolean;
  isAdmin: () => boolean;
  
  // 权限获取 - 统一从API获取
  fetchPermissions: (forceRefresh?: boolean) => Promise<void>;
}

export const usePermissionStore = create<PermissionStore>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  lastFetchTime: null,

  setUser: (user: User) => set({ user }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  clearUser: () => set({ user: null, error: null }),

  // 统一的权限检查逻辑
  hasPermission: (moduleId: string) => {
    const { user } = get();
    if (!user?.permissions) return false;
    
    const permission = user.permissions.find(p => p.moduleId === moduleId);
    const hasAccess = permission?.canAccess || false;
    

    
    return hasAccess;
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

  // 统一的权限获取逻辑 - 只从API获取
  fetchPermissions: async (forceRefresh = false) => {
    const state = get();
    
    // 防止重复请求
    if (state.isLoading) {
      return;
    }
    
    // 检查缓存时间（30分钟内不重复获取）
    const CACHE_DURATION = 30 * 60 * 1000; // 30分钟
    const now = Date.now();
    
    if (!forceRefresh && 
        state.user && 
        state.lastFetchTime && 
        (now - state.lastFetchTime) < CACHE_DURATION) {
      // 使用缓存的权限数据
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // 1. 获取session信息
      const session = await getSession();
      if (!session?.user) {
        throw new Error('未登录');
      }

      // 2. 从API获取最新权限
      const response = await fetch('/api/auth/get-latest-permissions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-ID': session.user.id || session.user.username || '',
          'X-User-Name': session.user.username || session.user.name || '',
          'X-User-Admin': session.user.isAdmin ? 'true' : 'false'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('获取权限失败');
      }

      const data = await response.json();
      
      if (data.success) {
        // 3. 统一处理权限数据格式
        const permissions: Permission[] = data.permissions.map((perm: any) => ({
          id: perm.id || `api-${perm.moduleId}`,
          moduleId: perm.moduleId,
          canAccess: !!perm.canAccess
        }));

        // 4. 创建用户对象
        const user: User = {
          id: session.user.id || session.user.username || '',
          username: session.user.username || session.user.name || '',
          email: session.user.email || null,
          status: true,
          isAdmin: session.user.isAdmin || false,
          permissions: permissions
        };

        // 5. 更新store
        set({ user, isLoading: false, error: null, lastFetchTime: now });
      } else {
        throw new Error(data.error || '获取权限失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取权限失败';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  }
}));

// 导出统一的权限检查函数
export const hasPermission = (moduleId: string): boolean => {
  return usePermissionStore.getState().hasPermission(moduleId);
};

export const hasAnyPermission = (moduleIds: string[]): boolean => {
  return usePermissionStore.getState().hasAnyPermission(moduleIds);
};

export const isUserAdmin = (): boolean => {
  return usePermissionStore.getState().isAdmin();
};

// 兼容性函数 - 保持向后兼容
export const fetchUser = async () => {
  await usePermissionStore.getState().fetchPermissions();
};

export const refreshPermissions = async () => {
  await usePermissionStore.getState().fetchPermissions();
}; 