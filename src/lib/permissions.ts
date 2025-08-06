import { create } from 'zustand';
import { getSession } from 'next-auth/react';
import { logPermission, logPermissionError } from '@/utils/permissionLogger';

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
  lastFetchTime: number | null;
  autoFetch: boolean;
  
  // 基础操作
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
  setAutoFetch: (autoFetch: boolean) => void;
  
  // 权限检查 - 统一接口
  hasPermission: (moduleId: string) => boolean;
  hasAnyPermission: (moduleIds: string[]) => boolean;
  isAdmin: () => boolean;
  
  // 权限获取 - 统一从API获取
  fetchPermissions: (forceRefresh?: boolean) => Promise<void>;
  
  // 初始化用户信息 - 从本地存储恢复
  initializeUserFromStorage: () => boolean;
  
  // 新增：缓存清理机制
  clearExpiredCache: () => void;
}

export const usePermissionStore = create<PermissionStore>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  lastFetchTime: null,
  autoFetch: false,

  setUser: (user: User) => set({ user }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  clearUser: () => set({ user: null, error: null }),
  setAutoFetch: (autoFetch: boolean) => set({ autoFetch }),

  // 新增：缓存清理机制
  clearExpiredCache: () => {
    if (typeof window !== 'undefined') {
      try {
        const timestamp = localStorage.getItem('permissionsTimestamp');
        if (timestamp && (Date.now() - parseInt(timestamp)) > 24 * 60 * 60 * 1000) {
          localStorage.removeItem('latestPermissions');
          localStorage.removeItem('permissionsTimestamp');
          localStorage.removeItem('userInfo');
          logPermission('清理过期缓存', { timestamp });
        }
      } catch (error) {
        console.warn('清理缓存失败:', error);
      }
    }
  },

  // 初始化用户信息 - 从本地存储恢复（增强错误处理）
  initializeUserFromStorage: () => {
    if (typeof window !== 'undefined') {
      try {
        const storedUserInfo = localStorage.getItem('userInfo');
        const storedPermissions = localStorage.getItem('latestPermissions');
        const permissionsTimestamp = localStorage.getItem('permissionsTimestamp');
        
        if (storedUserInfo && storedPermissions && permissionsTimestamp) {
          const userData = JSON.parse(storedUserInfo);
          const permissions = JSON.parse(storedPermissions);
          
          // 检查权限数据是否在24小时内
          const isRecent = (Date.now() - parseInt(permissionsTimestamp)) < 24 * 60 * 60 * 1000;
          
          if (isRecent) {
            userData.permissions = permissions;
            set({ user: userData, isLoading: false, error: null, lastFetchTime: Date.now() });
            logPermission('从本地存储初始化用户信息', {
              userId: userData.id,
              username: userData.username,
              isAdmin: userData.isAdmin,
              permissionsCount: userData.permissions.length
            });
            return true;
          }
        }
              } catch (error) {
          logPermissionError('从本地存储初始化用户信息失败', error);
          // 清除损坏的缓存
          localStorage.removeItem('latestPermissions');
          localStorage.removeItem('permissionsTimestamp');
          localStorage.removeItem('userInfo');
        }
    }
    return false;
  },

  // 统一的权限检查逻辑（增强错误处理）
  hasPermission: (moduleId: string) => {
    const { user } = get();
    if (!user?.permissions) return false;
    
    try {
      const permission = user.permissions.find(p => p.moduleId === moduleId);
      return permission?.canAccess || false;
    } catch (error) {
      logPermissionError('权限检查失败', error, { moduleId });
      return false;
    }
  },

  hasAnyPermission: (moduleIds: string[]) => {
    const { user } = get();
    if (!user?.permissions) return false;
    
    try {
      return moduleIds.some(moduleId => {
        const permission = user.permissions.find(p => p.moduleId === moduleId);
        return permission?.canAccess || false;
      });
    } catch (error) {
      logPermissionError('权限检查失败', error, { moduleIds });
      return false;
    }
  },

  isAdmin: () => {
    const { user } = get();
    return user?.isAdmin || false;
  },

  // 权限获取 - 支持本地缓存（添加防重复机制）
  fetchPermissions: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    
    // 防重复：60秒内不重复请求
    if (!forceRefresh && state.lastFetchTime && (now - state.lastFetchTime) < 60000) {
      logPermission('权限获取过于频繁，跳过请求', { 
        lastFetchTime: state.lastFetchTime,
        timeDiff: now - state.lastFetchTime 
      });
      return;
    }
    
    // 防重复：正在加载时跳过
    if (state.isLoading) {
      logPermission('权限获取中，跳过重复请求', { isLoading: state.isLoading });
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
              // 优先使用本地存储的用户信息，确保用户信息一致性
              let userData;
              try {
                const storedUserInfo = localStorage.getItem('userInfo');
                if (storedUserInfo) {
                  userData = JSON.parse(storedUserInfo);
                  // 更新权限数据，但保持用户基本信息不变
                  userData.permissions = permissions;
                } else {
                  // 如果没有本地用户信息，使用session数据
                  userData = {
                    id: session.user.id || session.user.username || '',
                    username: session.user.username || session.user.name || '',
                    email: session.user.email || null,
                    status: true,
                    isAdmin: session.user.isAdmin || false,
                    permissions: permissions
                  };
                }
              } catch (error) {
                logPermissionError('读取本地用户信息失败，使用session数据', error);
                userData = {
                  id: session.user.id || session.user.username || '',
                  username: session.user.username || session.user.name || '',
                  email: session.user.email || null,
                  status: true,
                  isAdmin: session.user.isAdmin || false,
                  permissions: permissions
                };
              }
              
              set({ user: userData, isLoading: false, error: null, lastFetchTime: Date.now() });
              logPermission('使用本地缓存的权限数据', {
                userId: userData.id,
                username: userData.username,
                isAdmin: userData.isAdmin,
                permissionsCount: userData.permissions.length
              });
              return;
            }
          }
        } catch (error) {
          logPermissionError('本地权限缓存读取失败', error);
          // 清除损坏的缓存
          localStorage.removeItem('latestPermissions');
          localStorage.removeItem('permissionsTimestamp');
        }
      }
      
      // 如果没有本地缓存或缓存过期，但不强制刷新，则不获取权限
      logPermission('没有本地权限缓存，需要手动刷新权限', { forceRefresh });
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

      logPermission('开始获取权限', {
        userId: session.user.id,
        username: session.user.username,
        isAdmin: session.user.isAdmin
      });

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
        
        logPermission('使用session中的权限数据', {
          userId: userData.id,
          username: userData.username,
          isAdmin: userData.isAdmin,
          permissionsCount: userData.permissions.length
        });
        
        set({ user: userData, isLoading: false, error: null, lastFetchTime: Date.now() });
        
        // 保存到本地存储，确保用户信息持久化
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('userInfo', JSON.stringify(userData));
            localStorage.setItem('latestPermissions', JSON.stringify(session.user.permissions));
            localStorage.setItem('permissionsTimestamp', Date.now().toString());
            logPermission('用户信息和权限数据已保存到本地存储', {});
          } catch (error) {
            logPermissionError('保存用户信息到本地存储失败', error);
          }
        }
        
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
        logPermission('获取权限失败，使用现有权限数据', { status: response.status });
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
            // 同时保存用户基本信息
            localStorage.setItem('userInfo', JSON.stringify(user));
            logPermission('用户信息和权限数据已保存到本地存储', {
              userId: user.id,
              username: user.username,
              isAdmin: user.isAdmin,
              permissionsCount: permissions.length
            });
          } catch (error) {
            logPermissionError('保存用户数据到本地存储失败', error);
          }
        }
      } else {
        // 如果API返回失败，保留现有用户数据
        logPermission('权限API返回失败，使用现有权限数据', { data });
        set({ isLoading: false, error: null });
      }
          } catch (error) {
        // 网络错误或其他异常，保留现有用户数据
        logPermissionError('权限获取异常，使用现有权限数据', error);
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
  await usePermissionStore.getState().fetchPermissions(true);
};

// 导出初始化函数
export const initializeUserFromStorage = () => {
  return usePermissionStore.getState().initializeUserFromStorage();
}; 