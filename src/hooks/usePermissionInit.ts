import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';
import { logPermission } from '@/utils/permissionLogger';

/**
 * 权限初始化Hook
 * 统一管理权限初始化逻辑，避免重复代码
 * ✅ 新增：登录时自动初始化用户信息
 */
export const usePermissionInit = () => {
  const { data: session, status } = useSession();
  const { initializeUserFromStorage, fetchPermissions, clearExpiredCache, setUserFromSession } = usePermissionStore();
  
  useEffect(() => {
    // 清理过期缓存（只在组件挂载时执行一次）
    clearExpiredCache();
  }, [clearExpiredCache]);

  // 分离session初始化逻辑，避免重复调用
  useEffect(() => {
    // 如果session已加载且有用户信息，优先从session初始化
    if (status === 'authenticated' && session?.user) {
      logPermission('检测到用户登录，从Session初始化用户信息', {
        userId: session.user.id,
        username: session.user.username,
        isAdmin: session.user.isAdmin
      });
      
      // ✅ 登录时立即初始化用户信息
      setUserFromSession(session.user);
      return;
    }
    
    // 如果session未加载，尝试从本地存储初始化
    if (status === 'loading') {
      const initialized = initializeUserFromStorage();
      if (initialized) {
        logPermission('从本地缓存初始化用户信息成功');
        return;
      }
    }
    
    // 如果session加载完成但没有用户信息，尝试从本地存储初始化
    if (status === 'unauthenticated') {
      const initialized = initializeUserFromStorage();
      if (initialized) {
        logPermission('从本地缓存初始化用户信息成功');
        return;
      }
    }
    
    // ✅ 修复：如果session中有权限数据但Store中没有，强制同步
    if (status === 'authenticated' && session?.user?.permissions && session.user.permissions.length > 0) {
      // 检查Store中是否有权限数据
      const { user } = usePermissionStore.getState();
      if (!user || !user.permissions || user.permissions.length === 0) {
        logPermission('检测到Session有权限数据但Store中没有，强制同步', {
          sessionPermissionsCount: session.user.permissions.length,
          storePermissionsCount: user?.permissions?.length || 0
        });
        setUserFromSession(session.user);
        return;
      }
    }
    
    // 如果都没有成功初始化，则获取权限（仅在需要时）
    if (status === 'authenticated' && !session?.user) {
      fetchPermissions(false); // 非强制刷新
    }
  }, [session?.user?.id, status, session?.user?.permissions]); // ✅ 添加permissions依赖，确保权限变化时重新初始化
};

 