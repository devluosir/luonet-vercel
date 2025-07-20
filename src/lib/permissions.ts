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

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时缓存，权限变化不频繁

export const usePermissionStore = create<PermissionStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      lastFetched: null,
      error: null,
      permissionChanged: false, // 初始化权限变化标志

      setUser: (user) => set({ user, lastFetched: Date.now(), error: null }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearUser: () => set({ user: null, lastFetched: null, error: null }),
      setPermissionChanged: (changed) => set({ permissionChanged: changed }), // 新增

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
        const { lastFetched, user } = get();
        
        // 智能刷新策略：
        // 1. 强制刷新：管理员修改权限后
        // 2. 首次加载：用户刚登录
        // 3. 长时间未刷新：超过24小时
        // 4. 用户主动刷新：点击刷新按钮
        
        const shouldRefresh = forceRefresh || 
          !user || 
          !lastFetched || 
          (Date.now() - lastFetched > CACHE_DURATION);
        
        if (!shouldRefresh) {
          return; // 使用缓存数据
        }

        set({ isLoading: true, error: null });

        try {
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
          
          // 检测权限变化（只在非主动刷新的情况下）
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
          
          // 只在非主动刷新的情况下显示权限变化通知
          if (permissionsChanged && typeof window !== 'undefined') {
            console.log('🔔 检测到权限变化，请刷新页面以获取最新权限');
            // 可以在这里添加用户通知
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '获取用户信息失败';
          set({ error: errorMessage });
          console.error('Error fetching user:', error);
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