import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  lastFetched: number | null;
  error: string | null;
  permissionChanged: boolean; // 新增：权限变化标志
  
  // Actions
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
  setPermissionChanged: (changed: boolean) => void; // 新增
  
  // Permission checks
  hasPermission: (moduleId: string) => boolean;
  hasAnyPermission: (moduleIds: string[]) => boolean;
  isAdmin: () => boolean;
  
  // Fetch user data
  fetchUser: (forceRefresh?: boolean) => Promise<void>;
}

// 修改缓存时间为7天
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7天缓存

// 添加权限备份功能
const backupPermissions = (user: User | null) => {
  if (user) {
    localStorage.setItem('permissions_backup', JSON.stringify({
      user,
      timestamp: Date.now()
    }));
  }
};

export const usePermissionStore = create<PermissionStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      lastFetched: null,
      error: null,
      permissionChanged: false,

      setUser: (user) => {
        set({ user, lastFetched: Date.now(), error: null });
        backupPermissions(user); // 备份权限
      },
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearUser: () => {
        set({ user: null, lastFetched: null, error: null, permissionChanged: false });
        // 清除持久化数据
        if (typeof window !== 'undefined') {
          localStorage.removeItem('permission-store');
          localStorage.removeItem('permissions_backup');
        }
      },
      setPermissionChanged: (changed) => set({ permissionChanged: changed }), // 新增

      hasPermission: (moduleId) => {
        const { user } = get();
        if (!user?.permissions) {
          console.log('🔍 hasPermission:', moduleId, '用户无权限数据');
          return false;
        }
        
        const permission = user.permissions.find(p => p.moduleId === moduleId);
        const hasAccess = permission?.canAccess || false;
        console.log('🔍 hasPermission:', moduleId, hasAccess, '用户权限:', user.permissions.map(p => `${p.moduleId}:${p.canAccess}`));
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
        const { lastFetched, user, permissionChanged } = get();
        
        console.log('🔍 fetchUser 调用:', { forceRefresh, user: !!user, lastFetched, permissionChanged });
        
        // 智能刷新策略 - 重新登录时强制刷新
        const shouldRefresh = forceRefresh || 
          !user || 
          !lastFetched || 
          permissionChanged ||
          (Date.now() - lastFetched > CACHE_DURATION);
        
        console.log('🔍 是否需要刷新:', shouldRefresh, { forceRefresh, noUser: !user, noLastFetched: !lastFetched, permissionChanged, cacheExpired: lastFetched ? (Date.now() - lastFetched > CACHE_DURATION) : false });
        
        // 如果不需要刷新且不是强制刷新，尝试从备份恢复
        if (!shouldRefresh && !forceRefresh) {
          try {
            const backup = localStorage.getItem('permissions_backup');
            if (backup) {
              const { user: backupUser, timestamp } = JSON.parse(backup);
              // 检查备份是否在有效期内
              if (Date.now() - timestamp < CACHE_DURATION) {
                console.log('🔍 使用备份数据:', backupUser.username, '权限数量:', backupUser.permissions?.length);
                set({ user: backupUser, lastFetched: timestamp });
                return;
              }
            }
          } catch (error) {
            console.error('Error loading permissions backup:', error);
          }
          console.log('🔍 使用当前缓存数据');
          return; // 使用当前缓存数据
        }

        // 强制刷新时清除所有缓存
        if (forceRefresh) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('permissions_backup');
            console.log('🔍 强制刷新，清除备份缓存');
          }
        }

        set({ isLoading: true, error: null });

        try {
          console.log('🔍 开始获取用户数据...');
          const response = await fetch(`/api/users/me${forceRefresh ? '?force=true' : ''}`, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const userData = await response.json();
          console.log('🔍 获取到用户数据:', userData.username, '权限数量:', userData.permissions?.length);
          
          // 检测权限变化
          const currentUser = get().user;
          const permissionsChanged = currentUser && !forceRefresh && (
            currentUser.permissions.length !== userData.permissions.length ||
            JSON.stringify(currentUser.permissions) !== JSON.stringify(userData.permissions)
          );
          
          set({ 
            user: userData, 
            lastFetched: Date.now(), 
            error: null,
            permissionChanged: permissionsChanged || false
          });
          
          // 备份新的权限数据
          backupPermissions(userData);
          console.log('🔍 权限数据已更新和备份');
          
          // 权限变化通知
          if (permissionsChanged && typeof window !== 'undefined') {
            // 显示通知
            const event = new CustomEvent('permissionChanged', {
              detail: { message: '检测到权限变化，请刷新页面以获取最新权限' }
            });
            window.dispatchEvent(event);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '获取用户信息失败';
          set({ error: errorMessage });
          console.error('🔍 fetchUser 错误:', error);
          console.error('🔍 错误详情:', error instanceof Error ? error.stack : error);
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'permission-store',
      partialize: (state) => ({
        user: state.user,
        lastFetched: state.lastFetched
      })
    }
  )
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
        const backup = localStorage.getItem('permissions_backup');
        if (backup) {
          const { user: backupUser, timestamp } = JSON.parse(backup);
          if (Date.now() - timestamp < CACHE_DURATION) {
            usePermissionStore.getState().setUser(backupUser);
            return;
          }
        }
        await fetchUser();
      } catch (error) {
        console.error('Error preloading permissions:', error);
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