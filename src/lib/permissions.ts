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
  
  // ✅ 新增：从Session初始化用户信息
  setUserFromSession: (sessionUser: any) => void;
  
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
  clearUser: () => {
    // ✅ 清理Store状态
    set({ user: null, error: null, isLoading: false, lastFetchTime: null });
    
    // ✅ 清理本地缓存
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('userCache');
        localStorage.removeItem('user_permissions');
        localStorage.removeItem('latestPermissions');
        localStorage.removeItem('permissionsTimestamp');
        console.log('已清理所有权限相关缓存');
      } catch (error) {
        console.error('清理缓存失败:', error);
      }
    }
  },
  setAutoFetch: (autoFetch: boolean) => set({ autoFetch }),

  // ✅ 新增：从Session初始化用户信息（登录时调用）
  setUserFromSession: (sessionUser: any) => {
    if (!sessionUser) return;
    
    // 防重复初始化：检查是否已经初始化过相同的用户
    const currentUser = get().user;
    if (currentUser && currentUser.id === (sessionUser.id || sessionUser.username)) {
      // ✅ 修复：即使用户已存在，也要检查权限数据是否需要更新
      const sessionPermissions = sessionUser.permissions || [];
      const currentPermissions = currentUser.permissions || [];
      
      // 如果Session中的权限数据与Store中的不一致，强制更新
      if (sessionPermissions.length !== currentPermissions.length || 
          JSON.stringify(sessionPermissions) !== JSON.stringify(currentPermissions)) {
        logPermission('检测到权限数据不一致，强制更新', {
          sessionPermissionsCount: sessionPermissions.length,
          storePermissionsCount: currentPermissions.length,
          userId: sessionUser.id || sessionUser.username
        });
      } else {
        logPermission('用户已初始化，跳过重复初始化', {
          userId: currentUser.id,
          username: currentUser.username
        });
        return;
      }
    }
    
    try {
      // 构建用户对象
      const user: User = {
        id: sessionUser.id || sessionUser.username || '',
        username: sessionUser.username || sessionUser.name || '',
        email: sessionUser.email || null,
        status: sessionUser.status !== false, // 默认为true
        isAdmin: !!sessionUser.isAdmin,
        permissions: Array.isArray(sessionUser.permissions) ? sessionUser.permissions : []
      };
      
      // 更新Store
      set({ user, isLoading: false, error: null, lastFetchTime: Date.now() });
      
      // ✅ 立即保存到本地缓存
      if (typeof window !== 'undefined') {
        try {
          const cacheData = {
            ...user,
            timestamp: Date.now()
          };
          localStorage.setItem('userCache', JSON.stringify(cacheData));
          logPermission('登录时初始化用户信息并缓存', {
            userId: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            permissionsCount: user.permissions.length
          });
        } catch (error) {
          logPermissionError('保存用户信息到本地缓存失败', error);
        }
      }
    } catch (error) {
      logPermissionError('从Session初始化用户信息失败', error);
    }
  },

  // 新增：缓存清理机制
  clearExpiredCache: () => {
    if (typeof window !== 'undefined') {
      try {
        const userCache = localStorage.getItem('userCache');
        if (userCache) {
          const cacheData = JSON.parse(userCache);
          // 检查是否超过24小时
          if (cacheData.timestamp && (Date.now() - cacheData.timestamp) > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('userCache');
            logPermission('清理过期缓存', { timestamp: cacheData.timestamp });
          }
        }
      } catch (error) {
        console.warn('清理缓存失败:', error);
        // 清除损坏的缓存
        localStorage.removeItem('userCache');
      }
    }
  },

  // 初始化用户信息 - 从本地存储恢复（优化版本）
  initializeUserFromStorage: () => {
    if (typeof window !== 'undefined') {
      try {
        const userCache = localStorage.getItem('userCache');
        
        if (userCache) {
          const cacheData = JSON.parse(userCache);
          
          // 检查缓存是否在24小时内
          const isRecent = cacheData.timestamp && (Date.now() - cacheData.timestamp) < 24 * 60 * 60 * 1000;
          
          if (isRecent) {
            // 从缓存数据构建用户对象
            const user: User = {
              id: cacheData.id,
              username: cacheData.username,
              email: cacheData.email,
              status: cacheData.status,
              isAdmin: cacheData.isAdmin,
              permissions: cacheData.permissions || []
            };
            
            set({ user, isLoading: false, error: null, lastFetchTime: Date.now() });
            logPermission('从本地缓存初始化用户信息', {
              userId: user.id,
              username: user.username,
              isAdmin: user.isAdmin,
              permissionsCount: user.permissions.length
            });
            return true;
          }
        }
      } catch (error) {
        logPermissionError('从本地存储初始化用户信息失败', error);
        // 清除损坏的缓存
        localStorage.removeItem('userCache');
      }
    }
    return false;
  },

  // 统一的权限检查逻辑（增强错误处理）
  hasPermission: (moduleId: string) => {
    const { user } = get();
    if (!user) return false;
    
    try {
      // 检查具体权限（管理员和普通用户使用相同的权限检查逻辑）
      if (!user.permissions) return false;
      const permission = user.permissions.find(p => p.moduleId === moduleId);
      const hasAccess = permission?.canAccess || false;
      
      // ✅ 添加调试日志：权限检查详情
      console.log(`权限检查 [${moduleId}]:`, {
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        permissionsCount: user.permissions.length,
        foundPermission: permission,
        hasAccess: hasAccess,
        allPermissions: user.permissions.map(p => ({ moduleId: p.moduleId, canAccess: p.canAccess }))
      });
      
      return hasAccess;
    } catch (error) {
      logPermissionError('权限检查失败', error, { moduleId });
      return false;
    }
  },

  hasAnyPermission: (moduleIds: string[]) => {
    const { user } = get();
    if (!user) return false;
    
    try {
      // 检查具体权限（管理员和普通用户使用相同的权限检查逻辑）
      if (!user.permissions) return false;
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
    
    // ✅ 修复：强制刷新时跳过本地缓存检查
    if (!forceRefresh) {
      if (typeof window !== 'undefined') {
        try {
          const userCache = localStorage.getItem('userCache');
          
          if (userCache) {
            const cacheData = JSON.parse(userCache);
            const isRecent = cacheData.timestamp && (Date.now() - cacheData.timestamp) < 24 * 60 * 60 * 1000;
            
            if (isRecent) {
              const user: User = {
                id: cacheData.id,
                username: cacheData.username,
                email: cacheData.email,
                status: cacheData.status,
                isAdmin: cacheData.isAdmin,
                permissions: cacheData.permissions || []
              };
              
              set({ user, isLoading: false, error: null, lastFetchTime: Date.now() });
              logPermission('使用本地缓存的权限数据', {
                userId: user.id,
                username: user.username,
                isAdmin: user.isAdmin,
                permissionsCount: user.permissions.length
              });
              return;
            }
          }
        } catch (error) {
          logPermissionError('本地权限缓存读取失败', error);
          // 清除损坏的缓存
          localStorage.removeItem('userCache');
        }
      }
      
      // 如果没有本地缓存或缓存过期，但不强制刷新，则不获取权限
      logPermission('没有本地权限缓存，需要手动刷新权限', { forceRefresh });
      return;
    }
    
    // ✅ 强制刷新时，清除旧的缓存数据
    if (forceRefresh && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('userCache');
        logPermission('强制刷新：清除旧的本地缓存', { forceRefresh });
      } catch (error) {
        logPermissionError('清除本地缓存失败', error);
      }
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

      // 2. 优先使用session中的权限数据（仅在非强制刷新时）
      if (!forceRefresh && session.user.permissions && Array.isArray(session.user.permissions)) {
        const userData = {
          id: session.user.id || session.user.username || '',
          username: session.user.username || session.user.name || '',
          email: session.user.email || null,
          status: (session.user as any).status !== false,
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
            const cacheData = {
              ...userData,
              timestamp: Date.now()
            };
            localStorage.setItem('userCache', JSON.stringify(cacheData));
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
          status: (session.user as any).status !== false,
          isAdmin: session.user.isAdmin || false,
          permissions: permissions
        };

        // 6. 更新store并立即保存到本地存储
        set({ user, isLoading: false, error: null, lastFetchTime: Date.now() });
        
        // ✅ 立即保存权限数据到本地存储
        if (typeof window !== 'undefined') {
          try {
            const cacheData = {
              ...user,
              timestamp: Date.now()
            };
            localStorage.setItem('userCache', JSON.stringify(cacheData));
            logPermission('用户信息和权限数据已立即保存到本地存储', {
              userId: user.id,
              username: user.username,
              isAdmin: user.isAdmin,
              permissionsCount: permissions.length,
              forceRefresh: forceRefresh || false,
              permissions: permissions.map(p => ({ moduleId: p.moduleId, canAccess: p.canAccess }))
            });
            
            // ✅ 添加调试日志：检查权限数据是否正确
            console.log('权限刷新完成，最新权限数据:', {
              userId: user.id,
              username: user.username,
              isAdmin: user.isAdmin,
              permissions: permissions.map(p => ({ moduleId: p.moduleId, canAccess: p.canAccess })),
              quotationPermission: permissions.find(p => p.moduleId === 'quotation')?.canAccess
            });
          } catch (error) {
            logPermissionError('保存用户数据到本地存储失败', error);
          }
        }

        // ✅ 强制刷新时，触发权限更新事件
        if (forceRefresh) {
          logPermission('权限刷新完成，触发更新事件', {
            permissionsCount: permissions.length,
            permissions: permissions.map(p => ({ moduleId: p.moduleId, canAccess: p.canAccess }))
          });
          
          // ✅ 修复：强制刷新后，需要同步更新Session
          try {
            const sessionUpdateResponse = await fetch('/api/auth/force-refresh-session', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                username: session.user.username || session.user.name || ''
              }),
              cache: 'no-store'
            });

            if (sessionUpdateResponse.ok) {
              const sessionUpdateData = await sessionUpdateResponse.json();
              logPermission('权限刷新API响应', {
                success: sessionUpdateData.success,
                message: sessionUpdateData.message,
                tokenNeedsRefresh: sessionUpdateData.tokenNeedsRefresh,
                permissionsChanged: sessionUpdateData.debug?.permissionsChanged
              });
              
              // ✅ 如果权限有变化，执行silent-refresh
              if (sessionUpdateData.tokenNeedsRefresh) {
                logPermission('权限已变化，执行silent-refresh');
                
                // ✅ 清理所有缓存
                if (typeof window !== 'undefined') {
                  try {
                    localStorage.removeItem('userCache');
                    localStorage.removeItem('user_permissions');
                    localStorage.removeItem('latestPermissions');
                    localStorage.removeItem('permissionsTimestamp');
                    console.log('已清理所有权限相关缓存');
                  } catch (error) {
                    console.error('清理缓存失败:', error);
                  }
                }
                
                // ✅ 触发silent-refresh事件
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('silentRefreshPermissions', {
                    detail: {
                      message: '权限已更新，执行silent-refresh',
                      requiresRelogin: false,
                      permissions: permissions,
                      silentRefresh: true,
                      username: session.user.username || session.user.name
                    }
                  }));
                }
              } else {
                logPermission('权限无变化，跳过silent-refresh');
                
                // ✅ 即使权限无变化，也要更新Store中的权限数据
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('permissionsUpdated', {
                    detail: {
                      message: '权限数据已同步',
                      requiresRelogin: false,
                      permissions: permissions
                    }
                  }));
                }
              }
            } else {
              logPermission('权限刷新API失败', { 
                status: sessionUpdateResponse.status,
                statusText: sessionUpdateResponse.statusText
              });
            }
          } catch (sessionUpdateError) {
            logPermissionError('权限刷新API请求失败', sessionUpdateError);
          }
          
          // 触发自定义事件，通知前端权限已更新
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('permissionsUpdated', {
              detail: {
                message: '权限已更新，需要调用 update() 同步 Session',
                requiresRelogin: false,
                permissions: permissions
              }
            }));
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

// ✅ 导出Session初始化函数
export const setUserFromSession = (sessionUser: any) => {
  return usePermissionStore.getState().setUserFromSession(sessionUser);
}; 