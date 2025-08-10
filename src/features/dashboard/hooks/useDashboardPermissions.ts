import { useMemo, useEffect } from 'react';
import { usePermissionStore } from '@/lib/permissions';
import { buildPermissionMap } from '@/utils/mapPermissions';
import { preloadManager } from '@/utils/preloadUtils';

import type { PermissionMap } from '../types';

export const useDashboardPermissions = (session: any) => {
  // 使用全局权限store
  const { user, isLoading: _permissionLoading } = usePermissionStore();
  
  // 优化的权限映射 - 使用新的工具函数
  const permissionMap = useMemo(() => {
    // 获取本地缓存的权限数据
    let cachedPermissions = [];
    if (typeof window !== 'undefined') {
      try {
        const userCache = localStorage.getItem('userCache');
        if (userCache) {
          const cacheData = JSON.parse(userCache);
          const isRecent = cacheData.timestamp && (Date.now() - cacheData.timestamp) < 24 * 60 * 60 * 1000;
          
          if (isRecent) {
            cachedPermissions = cacheData.permissions || [];
          }
        }
      } catch (error) {
        console.error('恢复权限数据失败:', error);
      }
    }
    
    return buildPermissionMap(
      user?.permissions,
      session?.user?.permissions,
      cachedPermissions
    ) as PermissionMap;
  }, [user?.permissions, session?.user?.permissions]);

  // 监听权限Store变化
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let hasTriggeredPreload = false;
    let lastPermissionsHash = '';
    let lastCheckTime = 0;
    const debounceMs = 2000;
    
    const unsubscribe = usePermissionStore.subscribe((state) => {
      if (state.user && state.user.permissions && state.user.permissions.length > 0) {
        const now = Date.now();
        
        if (now - lastCheckTime < debounceMs) {
          return;
        }
        
        lastCheckTime = now;
        
        const currentPermissionsHash = JSON.stringify(
          state.user.permissions
            .filter((p: any) => p.canAccess)
            .map((p: any) => p.moduleId)
            .sort()
        );
        
        const permissionsChanged = lastPermissionsHash !== currentPermissionsHash;
        
        if (permissionsChanged) {
          // ✅ 优化：只在权限数据不为空时输出日志
          if (state.user.permissions && state.user.permissions.length > 0) {
            console.log('检测到权限变化，需要重新预加载', {
              oldHash: lastPermissionsHash,
              newHash: currentPermissionsHash,
              permissions: state.user.permissions.map((p: any) => ({ moduleId: p.moduleId, canAccess: p.canAccess }))
            });
          }
          
          lastPermissionsHash = currentPermissionsHash;
          
          if (!hasTriggeredPreload && preloadManager.shouldPreloadBasedOnPermissions()) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              preloadManager.delayedPreload().catch(error => {
                console.error('延迟预加载失败:', error);
              });
              hasTriggeredPreload = true;
            }, 3000);
          }
        }
      }
    });
    
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // 权限加载状态检查
  const isPermissionLoading = !user && session?.status === 'loading';

  return {
    permissionMap,
    user,
    isPermissionLoading
  };
};
