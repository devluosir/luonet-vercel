'use client';

import { useEffect, useRef, useState } from 'react';
import { inquiryService } from '../services/inquiry.service';
import {
  InquirySyncCoordinator,
  type InquirySyncBroadcast,
  type InquirySyncViewGroup,
} from '../services/inquirySyncCoordinator';
import { useInquiryStore } from '../state/inquiry.store';
import type { InquirySyncStatus } from '../services/inquiry.service';

export const ACTIVE_POLL_INTERVAL_MS = 2 * 60_000;
export const IDLE_POLL_INTERVAL_MS = 10 * 60_000;
export const IDLE_AFTER_MS = 5 * 60_000;
export const MIN_PROBE_INTERVAL_MS = 30_000;
export const FORCE_FULL_SYNC_EVERY_MS = 6 * 60 * 60_000;
export const ACTIVITY_THROTTLE_MS = 1_000;
const SUSPENDED_RETRY_MS = 30_000;
const META_FAILURE_BACKOFF_MS = [60_000, 2 * 60_000, 5 * 60_000, 10 * 60_000] as const;

interface UseInquirySyncOptions {
  enabled: boolean;
  userKey?: string;
  suspended?: boolean;
  pushLocal?: boolean;
  mergeLocal?: boolean;
}

type SyncCycleResult = 'success' | 'meta-failed';

function getMetaKey(meta: { count: number; maxUpdatedAt: string | null }): string {
  return `${meta.count}:${meta.maxUpdatedAt ?? ''}`;
}

function isPageEligible(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus();
}

export function useInquirySync({
  enabled,
  userKey = 'unknown',
  suspended = false,
  pushLocal = true,
  mergeLocal = true,
}: UseInquirySyncOptions) {
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<InquirySyncStatus>(() =>
    inquiryService.getSyncStatus()
  );
  const suspendedRef = useRef(suspended);
  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    suspendedRef.current = suspended;
    if (!suspended) wakeRef.current?.();
  }, [suspended]);

  useEffect(() => {
    const refresh = () => setSyncStatus(inquiryService.getSyncStatus());
    refresh();
    return inquiryService.subscribeSyncStatus(refresh);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let eligible = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let metaFailureIndex = 0;
    let lastActivityAt = Date.now();
    let lastActivityHandledAt = 0;
    const lastMetaRef = { current: null as string | null };
    const syncingRef = { current: false };
    const viewGroup: InquirySyncViewGroup = mergeLocal ? 'full' : 'restricted';

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const getNormalDelay = () =>
      Date.now() - lastActivityAt < IDLE_AFTER_MS
        ? ACTIVE_POLL_INTERVAL_MS
        : IDLE_POLL_INTERVAL_MS;

    const applyMeta = (meta: { count: number; maxUpdatedAt: string | null }) => {
      lastMetaRef.current = getMetaKey(meta);
      if (meta.maxUpdatedAt) {
        inquiryService.setSyncWatermark(mergeLocal, meta.maxUpdatedAt);
      }
    };

    const publishSync = (
      coordinator: InquirySyncCoordinator,
      metaKey: string | null,
      syncedAt: number
    ) => {
      coordinator.publish({
        type: 'sync-complete',
        metaKey,
        watermark: inquiryService.getSyncWatermark(mergeLocal),
        syncedAt,
      });
    };

    let coordinator: InquirySyncCoordinator;

    const shouldAbortCycle = () =>
      cancelled || suspendedRef.current || !eligible || !coordinator.isLeader();

    const schedule = (delay: number) => {
      clearTimer();
      if (cancelled || !eligible || !coordinator.isLeader()) return;
      timer = setTimeout(() => {
        timer = null;
        void runCycle();
      }, Math.max(0, delay));
    };

    const fullSync = async (): Promise<SyncCycleResult> => {
      if (syncingRef.current || shouldAbortCycle()) return 'success';
      syncingRef.current = true;

      try {
        await inquiryService.flushPendingSyncs();
        if (shouldAbortCycle()) return 'success';
        const d1Records = await inquiryService.pullFromD1();
        if (shouldAbortCycle()) return 'success';
        if (pushLocal) inquiryService.pushLocalToD1(d1Records);
        const nextRecords = mergeLocal
          ? inquiryService.mergeFromD1(d1Records)
          : inquiryService.mergeFieldsOnly(d1Records);
        if (!mergeLocal) inquiryService.save(nextRecords);
        useInquiryStore.setState({ records: nextRecords });

        const fullSyncAt = Date.now();
        inquiryService.setLastFullSyncAt(mergeLocal, fullSyncAt);

        const meta = await inquiryService.getMeta();
        if (shouldAbortCycle()) return 'success';
        const metaFailed = meta.count < 0;
        if (!cancelled && !metaFailed) applyMeta(meta);

        if (!cancelled) {
          const syncedAt = Date.now();
          setLastSyncedAt(new Date(syncedAt));
          setSyncStatus(inquiryService.getSyncStatus());
          publishSync(coordinator, lastMetaRef.current, syncedAt);
        }
        return metaFailed ? 'meta-failed' : 'success';
      } catch (error) {
        console.warn('[inquirySync] 整表同步失败，将按退避策略重试', error);
        return 'meta-failed';
      } finally {
        syncingRef.current = false;
      }
    };

    const incrementalSync = async (
      meta: { count: number; maxUpdatedAt: string | null }
    ): Promise<SyncCycleResult> => {
      if (syncingRef.current || shouldAbortCycle()) return 'success';
      syncingRef.current = true;

      try {
        await inquiryService.flushPendingSyncs();
        if (shouldAbortCycle()) return 'success';

        const watermark = inquiryService.getSyncWatermark(mergeLocal) ?? undefined;
        // An empty D1 table has no watermark and needs no data request.
        const d1Records = meta.count === 0 && !watermark
          ? []
          : await inquiryService.pullFromD1(watermark);
        if (shouldAbortCycle()) return 'success';

        const nextRecords = mergeLocal
          ? inquiryService.mergeFromD1(d1Records)
          : inquiryService.mergeFieldsOnly(d1Records);
        if (!mergeLocal) inquiryService.save(nextRecords);
        useInquiryStore.setState({ records: nextRecords });
        applyMeta(meta);

        const syncedAt = Date.now();
        setLastSyncedAt(new Date(syncedAt));
        setSyncStatus(inquiryService.getSyncStatus());
        publishSync(coordinator, lastMetaRef.current, syncedAt);
        return 'success';
      } catch (error) {
        console.warn('[inquirySync] 增量同步失败，将按退避策略重试', error);
        return 'meta-failed';
      } finally {
        syncingRef.current = false;
      }
    };

    const checkAndMaybeSync = async (): Promise<SyncCycleResult> => {
      if (syncingRef.current || shouldAbortCycle()) return 'success';
      const meta = await inquiryService.getMeta();
      if (shouldAbortCycle()) return 'success';
      if (meta.count < 0) return 'meta-failed';

      const metaKey = getMetaKey(meta);
      if (metaKey !== lastMetaRef.current) {
        return incrementalSync(meta);
      }

      const syncedAt = Date.now();
      setLastSyncedAt(new Date(syncedAt));
      setSyncStatus(inquiryService.getSyncStatus());
      return 'success';
    };

    async function runCycle() {
      if (cancelled || !eligible || !coordinator.isLeader()) return;
      if (suspendedRef.current || syncingRef.current) {
        schedule(SUSPENDED_RETRY_MS);
        return;
      }

      const now = Date.now();
      if (!coordinator.claimProbe(now, MIN_PROBE_INTERVAL_MS)) {
        schedule(Math.max(1_000, coordinator.getRemainingProbeThrottle(now, MIN_PROBE_INTERVAL_MS)));
        return;
      }

      const lastFullSyncAt = inquiryService.getLastFullSyncAt(mergeLocal);
      const needsFullSync = lastFullSyncAt <= 0 || now - lastFullSyncAt > FORCE_FULL_SYNC_EVERY_MS;
      const result = needsFullSync ? await fullSync() : await checkAndMaybeSync();
      if (cancelled || !eligible || !coordinator.isLeader()) return;

      if (result === 'meta-failed') {
        const delay = META_FAILURE_BACKOFF_MS[
          Math.min(metaFailureIndex, META_FAILURE_BACKOFF_MS.length - 1)
        ];
        metaFailureIndex += 1;
        schedule(delay);
      } else {
        metaFailureIndex = 0;
        schedule(getNormalDelay());
      }
    }

    const handleSyncBroadcast = (message: InquirySyncBroadcast) => {
      if (message.type !== 'sync-complete') return;
      lastMetaRef.current = message.metaKey;
      useInquiryStore.setState({ records: inquiryService.getAll() });
      setLastSyncedAt(new Date(message.syncedAt));
      setSyncStatus(inquiryService.getSyncStatus());
    };

    coordinator = new InquirySyncCoordinator({
      userKey,
      viewGroup,
      onLeadershipChange: (isLeader) => {
        if (isLeader) schedule(0);
        else clearTimer();
      },
      onSyncComplete: handleSyncBroadcast,
    });

    const wake = () => {
      if (!cancelled && eligible && coordinator.isLeader()) schedule(0);
    };
    wakeRef.current = wake;

    const updateEligibility = () => {
      eligible = isPageEligible();
      coordinator.setEligible(eligible);
      if (!eligible) clearTimer();
    };

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityHandledAt < ACTIVITY_THROTTLE_MS) return;
      const wasIdle = now - lastActivityAt >= IDLE_AFTER_MS;
      lastActivityHandledAt = now;
      lastActivityAt = now;
      if (wasIdle) wake();
    };

    document.addEventListener('visibilitychange', updateEligibility);
    window.addEventListener('focus', updateEligibility);
    window.addEventListener('blur', updateEligibility);
    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    updateEligibility();

    return () => {
      cancelled = true;
      wakeRef.current = null;
      clearTimer();
      document.removeEventListener('visibilitychange', updateEligibility);
      window.removeEventListener('focus', updateEligibility);
      window.removeEventListener('blur', updateEligibility);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      coordinator.dispose();
    };
  }, [enabled, mergeLocal, pushLocal, userKey]);

  return { lastSyncedAt, syncStatus };
}

interface SyncInquiryNowOptions {
  mergeLocal: boolean;
  pushLocal: boolean;
}

/** 首页等非轮询页面使用的一次性立即同步，不参与跨标签页协调和后台调度。 */
export async function syncInquiryNow({
  mergeLocal,
  pushLocal,
}: SyncInquiryNowOptions): Promise<void> {
  await inquiryService.flushPendingSyncs();
  const d1Records = await inquiryService.pullFromD1();
  if (pushLocal) inquiryService.pushLocalToD1(d1Records);

  const nextRecords = mergeLocal
    ? inquiryService.mergeFromD1(d1Records)
    : inquiryService.mergeFieldsOnly(d1Records);
  if (!mergeLocal) inquiryService.save(nextRecords);

  useInquiryStore.setState({ records: nextRecords });
  inquiryService.setLastFullSyncAt(mergeLocal, Date.now());
}
