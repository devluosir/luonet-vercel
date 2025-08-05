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
  autoFetch: boolean; // 添加自动获取控制
  
  // 基础操作
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
  setAutoFetch: (autoFetch: boolean) => void; // 添加设置自动获取的方法
  
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
  autoFetch: false, // 默认不自动获取

  setUser: (user: User) => set({ user }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  clearUser: () => set({ user: null, error: null }),
  setAutoFetch: (autoFetch: boolean) => set({ autoFetch }),

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

  // 权限获取 - 支持本地缓存
  fetchPermissions: async (forceRefresh = false) => {
    const state = get();
    
    // 防止重复请求
    if (state.isLoading) {
      return;
    }
    
    // 如果不是强制刷新，优先使用本地缓存的权限数据
    if (!forceRefresh) {
      if (typeof window !== 'undefined') {
        try {
          const storedPermissions = localStorage.getItem('latestPermissions');
          const permissionsTimestamp = localStorage.getItem('permissionsTimestamp');
          
          // 检查权限数据是否在24小时内
          const isRecent = permissionsTimestamp && (Date.now() - parseInt(permissionsTimestamp)) < 24 * 60 * 60 * 1000;
          
          if (storedPermissions && isRecent) {
            const permissions = JSON.parse(storedPermissions);
            const session = await getSession();
            
            if (session?.user) {
              const userData = {
                id: session.user.id || session.user.username || '',
                username: session.user.username || session.user.name || '',
                email: session.user.email || null,
                status: true,
                isAdmin: session.user.isAdmin || false,
                permissions: permissions
              };
              
              set({ user: userData, isLoading: false, error: null, lastFetchTime: Date.now() });
              console.log('使用本地缓存的权限数据');
              return;
            }
          }
        } catch (error) {
          console.warn('本地权限缓存读取失败:', error);
          // 清除损坏的缓存
          localStorage.removeItem('latestPermissions');
          localStorage.removeItem('permissionsTimestamp');
        }
      }
      
      // 如果没有本地缓存或缓存过期，但不强制刷新，则不获取权限
      console.log('没有本地权限缓存，需要手动刷新权限');
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // 1. 获取session信息
      const session = await getSession();
      if (!session?.user) {
        // 如果没有session，清除用户数据但不抛出错误
        set({ user: null, isLoading: false, error: null });
        return;
      }

      // 2. 优先使用session中的权限数据
      if (session.user.permissions && Array.isArray(session.user.permissions)) {
        const userData = {
          id: session.user.id || session.user.username || '',
          username: session.user.username || session.user.name || '',
          email: session.user.email || null,
          status: true,
          isAdmin: session.user.isAdmin || false,
          permissions: session.user.permissions
        };
        
        set({ user: userData, isLoading: false, error: null, lastFetchTime: Date.now() });
        return;
      }

      // 3. 如果session中没有权限数据，才从API获取
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
        // 如果API请求失败，保留现有用户数据，不抛出错误
        console.warn('获取权限失败，使用现有权限数据');
        set({ isLoading: false, error: null });
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        // 4. 统一处理权限数据格式
        const permissions: Permission[] = data.permissions.map((perm: any) => ({
          id: perm.id || `api-${perm.moduleId}`,
          moduleId: perm.moduleId,
          canAccess: !!perm.canAccess
        }));

        // 5. 创建用户对象
        const user: User = {
          id: session.user.id || session.user.username || '',
          username: session.user.username || session.user.name || '',
          email: session.user.email || null,
          status: true,
          isAdmin: session.user.isAdmin || false,
          permissions: permissions
        };

        // 6. 更新store并保存到本地存储
        set({ user, isLoading: false, error: null, lastFetchTime: Date.now() });
        
        // 保存权限数据到本地存储
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('latestPermissions', JSON.stringify(permissions));
            localStorage.setItem('permissionsTimestamp', Date.now().toString());
            console.log('权限数据已保存到本地存储');
          } catch (error) {
            console.warn('保存权限数据到本地存储失败:', error);
          }
        }
      } else {
        // 如果API返回失败，保留现有用户数据
        console.warn('权限API返回失败，使用现有权限数据');
        set({ isLoading: false, error: null });
      }
    } catch (error) {
      // 网络错误或其他异常，保留现有用户数据
      console.warn('权限获取异常，使用现有权限数据:', error);
      set({ isLoading: false, error: null });
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