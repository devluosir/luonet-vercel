import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  lastFetched: number | null;
  error: string | null;
  permissionChanged: boolean; // 新增：权限变化标志
  isInitialized: boolean; // 新增：初始化标志
  isFirstLoad: boolean; // 新增：首次加载标志
  
  // Actions
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
      setPermissionChanged: (changed: boolean) => void; // 新增
    setInitialized: (initialized: boolean) => void; // 新增
    setFirstLoad: (firstLoad: boolean) => void; // 新增
    clearAllCache: () => void; // 新增
  
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
      isInitialized: false,
      isFirstLoad: true, // 新增：首次加载标志

      setUser: (user) => {
        set({ user, lastFetched: Date.now(), error: null });
        backupPermissions(user); // 备份权限
      },
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearUser: () => {
        set({ user: null, lastFetched: null, error: null, permissionChanged: false, isFirstLoad: true });
        // 清除持久化数据
        if (typeof window !== 'undefined') {
          localStorage.removeItem('permission-store');
          localStorage.removeItem('permissions_backup');
        }
      },
      setPermissionChanged: (changed) => set({ permissionChanged: changed }), // 新增
      setInitialized: (initialized) => set({ isInitialized: initialized }), // 新增
      setFirstLoad: (firstLoad) => set({ isFirstLoad: firstLoad }), // 新增
      
      // 清除所有权限缓存
      clearAllCache: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('permission-store');
          localStorage.removeItem('permissions_backup');
          console.log('清除所有权限缓存');
        }
      },

      hasPermission: (moduleId) => {
        const { user } = get();
        if (!user?.permissions) {
          return false;
        }
        
        const permission = user.permissions.find(p => p.moduleId === moduleId);
        const hasAccess = permission?.canAccess || false;
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
        const { lastFetched, user, permissionChanged, isFirstLoad, isLoading } = get();
        
        // 防止重复请求
        if (isLoading && !forceRefresh) {
          return;
        }
        
        // 智能刷新策略 - 重新登录时强制刷新
        const shouldRefresh = forceRefresh || 
          !user || 
          !lastFetched || 
          permissionChanged ||
          (Date.now() - lastFetched > CACHE_DURATION);
        
        console.log('权限获取检查:', {
          forceRefresh,
          hasUser: !!user,
          lastFetched,
          permissionChanged,
          shouldRefresh
        });
        
        // 如果不需要刷新且不是强制刷新，尝试从备份恢复
        if (!shouldRefresh && !forceRefresh) {
          try {
            const backup = localStorage.getItem('permissions_backup');
            if (backup) {
              const { user: backupUser, timestamp } = JSON.parse(backup);
              // 检查备份是否在有效期内
              if (Date.now() - timestamp < CACHE_DURATION) {
                set({ user: backupUser, lastFetched: timestamp });
                return;
              }
            }
          } catch (error) {
            console.error('Error loading permissions backup:', error);
          }
          return; // 使用当前缓存数据
        }

        // 强制刷新时清除所有缓存
        if (forceRefresh) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('permissions_backup');
            localStorage.removeItem('permission-store'); // 清除Zustand持久化数据
            console.log('强制刷新：清除所有权限缓存');
          }
        }

        set({ isLoading: true, error: null });

        try {
          // 从远程 API 获取数据
          console.log('🔄 从远程 API 获取权限数据...');
          
          // 添加超时控制，避免长时间等待
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

          console.log('开始API调用:', `${API_ENDPOINTS.USERS.ME}${forceRefresh ? '?force=true' : ''}`);
          
          // 强制刷新时，直接从API获取最新数据，不使用session缓存
          if (forceRefresh) {
            console.log('强制刷新：跳过session缓存，直接从API获取最新权限数据');
          } else {
            // 非强制刷新时，首先尝试获取NextAuth session
            const session = await getNextAuthSession();
            console.log('NextAuth session:', session);
            
            // 如果session存在，使用session中的用户信息
            if (session && session.user) {
              console.log('使用NextAuth session中的用户信息');
              console.log('Session权限数据:', session.user.permissions);
              
              // 确保权限数据格式正确
              let permissions = session.user.permissions || [];
              if (Array.isArray(permissions) && permissions.length > 0) {
                // 如果权限数据是字符串数组（moduleId），转换为对象格式
                if (typeof permissions[0] === 'string') {
                  console.log('转换权限数据格式从字符串数组到对象数组');
                  permissions = permissions.map(moduleId => ({
                    id: `session-${moduleId}`,
                    moduleId: moduleId,
                    canAccess: true
                  }));
                }
              }
              
              const userData = {
                id: session.user.id || session.user.sub,
                username: session.user.username || session.user.name,
                email: session.user.email,
                status: true,
                isAdmin: session.user.isAdmin || false,
                permissions: permissions
              };
              
              set({ 
                user: userData, 
                lastFetched: Date.now(), 
                error: null,
                permissionChanged: false,
                isFirstLoad: false
              });
              
              backupPermissions(userData);
              console.log('✅ 成功从NextAuth session获取用户数据');
              return;
            }
          }
          
          // 如果session不存在，尝试API调用
          console.log('NextAuth session不存在，尝试API调用');
          const userData = await apiRequestWithError(
            `${API_ENDPOINTS.USERS.ME}${forceRefresh ? '?force=true' : ''}`,
            {
              headers: {
                'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=300', // 非强制刷新时允许5分钟缓存
                'Pragma': forceRefresh ? 'no-cache' : ''
              },
              signal: controller.signal
            }
          );
          
          console.log('API响应数据:', userData);
          
          clearTimeout(timeoutId);
          
          // 检测权限变化 - 只在非首次加载且非强制刷新时检测
          const currentUser = get().user;
          const permissionsChanged = currentUser && !forceRefresh && !isFirstLoad && (
            currentUser.permissions.length !== userData.permissions.length ||
            JSON.stringify(currentUser.permissions) !== JSON.stringify(userData.permissions) ||
            currentUser.isAdmin !== userData.isAdmin
          );
          
          set({ 
            user: userData, 
            lastFetched: Date.now(), 
            error: null,
            permissionChanged: permissionsChanged || false,
            isFirstLoad: false // 标记为非首次加载
          });
          
          // 备份新的权限数据
          backupPermissions(userData);
          
          console.log('✅ 成功从远程 API 获取权限数据');
          
          // 权限变化通知 - 只在真正检测到权限变化且已初始化且非首次加载时触发
          const { isInitialized } = get();
          if (permissionsChanged && isInitialized && !isFirstLoad && typeof window !== 'undefined') {
            // 显示通知
            const event = new CustomEvent('permissionChanged', {
              detail: { 
                message: '检测到权限变化，页面即将更新',
                forceRefresh: false
              }
            });
            window.dispatchEvent(event);
          }
          
          // 标记为已初始化
          if (!isInitialized) {
            set({ isInitialized: true });
          }
        } catch (error) {
          console.error('❌ 从远程 API 获取权限数据失败:', error);
          
          if (error instanceof Error && error.name === 'AbortError') {
            console.warn('权限请求超时');
            set({ error: '请求超时，请检查网络连接' });
          } else {
            const errorMessage = error instanceof Error ? error.message : '获取用户信息失败';
            set({ error: errorMessage });
          }
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'permission-store',
      partialize: (state) => ({
        user: state.user,
        lastFetched: state.lastFetched,
        isInitialized: state.isInitialized,
        isFirstLoad: state.isFirstLoad
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