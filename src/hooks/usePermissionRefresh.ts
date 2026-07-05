'use client';

import { useState, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';
import { logPermission, logPermissionError } from '@/utils/permissionLogger';

interface RefreshedPermission {
  moduleId: string;
  canAccess: boolean;
}

interface ForceRefreshResponse {
  success?: boolean;
  error?: string;
  tokenNeedsRefresh?: boolean;
  permissions?: RefreshedPermission[];
  user?: {
    username: string;
    email?: string | null;
    isAdmin?: boolean;
  };
}

export function usePermissionRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const refresh = useCallback(async (username: string) => {
    setIsRefreshing(true);
    setRefreshError(null);
    setRefreshSuccess(false);

    try {
      logPermission('开始权限刷新流程', { username });

      // 🔄 1. 调用强制刷新 API
      const res = await fetch('/api/auth/force-refresh-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await res.json() as ForceRefreshResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.error || '权限刷新失败');
      }

      logPermission('权限刷新API响应', {
        success: data.success,
        tokenNeedsRefresh: data.tokenNeedsRefresh,
        permissionsCount: data.permissions?.length || 0
      });

      // 🧹 2. 清除本地缓存（Zustand + localStorage）
      usePermissionStore.getState().clearUser();

      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('userCache');
          localStorage.removeItem('user_permissions');
          localStorage.removeItem('latestPermissions');
          localStorage.removeItem('permissionsTimestamp');
        } catch (error) {
          console.error('清理缓存失败:', error);
        }
      }

      // ✅ 新增：保存新的权限数据到缓存
      if (data.permissions && data.user) {
        try {
          const cacheData = {
            ...data.user,
            permissions: data.permissions,
            timestamp: Date.now()
          };
          localStorage.setItem('userCache', JSON.stringify(cacheData));

          // 同时保存用户信息到userInfo，确保其他组件能正确获取
          const userInfo = {
            username: data.user.username,
            email: data.user.email,
            isAdmin: data.user.isAdmin
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
          localStorage.setItem('username', data.user.username);
        } catch (error) {
          console.error('保存权限数据到缓存失败:', error);
        }
      }

      // 🔐 3. 如果权限有变化，使用 silent-refresh 登录，刷新 cookie + token
      if (data.tokenNeedsRefresh) {
        logPermission('权限已变化，执行silent-refresh');

        const result = await signIn('credentials', {
          redirect: false,
          username,
          password: 'silent-refresh',
        });

        if (result?.error) {
          throw new Error(result.error);
        }

        logPermission('silent-refresh成功');
      } else {
        logPermission('权限无变化，跳过silent-refresh');
      }

      // ✅ 4. 刷新成功，重载页面应用权限
      setRefreshSuccess(true);
      logPermission('权限刷新完成，准备重载页面');

      setTimeout(() => {
        window.location.reload();
      }, 800);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setRefreshError(errorMessage);
      logPermissionError('权限刷新失败', err, { username });
      console.error('[权限刷新失败]', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    isRefreshing,
    refreshError,
    refreshSuccess,
    refresh,
  };
}
