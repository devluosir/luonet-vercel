'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/Toast';
import { usePermissionRefresh } from '@/hooks/usePermissionRefresh';

const POLL_INTERVAL_MS = 90_000;
const LAST_KNOWN_UPDATED_AT_KEY = 'permissions_last_known_updated_at';
const LAST_KNOWN_USERNAME_KEY = 'permissions_last_known_username';

interface PermissionsMetaResponse {
  updatedAt?: string | null;
}

interface PendingBaseline {
  previous: string | null;
}

export function usePermissionChangeWatcher() {
  const { data: session, status } = useSession();
  const { refresh, isRefreshing, refreshSuccess, refreshError } = usePermissionRefresh();
  const { showToast } = useToast();
  const requestInFlightRef = useRef(false);
  const isRefreshingRef = useRef(isRefreshing);
  const pendingBaselineRef = useRef<PendingBaseline | null>(null);

  const username = session?.user?.username || session?.user?.name || '';
  isRefreshingRef.current = isRefreshing;

  const checkForChanges = useCallback(async () => {
    if (
      status !== 'authenticated'
      || !username
      || document.visibilityState !== 'visible'
      || isRefreshingRef.current
      || requestInFlightRef.current
    ) {
      return;
    }

    requestInFlightRef.current = true;
    try {
      const response = await fetch('/api/auth/permissions-meta', {
        method: 'GET',
        cache: 'no-store',
      });
      if (!response.ok) return;

      const data = await response.json() as PermissionsMetaResponse;
      const updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : null;
      if (!updatedAt) return;

      const lastKnownUpdatedAt = localStorage.getItem(LAST_KNOWN_UPDATED_AT_KEY);
      const lastKnownUsername = localStorage.getItem(LAST_KNOWN_USERNAME_KEY);
      if (!lastKnownUpdatedAt || lastKnownUsername !== username) {
        localStorage.setItem(LAST_KNOWN_USERNAME_KEY, username);
        localStorage.setItem(LAST_KNOWN_UPDATED_AT_KEY, updatedAt);
        return;
      }

      if (lastKnownUpdatedAt === updatedAt) return;

      pendingBaselineRef.current = {
        previous: lastKnownUpdatedAt,
      };
      localStorage.setItem(LAST_KNOWN_UPDATED_AT_KEY, updatedAt);
      await refresh(username);
    } catch (error) {
      console.error('自动检测权限变更失败:', error);
    } finally {
      requestInFlightRef.current = false;
    }
  }, [refresh, status, username]);

  useEffect(() => {
    if (status !== 'authenticated' || !username) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const startPolling = () => {
      if (document.visibilityState !== 'visible' || intervalId !== null) return;
      void checkForChanges();
      intervalId = setInterval(() => {
        void checkForChanges();
      }, POLL_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForChanges, status, username]);

  useEffect(() => {
    if (!refreshSuccess || !pendingBaselineRef.current) return;

    pendingBaselineRef.current = null;
    showToast('权限刷新成功，页面即将重载...', 'success');
  }, [refreshSuccess, showToast]);

  useEffect(() => {
    const pendingBaseline = pendingBaselineRef.current;
    if (!refreshError || !pendingBaseline) return;

    if (pendingBaseline.previous) {
      localStorage.setItem(LAST_KNOWN_UPDATED_AT_KEY, pendingBaseline.previous);
    } else {
      localStorage.removeItem(LAST_KNOWN_UPDATED_AT_KEY);
    }
    pendingBaselineRef.current = null;
    showToast(refreshError, 'error');
  }, [refreshError, showToast]);
}
