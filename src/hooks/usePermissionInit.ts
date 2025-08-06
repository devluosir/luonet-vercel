import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';

/**
 * 权限初始化Hook
 * 统一管理权限初始化逻辑，避免重复代码
 * ✅ 新增：登录时自动初始化用户信息
 */
export const usePermissionInit = () => {
  const { data: session, status } = useSession();
  const { initializeUserFromStorage, fetchPermissions, clearExpiredCache, setUserFromSession } = usePermissionStore();
  
  useEffect(() => {
    // 清理过期缓存
    clearExpiredCache();
    
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
    
    // 如果都没有成功初始化，则获取权限（仅在需要时）
    if (status === 'authenticated' && !session?.user) {
      fetchPermissions(false); // 非强制刷新
    }
  }, [session, status]); // ✅ 监听session状态变化
  
  // ✅ 新增：session变化时的处理
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // 每次session更新时，同步更新用户信息
      setUserFromSession(session.user);
    }
  }, [session, status]);
};

// 导入日志函数
import { logPermission } from '@/utils/permissionLogger'; 