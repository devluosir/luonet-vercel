import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';
import { logPermission } from '@/utils/permissionLogger';

// 模块级：防止并发初始化
let globalInitInProgress = false;

export const usePermissionInit = () => {
  const { data: session, status } = useSession();
  const { setUserFromSession, initializeUserFromStorage, clearUser } = usePermissionStore();

  // storage init 独立 ref：只防止 loading 阶段重复调用 initializeUserFromStorage
  const storageInitDone = useRef(false);
  // session hash ref：防止对同一 session 数据重复调用 setUserFromSession
  const lastSessionHash = useRef('');

  useEffect(() => {
    const run = async () => {
      // 正在初始化时跳过（防并发）
      if (globalInitInProgress) return;

      if (status === 'loading') {
        // loading 阶段：只尝试一次从缓存恢复
        if (!storageInitDone.current) {
          storageInitDone.current = true;
          try {
            const initialized = initializeUserFromStorage();
            if (initialized && process.env.NODE_ENV === 'development') {
              logPermission('loading 阶段：从本地缓存初始化权限成功');
            }
          } catch (err) {
            console.error('从缓存初始化失败:', err);
          }
        }
        return;
      }

      if (status === 'unauthenticated') {
        clearUser();
        return;
      }

      // authenticated 阶段：从真实 session 初始化（不受 storageInitDone 影响）
      if (!session?.user) return;

      const currentHash = JSON.stringify({
        id: session.user.id,
        username: session.user.username,
        isAdmin: session.user.isAdmin,
        permissions: session.user.permissions ?? [],
      });

      // 同一 session 内容不重复处理
      if (lastSessionHash.current === currentHash) return;

      globalInitInProgress = true;
      try {
        lastSessionHash.current = currentHash;
        setUserFromSession(session.user);
        if (process.env.NODE_ENV === 'development') {
          logPermission('authenticated 阶段：从 session 初始化权限完成');
        }
      } catch (err) {
        console.error('session 权限初始化失败:', err);
      } finally {
        globalInitInProgress = false;
      }
    };

    run();
  }, [session, status, setUserFromSession, initializeUserFromStorage, clearUser]);
};
