'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/Toast';
import { usePermissionRefresh } from '@/hooks/usePermissionRefresh';
import { CrossTabCoordinator } from '@/utils/crossTabCoordinator';

export const PERMISSION_POLL_INTERVAL_MS = 3 * 60_000;
const MIN_PERMISSION_PROBE_INTERVAL_MS = 30_000;
const LAST_KNOWN_UPDATED_AT_KEY = 'permissions_last_known_updated_at';
const LAST_KNOWN_USERNAME_KEY = 'permissions_last_known_username';
const LAST_PROBE_AT_PREFIX = 'permissions_last_probe_at';

interface PermissionsMetaResponse {
  updatedAt?: string | null;
}

interface PendingBaseline {
  previous: string | null;
  next: string;
}

interface PermissionBroadcast {
  type: 'permissions-refreshed';
  username: string;
  updatedAt: string;
}

function isPageEligible(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus();
}

export function usePermissionChangeWatcher() {
  const { data: session, status } = useSession();
  const { refresh, isRefreshing, refreshSuccess, refreshError } = usePermissionRefresh();
  const { showToast } = useToast();
  const requestInFlightRef = useRef(false);
  const isRefreshingRef = useRef(isRefreshing);
  const pendingBaselineRef = useRef<PendingBaseline | null>(null);
  const coordinatorRef = useRef<CrossTabCoordinator<PermissionBroadcast> | null>(null);
  const throttledRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const username = session?.user?.username || session?.user?.name || '';
  isRefreshingRef.current = isRefreshing;

  const checkForChanges = useCallback(async () => {
    const coordinator = coordinatorRef.current;
    if (
      status !== 'authenticated'
      || !username
      || !isPageEligible()
      || !coordinator?.isLeader()
      || isRefreshingRef.current
      || requestInFlightRef.current
    ) {
      return;
    }

    const now = Date.now();
    const probeKey = `${LAST_PROBE_AT_PREFIX}:${username.toLowerCase()}`;
    const lastProbeAt = Number(localStorage.getItem(probeKey) || 0);
    if (lastProbeAt > 0 && now - lastProbeAt < MIN_PERMISSION_PROBE_INTERVAL_MS) {
      const remaining = MIN_PERMISSION_PROBE_INTERVAL_MS - (now - lastProbeAt);
      if (throttledRetryRef.current === null) {
        throttledRetryRef.current = setTimeout(() => {
          throttledRetryRef.current = null;
          void checkForChanges();
        }, remaining);
      }
      return;
    }
    localStorage.setItem(probeKey, String(now));

    requestInFlightRef.current = true;
    try {
      const response = await fetch('/api/auth/permissions-meta', {
        method: 'GET',
        cache: 'no-store',
      });
      if (!isPageEligible() || !coordinator.isLeader()) return;
      if (!response.ok) return;

      const data = await response.json() as PermissionsMetaResponse;
      if (!isPageEligible() || !coordinator.isLeader()) return;
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

      pendingBaselineRef.current = { previous: lastKnownUpdatedAt, next: updatedAt };
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
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (throttledRetryRef.current !== null) {
        clearTimeout(throttledRetryRef.current);
        throttledRetryRef.current = null;
      }
    };

    const startPolling = () => {
      if (!isPageEligible() || intervalId !== null) return;
      void checkForChanges();
      intervalId = setInterval(() => {
        void checkForChanges();
      }, PERMISSION_POLL_INTERVAL_MS);
    };

    const coordinator = new CrossTabCoordinator<PermissionBroadcast>({
      scope: `permission-watch:${username.toLowerCase()}`,
      onLeadershipChange: (isLeader) => {
        if (isLeader) startPolling();
        else stopPolling();
      },
      onMessage: (message) => {
        if (message.type !== 'permissions-refreshed' || message.username !== username) return;
        localStorage.setItem(LAST_KNOWN_USERNAME_KEY, username);
        localStorage.setItem(LAST_KNOWN_UPDATED_AT_KEY, message.updatedAt);
        showToast('权限已更新，页面即将重载...', 'success');
        reloadTimer = setTimeout(() => window.location.reload(), 800);
      },
    });
    coordinatorRef.current = coordinator;

    const updateEligibility = () => {
      const nextEligible = isPageEligible();
      coordinator.setEligible(nextEligible);
      if (!nextEligible) stopPolling();
    };

    document.addEventListener('visibilitychange', updateEligibility);
    window.addEventListener('focus', updateEligibility);
    window.addEventListener('blur', updateEligibility);
    updateEligibility();

    return () => {
      stopPolling();
      if (reloadTimer !== null) clearTimeout(reloadTimer);
      document.removeEventListener('visibilitychange', updateEligibility);
      window.removeEventListener('focus', updateEligibility);
      window.removeEventListener('blur', updateEligibility);
      coordinator.dispose();
      if (coordinatorRef.current === coordinator) coordinatorRef.current = null;
    };
  }, [checkForChanges, showToast, status, username]);

  useEffect(() => {
    const pendingBaseline = pendingBaselineRef.current;
    if (!refreshSuccess || !pendingBaseline) return;

    coordinatorRef.current?.publish({
      type: 'permissions-refreshed',
      username,
      updatedAt: pendingBaseline.next,
    });
    pendingBaselineRef.current = null;
    showToast('权限刷新成功，页面即将重载...', 'success');
  }, [refreshSuccess, showToast, username]);

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
