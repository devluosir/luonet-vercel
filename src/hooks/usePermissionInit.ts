import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';
import { logPermission } from '@/utils/permissionLogger';

// ✅ 全局初始化状态管理（防止重复初始化）
let globalInitCompleted = false;
let globalInitInProgress = false;

export const usePermissionInit = () => {
  const { data: session, status } = useSession();
  const { setUserFromSession, initializeUserFromStorage, clearUser } = usePermissionStore();
  const lastSessionHash = useRef('');

  // ✅ 新增：重置全局初始化状态（用于测试和调试）
  const resetInitState = () => {
    globalInitCompleted = false;
    globalInitInProgress = false;
    lastSessionHash.current = '';
    console.log('权限初始化状态已重置');
  };

  // ✅ 优化：智能权限初始化逻辑
  const initializePermissions = async () => {
    // 防重复：如果正在初始化或已完成，跳过
    if (globalInitInProgress) {
      logPermission('权限初始化正在进行中，跳过重复调用');
      return;
    }

    if (globalInitCompleted) {
      logPermission('权限初始化已完成，跳过重复调用');
      return;
    }

    // 防重复：如果Session未加载完成，跳过
    if (status === 'loading') {
      logPermission('Session正在加载中，尝试从缓存初始化');
      try {
        const initialized = initializeUserFromStorage();
        if (initialized) {
          logPermission('从本地缓存初始化用户信息成功');
        }
      } catch (error) {
        console.error('从缓存初始化失败:', error);
      }
      return;
    }

    // 防重复：如果未登录，清理用户数据
    if (status === 'unauthenticated') {
      logPermission('用户未登录，清理用户数据');
      clearUser();
      globalInitCompleted = true;
      return;
    }

    // 防重复：如果Session为空，跳过
    if (!session?.user) {
      logPermission('Session为空，跳过初始化');
      return;
    }

    // ✅ 优化：Session哈希检测，避免重复处理相同的Session
    const currentSessionHash = JSON.stringify({
      id: session.user.id,
      username: session.user.username,
      permissions: session.user.permissions || []
    });

    if (lastSessionHash.current === currentSessionHash) {
      logPermission('Session未发生变化，跳过重复初始化');
      return;
    }

    // 标记正在初始化
    globalInitInProgress = true;
    logPermission('开始权限初始化流程');

    try {
      // 更新Session哈希
      lastSessionHash.current = currentSessionHash;

      // 从Session初始化用户信息
      setUserFromSession(session.user);

      // 标记初始化完成
      globalInitCompleted = true;
      globalInitInProgress = false;
      
      logPermission('权限初始化完成');
    } catch (error) {
      console.error('权限初始化失败:', error);
      globalInitInProgress = false;
    }
  };

  useEffect(() => {
    initializePermissions();
  }, [session, status]);

  return { resetInitState };
};

 