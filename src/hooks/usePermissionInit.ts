import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';
import { logPermission, logPermissionError } from '@/utils/permissionLogger';

// ✅ 新增：全局初始化状态管理
let globalInitCompleted = false;
let globalInitInProgress = false;

export function usePermissionInit() {
  const { data: session, status } = useSession();
  const { setUserFromSession, initializeUserFromStorage, clearUser } = usePermissionStore();
  const initRef = useRef(false);
  const mountedRef = useRef(false);
  const lastSessionHash = useRef(''); // ✅ 新增：记录上次Session的哈希值

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // ✅ 优化：避免重复初始化
    if (initRef.current || globalInitInProgress) {
      return;
    }

    // ✅ 优化：如果已经全局初始化完成，且session中有权限数据，直接使用
    if (globalInitCompleted && session?.user?.permissions?.length > 0) {
      logPermission('使用已初始化的权限数据', {
        permissionsCount: session.user.permissions.length
      });
      return;
    }

    const initializePermissions = async () => {
      if (globalInitInProgress) {
        logPermission('权限初始化已在进行中，跳过重复初始化');
        return;
      }

      globalInitInProgress = true;
      initRef.current = true;

      try {
        // 1. 首先尝试从session初始化
        if (session?.user) {
          logPermission('检测到用户登录，从Session初始化用户信息', {
            userId: session.user.id,
            username: session.user.username,
            isAdmin: session.user.isAdmin
          });

          const sessionPermissions = session.user.permissions || [];
          const store = usePermissionStore.getState();
          
          // ✅ 优化：检查Session是否真正发生变化
          const currentSessionHash = JSON.stringify({
            id: session.user.id,
            username: session.user.username,
            permissions: sessionPermissions
          });
          
          if (lastSessionHash.current === currentSessionHash) {
            logPermission('Session未发生变化，跳过重复初始化');
            globalInitCompleted = true;
            return;
          }
          
          lastSessionHash.current = currentSessionHash;
          
          // ✅ 优化：检查是否需要强制更新
          const needsUpdate = !store.user || 
            store.user.id !== session.user.id ||
            JSON.stringify(store.user.permissions) !== JSON.stringify(sessionPermissions);

          if (needsUpdate) {
            logPermission('检测到权限数据不一致，强制更新', {
              sessionPermissionsCount: sessionPermissions.length,
              storePermissionsCount: store.user?.permissions?.length || 0,
              userId: session.user.id
            });

            // ✅ 优化：如果session中没有权限数据，尝试从缓存恢复
            if (sessionPermissions.length === 0 && typeof window !== 'undefined') {
              try {
                const userCache = localStorage.getItem('userCache');
                if (userCache) {
                  const cacheData = JSON.parse(userCache);
                  const isRecent = cacheData.timestamp && (Date.now() - cacheData.timestamp) < 24 * 60 * 60 * 1000;
                  
                  if (isRecent && cacheData.permissions && Array.isArray(cacheData.permissions)) {
                    // 使用缓存数据更新session用户信息
                    const updatedUser = {
                      ...session.user,
                      permissions: cacheData.permissions
                    };
                    
                    logPermission('Session无权限数据，从缓存恢复权限', {
                      permissionsCount: cacheData.permissions.length
                    });
                    
                    setUserFromSession(updatedUser);
                    globalInitCompleted = true;
                    return;
                  }
                }
              } catch (error) {
                logPermissionError('从缓存恢复权限失败', error);
              }
            }

            setUserFromSession(session.user);
          }
        } else if (status === 'unauthenticated') {
          // 2. 用户未登录，清除权限数据
          logPermission('用户未登录，清除权限数据');
          clearUser();
          globalInitCompleted = false;
        } else if (status === 'loading') {
          // 3. 正在加载，尝试从缓存初始化
          logPermission('Session加载中，尝试从缓存初始化');
          initializeUserFromStorage();
        }

        globalInitCompleted = true;
      } catch (error) {
        logPermissionError('权限初始化失败', error);
        globalInitCompleted = false;
      } finally {
        globalInitInProgress = false;
      }
    };

    initializePermissions();
  }, [session, status, setUserFromSession, initializeUserFromStorage, clearUser]);

  // ✅ 优化：移除Session权限变化监听器，避免循环更新
  // 原来的Session权限变化监听器会导致循环更新
  // 现在只在初始化时处理权限同步

  // ✅ 新增：重置全局初始化状态的方法
  const resetInitState = () => {
    globalInitCompleted = false;
    globalInitInProgress = false;
    initRef.current = false;
    lastSessionHash.current = '';
  };

  return { resetInitState };
}

 